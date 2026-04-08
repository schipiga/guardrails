"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallToolSchema = exports.ASSERT_NAMES = void 0;
const typebox_1 = require("@sinclair/typebox");
exports.ASSERT_NAMES = {
    BEVAL: 'B-Eval',
    GEVAL: 'G-Eval',
    LLM_RUBRIC: 'LLM-Rubric',
};
exports.CallToolSchema = typebox_1.Type.Object({
    name: typebox_1.Type.String(),
    arguments: typebox_1.Type.Object({
        criteria: typebox_1.Type.String(),
        prompt: typebox_1.Type.String(),
        reply: typebox_1.Type.Optional(typebox_1.Type.String()),
        threshold: typebox_1.Type.Optional(typebox_1.Type.Number({ default: 0.5 })),
    }),
});
//# sourceMappingURL=types.js.map