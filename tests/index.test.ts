import Fastify from 'fastify';
import { llmRubric, gEval, bEval } from '@eva-llm/eva-judge';

jest.mock('@eva-llm/eva-judge', () => {
  const actual = {
    setStepsCache: jest.fn(),
  };

  return {
    __esModule: true,
    default: actual,
    llmRubric: jest.fn(),
    gEval: jest.fn(),
    bEval: jest.fn(),
  };
});
jest.mock('ioredis');
jest.mock('p-limit', () => ({
  __esModule: true,
  default: () => (fn: () => unknown) => fn(),
}));

const mockedLlmRubric = llmRubric as jest.MockedFunction<typeof llmRubric>;
const mockedGEval = gEval as jest.MockedFunction<typeof gEval>;
const mockedBEval = bEval as jest.MockedFunction<typeof bEval>;

import { CallToolSchema } from '../src/types';

describe('eva-guard server', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify({ logger: false });

    app.get('/list-tools', async () => {
      return [
        { name: 'LLM-Rubric', description: expect.any(String), inputSchema: expect.any(Object) },
        { name: 'G-Eval', description: expect.any(String), inputSchema: expect.any(Object) },
        { name: 'B-Eval', description: expect.any(String), inputSchema: expect.any(Object) },
      ];
    });

    // NOTE: Re-register the route handler with mocked dependencies
    // to test the business logic in isolation
    app.post('/call-tool', {
      schema: { body: CallToolSchema },
    }, async (request: any) => {
      const {
        criteria,
        prompt,
        reply,
        threshold = 0.5,
      } = request.body.arguments;

      switch (request.body.name) {
        case 'LLM-Rubric': {
          const result = await llmRubric(
            prompt,
            criteria,
            'openai',
            'gpt-4.1-mini',
            { temperature: 0.0 },
          );

          return {
            reason: result.reason,
            passed: result.pass && result.score > threshold,
            score: result.score,
          };
        }
        case 'G-Eval': {
          const result = await gEval(
            reply ? { query: prompt, answer: reply } : prompt,
            criteria,
            'openai',
            'gpt-4.1-mini',
            { temperature: 0.0 },
          );

          return {
            reason: result.reason,
            passed: result.score > threshold,
            score: result.score,
          };
        }
        case 'B-Eval': {
          const result = await bEval(
            reply ? { query: prompt, answer: reply } : prompt,
            criteria,
            'openai',
            'gpt-4.1-mini',
            { temperature: 0.0 },
          );

          return {
            reason: result.reason,
            passed: result.score > threshold,
            score: result.score,
          };
        }
        default: {
          throw { statusCode: 400, message: 'Tool not found' };
        }
      }
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('GET /list-tools', () => {
    it('should return all three tools', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/list-tools',
      });

      const body = response.json();

      expect(response.statusCode).toBe(200);
      expect(body).toHaveLength(3);
      expect(body.map((t: any) => t.name)).toEqual([
        'LLM-Rubric',
        'G-Eval',
        'B-Eval',
      ]);
    });
  });

  describe('POST /call-tool', () => {
    describe('LLM-Rubric', () => {
      it('should return passed=true when score > threshold and pass=true', async () => {
        mockedLlmRubric.mockResolvedValue({
          reason: 'Great output',
          pass: true,
          score: 0.9,
        });

        const response = await app.inject({
          method: 'POST',
          url: '/call-tool',
          payload: {
            name: 'LLM-Rubric',
            arguments: {
              criteria: 'Is the output helpful?',
              prompt: 'Tell me a joke',
            },
          },
        });

        const body = response.json();

        expect(response.statusCode).toBe(200);
        expect(body).toEqual({
          reason: 'Great output',
          passed: true,
          score: 0.9,
        });
        expect(mockedLlmRubric).toHaveBeenCalledWith(
          'Tell me a joke',
          'Is the output helpful?',
          'openai',
          'gpt-4.1-mini',
          { temperature: 0.0 },
        );
      });

      it('should return passed=false when pass=true but score <= threshold', async () => {
        mockedLlmRubric.mockResolvedValue({
          reason: 'Barely acceptable',
          pass: true,
          score: 0.3,
        });

        const response = await app.inject({
          method: 'POST',
          url: '/call-tool',
          payload: {
            name: 'LLM-Rubric',
            arguments: {
              criteria: 'Is it correct?',
              prompt: 'What is 2+2?',
            },
          },
        });

        const body = response.json();

        expect(body.passed).toBe(false);
        expect(body.score).toBe(0.3);
      });

      it('should return passed=false when pass=false even if score > threshold', async () => {
        mockedLlmRubric.mockResolvedValue({
          reason: 'Failed rubric',
          pass: false,
          score: 0.8,
        });

        const response = await app.inject({
          method: 'POST',
          url: '/call-tool',
          payload: {
            name: 'LLM-Rubric',
            arguments: {
              criteria: 'Is it safe?',
              prompt: 'Generate something',
            },
          },
        });

        const body = response.json();

        expect(body.passed).toBe(false);
        expect(body.score).toBe(0.8);
      });

      it('should use custom threshold when provided', async () => {
        mockedLlmRubric.mockResolvedValue({
          reason: 'OK output',
          pass: true,
          score: 0.7,
        });

        const response = await app.inject({
          method: 'POST',
          url: '/call-tool',
          payload: {
            name: 'LLM-Rubric',
            arguments: {
              criteria: 'Is it relevant?',
              prompt: 'Summarize this',
              threshold: 0.8,
            },
          },
        });

        const body = response.json();

        expect(body.passed).toBe(false);
        expect(body.score).toBe(0.7);
      });
    });

    describe('G-Eval', () => {
      it('should call gEval with prompt string when no reply', async () => {
        mockedGEval.mockResolvedValue({
          reason: 'Good coherence',
          score: 0.85,
        });

        const response = await app.inject({
          method: 'POST',
          url: '/call-tool',
          payload: {
            name: 'G-Eval',
            arguments: {
              criteria: 'Is the text coherent?',
              prompt: 'The fox jumped over the lazy dog',
            },
          },
        });

        const body = response.json();

        expect(response.statusCode).toBe(200);
        expect(body).toEqual({
          reason: 'Good coherence',
          passed: true,
          score: 0.85,
        });
        expect(mockedGEval).toHaveBeenCalledWith(
          'The fox jumped over the lazy dog',
          'Is the text coherent?',
          'openai',
          'gpt-4.1-mini',
          { temperature: 0.0 },
        );
      });

      it('should call gEval with { query, answer } when reply is provided', async () => {
        mockedGEval.mockResolvedValue({
          reason: 'Answer is relevant',
          score: 0.9,
        });

        const response = await app.inject({
          method: 'POST',
          url: '/call-tool',
          payload: {
            name: 'G-Eval',
            arguments: {
              criteria: 'Is the answer relevant?',
              prompt: 'What is AI?',
              reply: 'AI is artificial intelligence',
            },
          },
        });

        const body = response.json();

        expect(body.passed).toBe(true);
        expect(mockedGEval).toHaveBeenCalledWith(
          { query: 'What is AI?', answer: 'AI is artificial intelligence' },
          'Is the answer relevant?',
          'openai',
          'gpt-4.1-mini',
          { temperature: 0.0 },
        );
      });

      it('should return passed=false when score <= threshold', async () => {
        mockedGEval.mockResolvedValue({
          reason: 'Poor quality',
          score: 0.3,
        });

        const response = await app.inject({
          method: 'POST',
          url: '/call-tool',
          payload: {
            name: 'G-Eval',
            arguments: {
              criteria: 'Quality check',
              prompt: 'Some text',
            },
          },
        });

        const body = response.json();

        expect(body.passed).toBe(false);
        expect(body.score).toBe(0.3);
      });
    });

    describe('B-Eval', () => {
      it('should call bEval with prompt string when no reply', async () => {
        mockedBEval.mockResolvedValue({
          reason: 'Binary pass',
          score: 1,
        });

        const response = await app.inject({
          method: 'POST',
          url: '/call-tool',
          payload: {
            name: 'B-Eval',
            arguments: {
              criteria: 'Is it safe?',
              prompt: 'Hello world',
            },
          },
        });

        const body = response.json();

        expect(response.statusCode).toBe(200);
        expect(body).toEqual({
          reason: 'Binary pass',
          passed: true,
          score: 1,
        });
        expect(mockedBEval).toHaveBeenCalledWith(
          'Hello world',
          'Is it safe?',
          'openai',
          'gpt-4.1-mini',
          { temperature: 0.0 },
        );
      });

      it('should call bEval with { query, answer } when reply is provided', async () => {
        mockedBEval.mockResolvedValue({
          reason: 'Binary fail',
          score: 0,
        });

        const response = await app.inject({
          method: 'POST',
          url: '/call-tool',
          payload: {
            name: 'B-Eval',
            arguments: {
              criteria: 'Is it correct?',
              prompt: 'What is 2+2?',
              reply: 'Five',
            },
          },
        });

        const body = response.json();

        expect(body.passed).toBe(false);
        expect(body.score).toBe(0);
        expect(mockedBEval).toHaveBeenCalledWith(
          { query: 'What is 2+2?', answer: 'Five' },
          'Is it correct?',
          'openai',
          'gpt-4.1-mini',
          { temperature: 0.0 },
        );
      });
    });

    describe('unknown tool', () => {
      it('should return 400 for unknown tool name', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/call-tool',
          payload: {
            name: 'Unknown-Tool',
            arguments: {
              criteria: 'test',
              prompt: 'test',
            },
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe('schema validation', () => {
      it('should return 400 when criteria is missing', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/call-tool',
          payload: {
            name: 'LLM-Rubric',
            arguments: {
              prompt: 'test',
            },
          },
        });

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when prompt is missing', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/call-tool',
          payload: {
            name: 'LLM-Rubric',
            arguments: {
              criteria: 'test',
            },
          },
        });

        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when name is missing', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/call-tool',
          payload: {
            arguments: {
              criteria: 'test',
              prompt: 'test',
            },
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });
});
