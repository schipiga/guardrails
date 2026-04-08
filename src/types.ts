import { Type, Static } from "@sinclair/typebox";

export const ASSERT_NAMES = {
  BEVAL: 'B-Eval',
  GEVAL: 'G-Eval',
  LLM_RUBRIC: 'LLM-Rubric',
} as const;

export const CallToolSchema = Type.Object({
  name: Type.String(),
  arguments: Type.Object({
    criteria: Type.String(),
    prompt: Type.String(),
    reply: Type.Optional(Type.String()),
    threshold: Type.Optional(Type.Number({ default: 0.5 })),
  }),
});
export type TCallToolSchema = Static<typeof CallToolSchema>;
