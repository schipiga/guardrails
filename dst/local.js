"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalGuardrails = exports.PROVIDERS = void 0;
const ai_1 = require("ai");
const openai_1 = require("@ai-sdk/openai");
const azure_1 = require("@ai-sdk/azure");
const anthropic_1 = require("@ai-sdk/anthropic");
const amazon_bedrock_1 = require("@ai-sdk/amazon-bedrock");
const google_1 = require("@ai-sdk/google");
const mistral_1 = require("@ai-sdk/mistral");
const deepseek_1 = require("@ai-sdk/deepseek");
const perplexity_1 = require("@ai-sdk/perplexity");
const mustache_1 = __importDefault(require("mustache"));
const g_eval_1 = require("./g-eval");
exports.PROVIDERS = {
    openai: openai_1.openai,
    azure: azure_1.azure,
    anthropic: anthropic_1.anthropic,
    bedrock: amazon_bedrock_1.bedrock,
    google: google_1.google,
    mistral: mistral_1.mistral,
    deepseek: deepseek_1.deepseek,
    perplexity: perplexity_1.perplexity,
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
const parseJson = (text) => JSON.parse(text.match(/\{.+\}/g)[0]);
class LocalGuardrails {
    provider;
    model;
    criteria;
    threshold;
    tools;
    constructor(provider, model, criteria, threshold = 0.7) {
        this.provider = provider;
        this.model = model;
        this.threshold = threshold;
        this.criteria = Object
            .entries(criteria)
            .reduce((accum, [name, definition]) => {
            if (typeof (definition) === 'string') {
                accum[name] = { description: definition, steps: [] };
            }
            else {
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
    async listTools() {
        return { tools: this.tools };
    }
    async callTool(options) {
        const maxScore = 10;
        const model = exports.PROVIDERS[this.provider](this.model);
        const criteria = this.criteria[options.name];
        if (!criteria) {
            throw new Error(`Unknown criteria '${options.name}'`);
        }
        let steps;
        if (criteria.steps.length) {
            steps = criteria.steps.join('\n- ');
        }
        else {
            const stepsPrompt = mustache_1.default.render(g_eval_1.GEVAL_CRITERIA_STEPS, { criteria: criteria.description });
            const { text: stepsText } = await (0, ai_1.generateText)({ model, prompt: stepsPrompt });
            steps = parseJson(stepsText).steps.join('\n- ');
        }
        let gevalPrompt;
        if (options.arguments.reply) {
            gevalPrompt = mustache_1.default.render(g_eval_1.GEVAL_REPLY_EVALUATE, {
                steps, maxScore,
                criteria: criteria.description,
                input: options.arguments.prompt,
                output: options.arguments.reply,
            });
        }
        else {
            gevalPrompt = mustache_1.default.render(g_eval_1.GEVAL_PROMPT_EVALUATE, {
                steps, maxScore,
                criteria: criteria.description,
                input: options.arguments.prompt,
            });
        }
        const { text: gevalText } = await (0, ai_1.generateText)({ model, prompt: gevalPrompt });
        const geval = parseJson(gevalText);
        return {
            name: options.name,
            valid: geval.score / maxScore >= this.threshold,
            score: geval.score / maxScore,
            reason: geval.reason,
        };
    }
}
exports.LocalGuardrails = LocalGuardrails;
;
//# sourceMappingURL=local.js.map