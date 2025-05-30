import { ClientGuardrails } from './client';
import { LocalGuardrails } from './local';
import { Guardrails } from './types';

export default ({
    server,
    provider,
    model,
    criteria,
    threshold=0.5,
}: {
    server: string,
    provider: string,
    model: string,
    criteria: Record<string, string>,
    threshold: number,
}): Guardrails => {
    if (server) {
        return new ClientGuardrails(
            server,
            provider,
            model,
            threshold,
        );
    }
    return new LocalGuardrails(
        provider,
        model,
        criteria,
        threshold,
    );
};
