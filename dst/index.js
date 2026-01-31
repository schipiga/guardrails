"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("./client");
const local_1 = require("./local");
exports.default = ({ server, provider, model, criteria, threshold = 0.5, }) => {
    if (server) {
        return new client_1.ClientGuardrails(server, provider, model, threshold);
    }
    return new local_1.LocalGuardrails(provider, model, criteria, threshold);
};
//# sourceMappingURL=index.js.map