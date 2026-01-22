import express, { Express, Request, Response, NextFunction } from 'express';
import { config, validateConfig } from './config';
import { InstagramController } from './controllers/instagram.controller';
import { logger } from './utils/logger';

/**
 * Inicializa e configura o servidor Express
 */
async function bootstrap(): Promise<void> {
  try {
    // Valida configurações
    logger.info('Validando configurações...');
    validateConfig();

    // Cria app Express
    const app: Express = express();

    // Middlewares
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Middleware de log de requisições
    app.use((req: Request, res: Response, next: NextFunction) => {
      logger.debug(`${req.method} ${req.path}`, {
        query: req.query,
        body: req.method === 'POST' ? '...' : undefined,
      });
      next();
    });

    // Inicializa controller
    logger.info('Inicializando Instagram Controller...');
    const instagramController = new InstagramController();
    await instagramController.initialize();

    // Rotas
    app.get('/health', instagramController.healthCheck);
    app.get('/api/instagram/webhook', instagramController.verifyWebhook);
    app.post('/api/instagram/webhook', instagramController.handleWebhook);
    app.get('/api/instagram/validate-token', instagramController.validateToken);

    // Rotas de desenvolvimento
    if (config.nodeEnv === 'development') {
      app.post('/api/instagram/test-agent', instagramController.testAgent);
      app.post('/api/instagram/clear-memory', instagramController.clearMemory);
    }

    // Rota 404
    app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        path: req.path,
      });
    });

    // Middleware de erro global
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Erro não tratado', {
        error: err.message,
        stack: err.stack,
        path: req.path,
      });

      res.status(500).json({
        error: 'Internal Server Error',
        message: config.nodeEnv === 'development' ? err.message : undefined,
      });
    });

    // Inicia servidor
    const port = config.port;
    app.listen(port, () => {
      logger.info(`🚀 Bot Instagram Forefy rodando na porta ${port}`);
      logger.info(`📍 Webhook URL: http://localhost:${port}/api/instagram/webhook`);
      logger.info(`💚 Health check: http://localhost:${port}/health`);
      logger.info(`🔐 Environment: ${config.nodeEnv}`);

      if (config.nodeEnv === 'development') {
        logger.info(`🧪 Test Agent: http://localhost:${port}/api/instagram/test-agent`);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM recebido, encerrando servidor...');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT recebido, encerrando servidor...');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Erro fatal ao inicializar aplicação', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Inicia aplicação
bootstrap();
