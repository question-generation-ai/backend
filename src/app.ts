import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config';
import logger from './utils/logger';
import { connectRedis } from './utils/redisClient';
import v1Routes from './routes/v1';
import { apiRateLimiter } from './middleware/rateLimiter';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: config.corsOrigin }));
app.use(helmet());
app.use(morgan('dev'));

(async () => {
  await connectRedis();
})();

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', env: config.env });
});

app.use('/api', apiRateLimiter);
app.use('/api/v1', v1Routes);

const swaggerDocument = YAML.load('./docs/openapi.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app; 