import { Static } from "@sinclair/typebox";
export declare const ASSERT_NAMES: {
    readonly BEVAL: "B-Eval";
    readonly GEVAL: "G-Eval";
    readonly LLM_RUBRIC: "LLM-Rubric";
};
export declare const CallToolSchema: import("@sinclair/typebox").TObject<{
    name: import("@sinclair/typebox").TString;
    arguments: import("@sinclair/typebox").TObject<{
        criteria: import("@sinclair/typebox").TString;
        prompt: import("@sinclair/typebox").TString;
        reply: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        threshold: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    }>;
}>;
export type TCallToolSchema = Static<typeof CallToolSchema>;
