export type Tool = {
    name: string,
    description: string,
    inputSchema: Object,
};

export type Output = {
    name: string,
    valid: boolean,
    score: number,
    reason: string,
};

export interface Guardrails {
    listTools(): Promise<Tool[]>;
    callTool(options: {
        name: string,
        arguments: Record<string, string>,
    }): Promise<Output>;
};
