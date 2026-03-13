import { z } from "zod";

export const multipleChoiceSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correctAnswerIndex: z.number(),
});

export type MultipleChoice = z.infer<typeof multipleChoiceSchema>;

export const flowchartSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number()
    }),
    data: z.object({
      label: z.string()
    })
  })),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string()
  }))
});

export type Flowchart = z.infer<typeof flowchartSchema>;


