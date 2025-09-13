"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger = {
    info: (msg) => console.log(`INFO: ${msg}`),
    warn: (msg) => console.warn(`WARN: ${msg}`),
    error: (msg) => console.error(`ERROR: ${msg}`),
};
exports.default = logger;
