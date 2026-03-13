import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import fs from 'fs';
import path from 'path';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { nodeName } = await req.json();

  let fullContent = "";
  try {
    const filePath = path.join(process.cwd(), 'public', 'High_School_Mathematics_Extensions.txt');
    fullContent = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    fullContent = "cannot read material";
  }

  const result = streamText({
    model: openai('gpt-4o-mini'),
    prompt: `
    Your task is to extract detailed relevant section from the full learning material based on the given one mind map node.

    The Node's Name: ${nodeName}
    Full Mathematical Material:
    ${fullContent.slice(0, 20000)}

    Requirements:
    - Faithfully extract only the knowledge relevant to this node.
    - Ensure that the extracted section is 100% complete (all relevant things from the material are included) and self-contained, including cide blocks, lists, and tables.
    - Do not include any other sections or content in the original learning material that is not relevant to the node.
    - Do not add any additional information or commentary.
    `,
  });
  
  return result.toTextStreamResponse();
}
 

