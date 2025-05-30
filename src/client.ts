import { type Guardrails, type Output, type Tool } from './types';

export class ClientGuardrails implements Guardrails {
    server: string;
    provider: string;
    model: string;
    threshold: number;

    constructor(
        server: string,
        provider: string,
        model: string,
        threshold=0.5,
    ) {
        this.server = server.replace(/\/+$/, '');
        this.provider = provider;
        this.model = model;
        this.threshold = threshold;
    }

    async listTools(): Promise<{ tools: Tool[] }> {
        const response = await fetch(
            `${this.server}/list-tools`,
            {
                method: 'get',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
            },
        );

        return response.json();
    }

    async callTool(options: {
        name: string,
        arguments: {
            prompt: string,
            reply?: string,
        },
    }): Promise<Output> {
        const response = await fetch(
            `${this.server}/call-tool`,
            {
                method: 'post',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...options,
                    provider: this.provider,
                    model: this.model,
                    threshold: this.threshold,
                }),
            },
        );

        return response.json();
    }
};
