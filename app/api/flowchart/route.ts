import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { flowchartSchema } from '@/app/types/challenges';
import fs from 'fs';
import path from 'path';

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8000';

export const maxDuration = 60;

export async function POST(req: Request) {
  let learningMaterial = '';
  const body = await req.json().catch(() => ({}));
  const chapterTitle = (body.chapter_title as string) || '';

  // Grounded RAG: if backend available and chapter selected, use only that chapter's chunks
  if (chapterTitle && RAG_API_URL) {
    try {
      const res = await fetch(`${RAG_API_URL}/retrieve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: chapterTitle, chapter_title: chapterTitle, n_results: 15 }),
      });
      if (res.ok) {
        const data = await res.json();
        const chunks = (data.chunks || []) as { text?: string }[];
        if (chunks.length > 0) {
          learningMaterial = chunks.map((c) => c.text || '').join('\n\n---\n\n');
        }
      }
    } catch (_) {
      // fallback to full file
    }
  }

  if (!learningMaterial) {
    const demoPath = path.join(process.cwd(), 'public', 'isomer_demo_textbook.txt');
    const fullPath = path.join(process.cwd(), 'public', 'High_School_Mathematics_Extensions.txt');
    try {
      if (fs.existsSync(demoPath)) {
        learningMaterial = fs.readFileSync(demoPath, 'utf-8');
      } else {
        learningMaterial = fs.readFileSync(fullPath, 'utf-8');
      }
    } catch (e) {
      console.error('cannot read material:', e);
      learningMaterial = 'material read failed';
    }
  }

  const result = streamObject({
    model: openai('gpt-4o-mini'),
    schema: flowchartSchema,
    prompt: `
    You are an expert instructional designer. Build a professional "learning routine" mind map for ADHD learners as a directed acyclic graph (DAG) from the material below.
    ${chapterTitle ? `Topic/Chapter: ${chapterTitle}. Use ONLY this material—do not add content from other chapters.` : ''}
    Material (Context):
    ${learningMaterial.slice(0, 20000)}

    Strict goals:
    - Generate 8–12 total nodes.
    - Exactly 1 root (start) and exactly 1 terminal (end) node.
    - Graph must be a clean DAG: no cycles, no back-edges, no dangling nodes.
    - Every non-root node has at least 1 incoming edge; every non-terminal node has at least 1 outgoing edge.
    - Edges only connect from layer Li to Li+1 (no skips or cross-layer edges).

    ADHD-friendly learning routine layers (top to bottom):
    - L0 Start (1 node): Overview & goals.
    - L1 Foundations (1–2 nodes): prerequisites or key reminders.
    - L2 Core concepts (3–5 nodes): small, digestible chunks in logical order.
    - L3 Practice/Apply (2–3 nodes): tiny exercises or applications.
    - L4 Review/Check/Wrap-up (1–2 nodes): self-check, recap, next steps; terminal is here.

    Labels and IDs:
    - Create node labels that match concepts actually present in the material (use terms, section names, and headings from the material) so each node has clear supporting content. Use a numeric prefix, e.g. "1. Overview & goals", "2. [concept from material]".
    - Use sequential node ids: n1, n2, ..., nK, where n1 is the root and the last id is the terminal.

    Layout constraints (absolute positions):
    - Top-to-bottom layered layout. Assign fixed y per layer to prevent overlap:
      L0: y=40, L1: y=140, L2: y=260, L3: y=380, L4: y=500.
    - x positions spread evenly within 40–760 range. Maintain ≥120px between nodes on the same layer.
    - Keep all coordinates within x: 0–800, y: 0–600.

    Edge rules:
    - Connect from each node in Li to the node(s) in Li+1 that directly depend on it.
    - No crossovers to non-adjacent layers; no parallel random links.

    Output strictly as JSON that conforms to the provided schema (nodes, edges only; no extra fields, no markdown).
    Ensure the result is fully connected from n1 (root) down to the terminal node placed in L4.
    `,
  });

  return result.toTextStreamResponse();
}
