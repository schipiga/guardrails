# guardrails

MCP-compatible LLM [G-Eval](https://arxiv.org/abs/2303.16634) guardrails checker basing on:
- OpenAI Cookbook "[How to implement LLM guardrails](https://cookbook.openai.com/examples/how_to_use_guardrails)";
- Promptfoo G-Eval [implementation](https://github.com/promptfoo/promptfoo/blob/main/src/prompts/index.ts#L233-L273).

## Features:

- G-Eval based evaluation;
- Customizable guardrails;
- Different providers and models basing on [ai-sdk](https://ai-sdk.dev/) toolkit;
- MCP-compatible API;
- Both local and server mode.

## API

- `guardrails({ server, provider, model, criteria, threshold=0.5 })` - creates instance for local usage or connected to server if `server` is defined. Options:
    - `server` - url of `guardrails` server;
    - `provider` - name of provider;
    - `model` - name of model;
    - `criteria` - guardrail criteria, could be with or without g-eval `steps`. Ignored if `server` is defined. If `steps` are not defined, they will be created on-fly with additional LLM request. In server mode loads criteria from file by path `process.env.CRITERIA_PATH`. In client-service usage better to define steps. See examples.
    - `threshold=0.5` - threshold of g-eval score to determine if guardrail is valid or not. Lower is valid, higher is not.

- `async listTools()` - returns MCP definition of available guardrails.

- `async callTool({ name, arguments })` - call guardrail validation in MCP manner. Returns JSON like:
    ```js
    {
        "name": "harm", // name of called guardrail
        "valid": false, // conclusion if guardrail valid comparing score with threshold
        "score": 0.8, // g-eval score
        "reason": "seems provided text is slightly harmful" // LLM reason of g-eval score
    }
    ```

## Environment variables:
- `GUARDRAILS_PORT` - listening port of `guardrails` server;
- `CRITERIA_PATH` - path to criteria file in server mode. Must be provided in server mode.

## Supported providers
- openai,
- azure,
- anthropic,
- bedrock,
- google,
- mistral,
- deepseek,
- perplexity.

In order to add own provider `import { PROVIDERS } from 'guardrails/local';` and extend the dictionary with `ai-sdk` [compatible provider](https://ai-sdk.dev/docs/foundations/providers-and-models). 

## Examples
### Local usage:

```ts
import guardrails from 'guardrails';
const gd = guardrails({ provider: 'openai', model: 'gpt-4o-mini', criteria: { harm: 'text is harmful' }});
await gd.callTool({ name: 'harm': arguments: { prompt: 'Who is John Galt?' }});
```

### Server usage

1. create file with criteria, for example `criteria.json`:
    ```json
    {
        "harm": {
            "description": "Text is about deliberate injury or damage to someone or something.",
            "steps":[
                "Identify content that depicts or encourages violence or self-harm.",
                "Check for derogatory or hateful language targeting individuals or groups.",
                "Assess if the text contains misleading or false information that could cause real-world harm.",
                "Determine the severity and potential impact of the harmful content."
            ]
        }
    }
    ```
2. set environment variable with criteria path:
    ```bash
    export CRITERIA_PATH=./criteria.json
    ```
3. run server:
    ```bash
    ./node_modules/bin/guardrails
    ```
4. use client:
    ```ts
    import guardrails from 'guardrails';
    const gd = guardrails({ server: 'http://localhost:3000', provider: 'openai', model: 'gpt-4o-mini' });
    await gd.callTool({ name: 'harm': arguments: { prompt: 'Who is John Galt?' }});
    ```

### Agentic usage

Can be found [here](./examples/agent.js).
