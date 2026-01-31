import { Guardrails } from './types';
declare const _default: ({ server, provider, model, criteria, threshold, }: {
    server?: string;
    provider: string;
    model: string;
    criteria?: Record<string, string | {
        description: string;
        steps: string[];
    }>;
    threshold?: number;
}) => Guardrails;
export default _default;
