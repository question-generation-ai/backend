"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
function validate(schema, property = 'body') {
    return (req, res, next) => {
        const result = schema.safeParse(req[property]);
        if (!result.success) {
            console.error('Validation Error:', JSON.stringify(result.error.issues, null, 2));
            return res.status(400).json({ error: 'Validation error', details: result.error.issues });
        }
        req[property] = result.data;
        next();
    };
}
