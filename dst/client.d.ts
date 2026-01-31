import { type Guardrails, type Output, type Tool } from './types';
export declare class ClientGuardrails implements Guardrails {
    server: string;
    provider: string;
    model: string;
    threshold: number;
    constructor(server: string, provider: string, model: string, threshold?: number);
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
