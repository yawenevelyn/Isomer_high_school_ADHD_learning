import { streamText, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8000';

export const maxDuration = 60;

export async function POST(request: Request) {
  const { messages, nodeName, nodeDetails, chapter_title: chapterTitle } = (await request.json()) as {
    messages?: unknown[];
    nodeName?: string;
    nodeDetails?: string;
    chapter_title?: string;
  };

  let context = nodeDetails || '';
  let useRagChunks = false;

  // Grounded RAG: retrieve chunks and stream answer from context only
  if (RAG_API_URL) {
    try {
      const lastUser = [...(messages || [])].reverse().find((m: { role?: string }) => m.role === 'user');
      const userQuery = (lastUser as { content?: string } | undefined)?.content?.toString?.() || '';
      // Combine user question and node name so retrieval finds the right chapter content (e.g. "arithmetic" + "Arithmetic of complex numbers")
      const retrievalQuery = [userQuery, nodeName].filter(Boolean).join(' ').slice(0, 1000);
      const res = await fetch(`${RAG_API_URL}/retrieve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: retrievalQuery,
          chapter_title: chapterTitle || undefined,
          n_results: 5,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        let chunks = (data.chunks || []) as { text?: string }[];
        // If no chunks but we have a chapter, get all chunks for that chapter (no semantic filter)
        if (chunks.length === 0 && chapterTitle) {
          const fallbackRes = await fetch(`${RAG_API_URL}/retrieve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: '',
              chapter_title: chapterTitle,
              n_results: 10,
            }),
          });
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            chunks = (fallbackData.chunks || []) as { text?: string }[];
          }
        }
        if (chunks.length > 0) {
          context = chunks.map((c) => c.text || '').join('\n\n---\n\n');
          useRagChunks = true;
        }
      }
    } catch (_) {
      // fall through
    }
  }

  const systemPrompt = useRagChunks
    ? `You are a tutor. Use ONLY the provided textbook context to answer. Paraphrase or quote from the context to explain. Only say "The textbook does not cover this" if the question is clearly about something not mentioned at all in the context. If the context is about the topic (e.g. complex numbers, arithmetic), use it to answer. Keep responses short and conversational. No bullet points or markdown.`
    : `You are a friendly learning companion. Use the provided context to answer. Only say "The textbook does not cover this" if the question is clearly not in the context. Node: ${nodeName || 'N/A'}. Keep responses short, conversational. No bullet points or markdown.`;

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: systemPrompt + (context ? `\n\nContext from textbook:\n${context.slice(0, 12000)}` : ''),
    messages: convertToModelMessages(messages || []),
    temperature: 0.5,
  });

  return result.toTextStreamResponse();
}
