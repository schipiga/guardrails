import { Guardrails, Output, Tool } from './types';

export class ClientGuardrails implements Guardrails {
    server: string;
    provider: string;
    model: string;
    threshold: number;

    constructor(server: string, provider: string, model: string, threshold=0.5) {
        this.server = server.replace(/\/+$/, '');
        this.provider = provider;
        this.model = model;
        this.threshold = threshold;
    }

    async listTools(): Promise<Tool[]> {
        const fetchOptions = {
            method: 'get',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        };

        const response = await fetch(`${this.server}/list-tools`, fetchOptions);

        return response.json();
    }

    async callTool(options: { name: string; arguments: { prompt: string, reply?: string }}): Promise<Output> {
        const fetchOptions = {
            method: 'post',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...options, provider: this.provider, model: this.model, threshold: this.threshold }),
        };

        const response = await fetch(`${this.server}/call-tool`, fetchOptions);

        return response.json();
    }
};
