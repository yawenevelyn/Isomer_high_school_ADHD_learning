import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 60;

export async function POST(req: Request) {

  const { prompt }: { prompt: string } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    prompt: `First say whether the answer is correct, then very briefly explain the exercise in a friendly, natural, spoken style. Do not use bullet points, numbered lists, headings, tables, code blocks, or inline code. Keep it to one or two short sentences. User input: ${prompt}`,
  });

  return result.toTextStreamResponse();
}


