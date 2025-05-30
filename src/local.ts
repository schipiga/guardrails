import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import Mustache from 'mustache';
import { Guardrails, type Output, type Tool } from './types';
import { GEVAL_CRITERIA_STEPS, GEVAL_PROMPT_EVALUATE, GEVAL_REPLY_EVALUATE } from './g-eval';

const PROVIDERS: Record<string, Function> = {
    openai,
};

const inputSchema = {
    type: 'object',
    properties: {
        prompt: {
            type: 'string',
            description: 'Prompt is used for validation if "reply" argument is not defined',
        },
        reply: {
            type: 'string',
            description: 'Reply is used for validation',
        },
    },
    required: ['prompt'],
};

export class LocalGuardrails implements Guardrails {
    provider: string;
    model: string;
    criteria: Record<string, string>;
    threshold: number;
    tools: Tool[];

    constructor (provider: string, model: string, criteria: Record<string, string>, threshold=0.5) {
        this.provider = provider;
        this.model = model;
        this.criteria = criteria;
        this.threshold = threshold;

        this.tools = Object.entries(criteria).map(([name, description]) => ({
            name,
            description: `Validate prompt or reply with criteria: "${description}"`,
            inputSchema,
        }));
    }

    async listTools(): Promise<Tool[]> {
        return this.tools;
    }

    async callTool(options: { name: string; arguments: { prompt: string, reply?: string; }; }): Promise<Output> {
        const model = PROVIDERS[this.provider](this.model);

        const stepsPrompt = Mustache.render(GEVAL_CRITERIA_STEPS, { criteria: this.criteria[options.name] });

        const { text: stepsText } = await generateText({
            model,
            prompt: stepsPrompt,
        });
    
        const steps = JSON.parse(stepsText.match(/\{"steps".+\}/g)![0]).steps.join('\n- ');

        let gevalPrompt: string;
        if (options.arguments.reply) {
            gevalPrompt = Mustache.render(GEVAL_REPLY_EVALUATE, {
                criteria: this.criteria[options.name],
                steps,
                input: options.arguments.prompt,
                output: options.arguments.reply,
            })
        } else {
            gevalPrompt = Mustache.render(GEVAL_PROMPT_EVALUATE, {
                criteria: this.criteria[options.name],
                steps,
                input: options.arguments.prompt,
            });
        }

        const { text: gevalText } = await generateText({
            model,
            prompt: gevalPrompt,
        });

        const result: { score: number; reason: string; } = JSON.parse(gevalText.match(/\{.+\}/g)![0]);

        return {
            name: options.name,
            valid: Number(result.score) > this.threshold,
            score: Number(result.score),
            reason: result.reason,
        };
    }
};
