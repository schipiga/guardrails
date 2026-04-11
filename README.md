# eva-guard

[MCP](https://modelcontextprotocol.io/docs/getting-started/intro)-compatible guardrails server basing on [eva-judge](https://eva-llm.github.io/eva-judge) for production runtime.

---

## Quick Start

```bash
git clone https://github.com/eva-llm/eva-guard
cd eva-guard
nvm use
pnpm i
pnpm run server
```

---

## API

### GET /list-tools
Returns the list of available remote tools and the schema how to call.

### POST /call-tool
API is called according to schema from `GET /list-tools`, for example:

```bash
curl -X POST http://localhost:3000/call-tool \
  -H "Content-Type: application/json" \
  -d '{
    "name": "G-Eval",
    "arguments": {
      "prompt": "What is the capital of France?",
      "criteria": "question should be correct"
    }
  }'
```

Response Example:
```json
{
  "reason": "The question is grammatically correct...",
  "passed": true,
  "score": 1
}
```

---

## Settings

**NOTE!** It uses `temperature=0` to be closer to determenistic result.

### Environment Variables

- `PROVIDER` - default `openai`;
- `MODEL` - default `gpt-4.1-mini`;
- `LLM_PROVIDER_CONCURRENCY` - size of workers pool to call LLM provider, default `100`;
- `REDIS_URL`- if defined it uses Redis as permanent storage of G-Eval / B-Eval Evaluation Steps.
