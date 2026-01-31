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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const fastify_1 = __importDefault(require("fastify"));
const local_1 = require("./local");
const criteria = JSON.parse(fs.readFileSync(process.env.CRITERIA_PATH, 'utf-8'));
const fastify = (0, fastify_1.default)();
fastify.get('/list-tools', async (request, reply) => {
    const guardrails = new local_1.LocalGuardrails(request.params.provider, request.params.model, criteria, request.params.threshold);
    reply.send(await guardrails.listTools());
});
fastify.post('/call-tool', async (request, reply) => {
    const guardrails = new local_1.LocalGuardrails(request.body.provider, request.body.model, criteria, request.body.threshold);
    reply.send(await guardrails.callTool({
        name: request.body.name,
        arguments: request.body.arguments,
    }));
});
fastify.listen({ port: Number(process.env.GUARDRAILS_PORT || 3000) }, (err, address) => {
    if (err) {
        console.log(err);
        process.exit(1);
    }
    console.log(`listening ${address}`);
});
//# sourceMappingURL=server.js.map