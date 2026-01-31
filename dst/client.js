"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientGuardrails = void 0;
class ClientGuardrails {
    server;
    provider;
    model;
    threshold;
    constructor(server, provider, model, threshold = 0.7) {
        this.server = server.replace(/\/+$/, '');
        this.provider = provider;
        this.model = model;
        this.threshold = threshold;
    }
    async listTools() {
        const response = await fetch(`${this.server}/list-tools`, {
            method: 'get',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });
        return response.json();
    }
    async callTool(options) {
        const response = await fetch(`${this.server}/call-tool`, {
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
        });
        return response.json();
    }
}
exports.ClientGuardrails = ClientGuardrails;
;
//# sourceMappingURL=client.js.map