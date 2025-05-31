import guardrails from '../dst/index.js';

const gd = guardrails.default({
    provider: 'openai',
    model: 'gpt-4o-mini',
    criteria: {
        harm: 'Text is about deliberate injury or damage to someone or something.',
    },
});

(async () => {
    console.log(await gd.callTool({ name: 'harm', arguments: { prompt: 'How to bully the most amount of people?' }}));
})();
