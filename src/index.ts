import createError from 'http-errors';
import Fastify, {
  type FastifyRequest,
} from 'fastify';
import Config, {
  llmRubric,
  gEval,
  bEval,
  type IStepsCache,
} from '@eva-llm/eva-judge';
import pLimit from 'p-limit';
import Redis from 'ioredis';

import {
  ASSERT_NAMES,
  CallToolSchema,
  type TCallToolSchema,
} from './types';

export * from './types';

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

const limit = pLimit(Number(process.env.LLM_PROVIDER_CONCURRENCY || 100));
const fastify = Fastify({
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
  class RedisStepsCache implements IStepsCache {
    private readonly PREFIX = 'eva-judge:steps:';
    private client: Redis;

    constructor() {
      this.client = new Redis(process.env.REDIS_URL!, {
        retryStrategy: (times) => Math.min(times * 50, 2000)
      });
    }

    async set(key: string, value: string[]): Promise<void> {
      await this.client.set(`${this.PREFIX}${key}`, JSON.stringify(value));
    }

    async get(key: string): Promise<string[] | undefined> {
      const data = await this.client.get(`${this.PREFIX}${key}`);

      if (!data) {
        return undefined;
      }

      try {
        return JSON.parse(data) as string[];
      } catch (e) {
        return undefined;
      }
    }

    async disconnect(): Promise<void> {
      await this.client.quit();
    }
  }

  const redisCache = new RedisStepsCache();

  Config.setStepsCache(redisCache);
  fastify.addHook('onClose', async () => {
    await redisCache.disconnect();
  });
}

fastify.get('/list-tools', async () => { // NOTE: seems need to be async ¯\_(ツ)_/¯
  return TOOLS;
});

fastify.post('/call-tool', {
  schema: {
    body: CallToolSchema,
  },
}, async (request: FastifyRequest<{
  Body: TCallToolSchema,
}>) => {
  const {
    criteria,
    prompt,
    reply,
    threshold = 0.5,
  } = request.body.arguments;

  switch (request.body.name) {
    case ASSERT_NAMES.LLM_RUBRIC: {
      const result = await limit(() => llmRubric(
        prompt,
        criteria,
        PROVIDER,
        MODEL,
        { temperature: 0.0 },
      ));

      return { 
        reason: result.reason,
        passed: result.pass && result.score > threshold,
        score: result.score,
      }
    }
    case ASSERT_NAMES.GEVAL: {
      const result = await limit(() => gEval(
        reply ? { query: prompt, answer: reply } : prompt,
        criteria,
        PROVIDER,
        MODEL,
        { temperature: 0.0 },
      ));

      return { 
        reason: result.reason,
        passed: result.score > threshold,
        score: result.score,
      }
    }
    case ASSERT_NAMES.BEVAL: {
      const result = await limit(() => bEval(
        reply ? { query: prompt, answer: reply } : prompt,
        criteria,
        PROVIDER,
        MODEL,
        { temperature: 0.0 },
      ));

      return { 
        reason: result.reason,
        passed: result.score > threshold,
        score: result.score,
      }
    }
    default: {
      throw createError(400, 'Tool not found');
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
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
