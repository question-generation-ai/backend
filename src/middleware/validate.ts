import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validate(schema: ZodSchema, property: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      console.error('Validation Error:', JSON.stringify(result.error.issues, null, 2));
      return res.status(400).json({ error: 'Validation error', details: result.error.issues });
    }
    req[property] = result.data;
    next();
  };
} 