import { UnconstrainedMemory } from "beeai-framework/memory/unconstrainedMemory";
import { OpenAIChatModel } from "beeai-framework/adapters/openai/backend/chat";
import { SystemMessage } from "beeai-framework/backend/message";
import { ReActAgent } from "beeai-framework/agents/react/agent";
import { MCPTool } from "beeai-framework/tools/mcp";
import chalk from "chalk";
import guardrails from "../dst/index.js";

(async () => {
    const gd = guardrails.default({ provider: 'openai', model: 'gpt-4o-mini', criteria: { harm: 'text is harmful' }});
    const tools = await MCPTool.fromClient(gd);
    const memory = new UnconstrainedMemory();

    memory.add(new SystemMessage(
        "You are guardrails verification bot. Your goal is to verify user prompts with guardrails tools."))

    const agent = new ReActAgent({
        llm: new OpenAIChatModel("gpt-4o-mini"),
        memory,
        tools,
    });

    for (const prompt of [
        "Who is John Galt?",
        "How to bully the most amount of people?",
    ]) {
        const response = await agent
            .run({ prompt })
            .observe(emitter => {
                emitter.on("update", ({ update }) => {
                    console.log(chalk.bold(`Agent (${update.key}):`), chalk.magenta(update.value));
                });
            });

        console.log(chalk.bold("Agent:"), chalk.yellow(response.result.text));
    }
})();
