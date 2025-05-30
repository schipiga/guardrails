import * as fs from 'fs';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { LocalGuardrails } from './local';

const criteria = JSON.parse(fs.readFileSync(process.env.CRITERIA_PATH!, 'utf-8'))

const fastify = Fastify();

fastify.get('/list-tools', async (request: FastifyRequest<{ Params: { provider: string, model: string, threshold?: number }}>, reply: FastifyReply) => {
    const guardrails = new LocalGuardrails(
        request.params.provider,
        request.params.model,
        criteria,
        request.params.threshold);

    reply.send(await guardrails.listTools());
});

fastify.post('/call-tool', async (request: FastifyRequest<{ Body: { provider: string, model: string, threshold?: number, name: string, arguments: { prompt: string, reply?: string }}}>, reply: FastifyReply) => {
    const guardrails = new LocalGuardrails(
        request.body.provider,
        request.body.model,
        criteria,
        request.body.threshold);

    reply.send(await guardrails.callTool({ name: request.body.name, arguments: request.body.arguments }));
});

fastify.listen({ port: Number(process.env.GUARDRAILS_PORT || 3000) }, (err) => {
    process.exit(1);
});
