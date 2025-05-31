import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { azure } from '@ai-sdk/azure';
import { anthropic } from '@ai-sdk/anthropic';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { deepseek } from '@ai-sdk/deepseek';
import { perplexity } from '@ai-sdk/perplexity';
import Mustache from 'mustache';
import { Guardrails, type Output, type Tool } from './types';
import { GEVAL_CRITERIA_STEPS, GEVAL_PROMPT_EVALUATE, GEVAL_REPLY_EVALUATE } from './g-eval';

const PROVIDERS: Record<string, Function> = {
    openai,
    azure,
    anthropic,
    bedrock,
    google,
    mistral,
    deepseek,
    perplexity,
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

const parseJson = <T>(text: string): T => JSON.parse(text.match(/\{.+\}/g)![0]);

export class LocalGuardrails implements Guardrails {
    provider: string;
    model: string;
    criteria: Record<string, { description: string, steps: string[] }>;
    threshold: number;
    tools: Tool[];

    constructor (
        provider: string,
        model: string,
        criteria: Record<string, string|{ description: string, steps: string[] }>,
        threshold=0.5,
    ) {
        this.provider = provider;
        this.model = model;
        this.threshold = threshold;
        this.criteria = Object
            .entries(criteria)
            .reduce<Record<string, { description: string, steps: string[] }>>((accum, [name, definition]) => {
                if (typeof(definition) === 'string') {
                    accum[name] = { description: definition, steps: [] };
                } else {
                    accum[name] = definition;
                }
                return accum;
            }, {});
        this.tools = Object
            .entries(this.criteria)
            .map(([name, definition]) => ({
                name,
                description: `Validate prompt or reply with guardrails criteria: "${definition.description}"`,
                inputSchema,
            }));
    }

    async listTools(): Promise<{ tools: Tool[] }> {
        return { tools: this.tools };
    }

    async callTool(options: {
        name: string,
        arguments: {
            prompt: string,
            reply?: string,
        },
    }): Promise<Output> {
        const maxScore = 10;
        const model = PROVIDERS[this.provider](this.model);
        const criteria = this.criteria[options.name];

        if (!criteria) {
            throw new Error(`Unknown criteria '${options.name}'`);
        }

        let steps: string;
        if (criteria.steps.length) {
            steps = criteria.steps.join('\n- ');
        } else {
            const stepsPrompt = Mustache.render(GEVAL_CRITERIA_STEPS, { criteria });
            const { text: stepsText } = await generateText({ model, prompt: stepsPrompt });
            steps = parseJson<{ steps: string[] }>(stepsText).steps.join('\n- ');
        }

        let gevalPrompt: string;
        if (options.arguments.reply) {
            gevalPrompt = Mustache.render(GEVAL_REPLY_EVALUATE, {
                criteria, steps, maxScore,
                input: options.arguments.prompt,
                output: options.arguments.reply,
            })
        } else {
            gevalPrompt = Mustache.render(GEVAL_PROMPT_EVALUATE, {
                criteria, steps, maxScore,
                input: options.arguments.prompt,
            });
        }

        const { text: gevalText } = await generateText({ model, prompt: gevalPrompt });
        const geval = parseJson<{ score: number, reason: string }>(gevalText);

        return {
            name: options.name,
            valid: geval.score / maxScore > this.threshold,
            score: geval.score / maxScore,
            reason: geval.reason,
        };
    }
};
