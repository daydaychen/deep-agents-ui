import { z } from "zod";

export const chatRequestSchema = z.object({
  message: z.string().min(1).max(50000),
  threadId: z.string().uuid().optional(),
  config: z
    .object({
      maxTurns: z.number().int().min(1).max(200).optional(),
      model: z.string().optional(),
    })
    .optional(),
});

export const resumeRequestSchema = z.object({
  response: z.unknown(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
