import { Guardrails, type Output, type Tool } from './types';
export declare const PROVIDERS: Record<string, Function>;
export declare class LocalGuardrails implements Guardrails {
    provider: string;
    model: string;
    criteria: Record<string, {
        description: string;
        steps: string[];
    }>;
    threshold: number;
    tools: Tool[];
    constructor(provider: string, model: string, criteria: Record<string, string | {
        description: string;
        steps: string[];
    }>, threshold?: number);
    listTools(): Promise<{
        tools: Tool[];
    }>;
    callTool(options: {
        name: string;
        arguments: {
            prompt: string;
            reply?: string;
        };
    }): Promise<Output>;
}
