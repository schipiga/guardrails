"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_errors_1 = __importDefault(require("http-errors"));
const fastify_1 = __importDefault(require("fastify"));
const eva_judge_1 = __importStar(require("@eva-llm/eva-judge"));
const p_limit_1 = __importDefault(require("p-limit"));
const ioredis_1 = __importDefault(require("ioredis"));
const types_1 = require("./types");
__exportStar(require("./types"), exports);
const PROVIDER = process.env.PROVIDER || 'openai';
const MODEL = process.env.MODEL || 'gpt-4.1-mini';
const TOOLS = [{
        name: 'LLM-Rubric',
        description: 'Evaluates an output against a rubric using an LLM. Returns a reason, pass/fail, and normalized score (0.0-1.0).',
        inputSchema: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'Prompt is used for validation',
                },
            },
            required: ['prompt'],
        }
    }, {
        name: 'G-Eval',
        description: 'Evaluates a reply against criteria and derived steps using an LLM. Returns a reason, pass/fail, and normalized score (0.0-1.0).',
        inputSchema: {
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
        }
    }, {
        name: 'B-Eval',
        description: 'Evaluates a reply against criteria and derived steps using an LLM, but with binary scoring (0 or 1). Returns a reason, pass/fail, and normalized score (0 or 1).',
        inputSchema: {
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
        }
    }];
const limit = (0, p_limit_1.default)(Number(process.env.LLM_PROVIDER_CONCURRENCY || 100));
const fastify = (0, fastify_1.default)({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        },
    },
});
if (process.env.REDIS_URL) {
    class RedisStepsCache {
        PREFIX = 'eva-judge:steps:';
        client;
        constructor() {
            this.client = new ioredis_1.default(process.env.REDIS_URL, {
                retryStrategy: (times) => Math.min(times * 50, 2000)
            });
        }
        async set(key, value) {
            await this.client.set(`${this.PREFIX}${key}`, JSON.stringify(value));
        }
        async get(key) {
            const data = await this.client.get(`${this.PREFIX}${key}`);
            if (!data) {
                return undefined;
            }
            try {
                return JSON.parse(data);
            }
            catch (e) {
                return undefined;
            }
        }
        async disconnect() {
            await this.client.quit();
        }
    }
    const redisCache = new RedisStepsCache();
    eva_judge_1.default.setStepsCache(redisCache);
    fastify.addHook('onClose', async () => {
        await redisCache.disconnect();
    });
}
fastify.get('/list-tools', async () => {
    return TOOLS;
});
fastify.post('/call-tool', {
    schema: {
        body: types_1.CallToolSchema,
    },
}, async (request) => {
    const { criteria, prompt, reply, threshold = 0.5, } = request.body.arguments;
    switch (request.body.name) {
        case types_1.ASSERT_NAMES.LLM_RUBRIC: {
            const result = await limit(() => (0, eva_judge_1.llmRubric)(prompt, criteria, PROVIDER, MODEL, { temperature: 0.0 }));
            return {
                reason: result.reason,
                passed: result.pass && result.score > threshold,
                score: result.score,
            };
        }
        case types_1.ASSERT_NAMES.GEVAL: {
            const result = await limit(() => (0, eva_judge_1.gEval)(reply ? { query: prompt, answer: reply } : prompt, criteria, PROVIDER, MODEL, { temperature: 0.0 }));
            return {
                reason: result.reason,
                passed: result.score > threshold,
                score: result.score,
            };
        }
        case types_1.ASSERT_NAMES.BEVAL: {
            const result = await limit(() => (0, eva_judge_1.bEval)(reply ? { query: prompt, answer: reply } : prompt, criteria, PROVIDER, MODEL, { temperature: 0.0 }));
            return {
                reason: result.reason,
                passed: result.score > threshold,
                score: result.score,
            };
        }
        default: {
            throw (0, http_errors_1.default)(400, 'Tool not found');
        }
    }
});
const start = async () => {
    try {
        const address = await fastify.listen({
            port: 3000,
            host: '0.0.0.0',
        });
        fastify.log.info(`Server is up at ${address}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map