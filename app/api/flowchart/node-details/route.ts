import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import fs from 'fs';
import path from 'path';

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8000';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { nodeName, chapter_title: chapterTitle } = (await req.json().catch(() => ({}))) as {
    nodeName?: string;
    chapter_title?: string;
  };

  let context = '';

  // Grounded RAG: retrieve chunks for this node + chapter
  if (RAG_API_URL && (nodeName || chapterTitle)) {
    try {
      const res = await fetch(`${RAG_API_URL}/retrieve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: nodeName || chapterTitle || '',
          chapter_title: chapterTitle || undefined,
          n_results: 6,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const chunks = (data.chunks || []) as { text?: string }[];
        if (chunks.length > 0) {
          context = chunks.map((c) => c.text || '').join('\n\n---\n\n');
        }
      }
    } catch (_) {
      // fallback
    }
  }

  if (!context) {
    const demoPath = path.join(process.cwd(), 'public', 'isomer_demo_textbook.txt');
    const fullPath = path.join(process.cwd(), 'public', 'High_School_Mathematics_Extensions.txt');
    try {
      if (fs.existsSync(demoPath)) {
        context = fs.readFileSync(demoPath, 'utf-8').slice(0, 20000);
      } else {
        context = fs.readFileSync(fullPath, 'utf-8').slice(0, 20000);
      }
    } catch {
      context = 'Material not available.';
    }
  }

  const result = streamText({
    model: openai('gpt-4o-mini'),
    prompt: `
    Your task is to extract or summarize the section most relevant to this mind map node from the provided material only. Do not add information from outside the material.

    Node: ${nodeName || 'General'}
    ${chapterTitle ? `Chapter: ${chapterTitle}` : ''}

    Material (use only this):
    ${context.slice(0, 18000)}

    Requirements:
    - Extract or summarize knowledge from the material that supports this node. If the node label is not an exact heading in the material, summarize the closest related concepts from the material so the node has clear, helpful content.
    - Keep the response complete and self-contained (include formulas, key terms, and definitions as in the original). Use only the material above.
    - Do not say "the material does not cover this" or "I could not find"—always provide relevant content from the material that relates to the node.
    - Do not add commentary or extra information beyond the material.
    `,
  });

  return result.toTextStreamResponse();
}
