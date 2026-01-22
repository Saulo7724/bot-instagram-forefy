import { Request, Response } from 'express';
import { InstagramMessageParser } from '../services/instagram-message-parser';
import { InstagramAgentService } from '../services/instagram-agent.service';
import { InstagramSenderService } from '../services/instagram-sender.service';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Controller para webhooks e interações do Instagram
 */
export class InstagramController {
  private parser: InstagramMessageParser;
  private agentService: InstagramAgentService;
  private senderService: InstagramSenderService;

  constructor() {
    this.parser = new InstagramMessageParser();
    this.agentService = new InstagramAgentService();
    this.senderService = new InstagramSenderService();
  }

  /**
   * Inicializa o controller (carrega Vector Store, etc)
   */
  async initialize(): Promise<void> {
    await this.agentService.initialize();
  }

  /**
   * GET /webhook - Verificação do webhook Instagram
   *
   * O Instagram envia uma requisição GET para verificar que o webhook é válido
   */
  verifyWebhook = (req: Request, res: Response): void => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    logger.info('Recebendo verificação de webhook', { mode, token });

    // Verifica se mode e token estão corretos
    if (mode === 'subscribe' && token === config.instagram.verifyToken) {
      logger.info('Webhook verificado com sucesso');
      res.status(200).send(challenge);
    } else {
      logger.error('Verificação de webhook falhou', { mode, token });
      res.sendStatus(403);
    }
  };

  /**
   * POST /webhook - Recebe mensagens do Instagram
   *
   * O Instagram envia POST requests quando há novas mensagens
   */
  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body;

      logger.info('Webhook recebido', {
        object: body.object,
        entries: body.entry?.length,
      });

      // Verifica se é uma mensagem do Instagram
      if (body.object !== 'instagram') {
        logger.warn('Webhook não é do Instagram', { object: body.object });
        res.sendStatus(404);
        return;
      }

      // Responde imediatamente (200 OK) para não deixar o Instagram esperando
      res.sendStatus(200);

      // Processa a mensagem de forma assíncrona
      this.processWebhookAsync({ body });
    } catch (error) {
      logger.error('Erro ao processar webhook', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.sendStatus(500);
    }
  };

  /**
   * Processa o webhook de forma assíncrona
   */
  private async processWebhookAsync(data: { body: any }): Promise<void> {
    try {
      const { body } = data;

      // Parseia a mensagem
      const message = this.parser.parse(body);

      if (!message) {
        logger.warn('Mensagem não pôde ser parseada ou não tem texto');
        return;
      }

      logger.info('Mensagem parseada, processando com Agent', {
        contatoId: message.contatoId,
        messageId: message.messageId,
      });

      // Processa com o AI Agent
      const agentOutput = await this.agentService.processMessage(
        message.contatoId,
        message.contatoMsg
      );

      logger.info('Agent processou mensagem', {
        contatoId: message.contatoId,
        stage: agentOutput.current_funnel_stage,
        vertical: agentOutput.identified_vertical,
      });

      // Envia resposta via Instagram
      await this.senderService.sendMessageWithRetry(
        message.contatoId,
        agentOutput.response_message,
        3 // max 3 tentativas
      );

      logger.info('Resposta enviada com sucesso', {
        contatoId: message.contatoId,
        messageLength: agentOutput.response_message.length,
      });
    } catch (error) {
      logger.error('Erro no processamento assíncrono do webhook', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * GET /health - Health check
   */
  healthCheck = (req: Request, res: Response): void => {
    res.status(200).json({
      status: 'ok',
      service: 'bot-instagram-forefy',
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * POST /test-agent - Testa o Agent diretamente (apenas dev)
   */
  testAgent = async (req: Request, res: Response): Promise<void> => {
    if (config.nodeEnv !== 'development') {
      res.status(403).json({ error: 'Disponível apenas em desenvolvimento' });
      return;
    }

    try {
      const { userId, message } = req.body;

      if (!userId || !message) {
        res.status(400).json({ error: 'userId e message são obrigatórios' });
        return;
      }

      const output = await this.agentService.processMessage(userId, message);

      res.status(200).json({
        success: true,
        output,
      });
    } catch (error) {
      logger.error('Erro no teste do Agent', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  /**
   * POST /clear-memory - Limpa memória de um usuário (apenas dev)
   */
  clearMemory = async (req: Request, res: Response): Promise<void> => {
    if (config.nodeEnv !== 'development') {
      res.status(403).json({ error: 'Disponível apenas em desenvolvimento' });
      return;
    }

    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ error: 'userId é obrigatório' });
        return;
      }

      await this.agentService.clearUserMemory(userId);

      res.status(200).json({
        success: true,
        message: `Memória do usuário ${userId} limpa`,
      });
    } catch (error) {
      logger.error('Erro ao limpar memória', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  /**
   * GET /validate-token - Valida token do Instagram
   */
  validateToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const isValid = await this.senderService.validateToken();

      res.status(200).json({
        valid: isValid,
        message: isValid ? 'Token válido' : 'Token inválido',
      });
    } catch (error) {
      logger.error('Erro ao validar token', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
