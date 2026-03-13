import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const checkingQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correctAnswerIndex: z.number(),
  explanation: z.string(),
});

export const maxDuration = 30;

export async function POST(req: Request) {
  const { nodeName, nodeDetails } = await req.json();

  const result = streamObject({
    model: openai('gpt-4o'),
    schema: checkingQuestionSchema,
    prompt: `
    You are generating one focused comprehension check about the node "${nodeName}".

    Context (reference only):
    ${nodeDetails}

    Requirements:
    - One clear question testing the core idea of this node.
    - Exactly 4 options, mutually exclusive and plausible.
    - Exactly 1 correct answer. Indicate its index (0–3).
    - A one-sentence explanation why the correct option is right (and if helpful, why a common distractor is wrong).

    Constraints:
    - Keep language simple and conversational.
    - No code blocks, tables, or headings.
    `,
  });
  return result.toTextStreamResponse();
}


