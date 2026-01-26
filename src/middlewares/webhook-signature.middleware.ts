import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Middleware para validar assinatura do webhook do Meta/Instagram
 *
 * O Meta envia um header X-Hub-Signature-256 com HMAC-SHA256 do body
 * usando o App Secret como chave
 */
export function validateWebhookSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Em desenvolvimento, podemos pular a validação para facilitar testes
  if (config.nodeEnv === 'development' && !req.headers['x-hub-signature-256']) {
    logger.warn('Validação de assinatura pulada (desenvolvimento sem header)');
    next();
    return;
  }

  const signature = req.headers['x-hub-signature-256'] as string;

  if (!signature) {
    logger.error('Webhook sem assinatura X-Hub-Signature-256');
    res.sendStatus(401);
    return;
  }

  // O body precisa ser o raw buffer para calcular a assinatura corretamente
  const rawBody = (req as any).rawBody;

  if (!rawBody) {
    logger.error('Raw body não disponível para validação de assinatura');
    res.sendStatus(500);
    return;
  }

  // Calcula a assinatura esperada
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', config.instagram.appSecret)
    .update(rawBody)
    .digest('hex');

  // Comparação segura contra timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    logger.error('Assinatura do webhook inválida', {
      received: signature.substring(0, 20) + '...',
      expected: expectedSignature.substring(0, 20) + '...',
    });
    res.sendStatus(403);
    return;
  }

  logger.debug('Assinatura do webhook validada com sucesso');
  next();
}

/**
 * Middleware para capturar o raw body para validação de assinatura
 * Deve ser usado ANTES do express.json()
 */
export function captureRawBody(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let data = '';

  req.on('data', (chunk) => {
    data += chunk;
  });

  req.on('end', () => {
    (req as any).rawBody = data;
    next();
  });
}
