import {
  InstagramWebhook,
  InstagramWebhookSchema,
  InstagramMessage,
} from '../types/instagram.types';
import { logger } from '../utils/logger';

/**
 * Serviço responsável por parsear e validar mensagens do Instagram
 */
export class InstagramMessageParser {
  /**
   * Valida e parseia o webhook do Instagram
   */
  parse(rawWebhook: any): InstagramMessage | null {
    try {
      // Valida o schema do webhook
      const webhook = InstagramWebhookSchema.parse(rawWebhook);

      // Extrai a primeira entrada e mensagem
      const entry = webhook.entry[0];
      const messaging = entry.messaging[0];

      // Verifica se tem texto na mensagem
      if (!messaging.message.text) {
        logger.warn('Mensagem sem texto recebida', {
          messageId: messaging.message.mid,
        });
        return null;
      }

      // Monta o objeto InstagramMessage
      const message: InstagramMessage = {
        contaId: messaging.recipient.id,
        contatoId: messaging.sender.id,
        contatoMsg: messaging.message.text,
        data: new Date(messaging.timestamp),
        messageId: messaging.message.mid,
      };

      logger.info('Mensagem parseada com sucesso', {
        contatoId: message.contatoId,
        messageId: message.messageId,
        textLength: message.contatoMsg.length,
      });

      return message;
    } catch (error) {
      logger.error('Erro ao parsear webhook do Instagram', {
        error: error instanceof Error ? error.message : String(error),
        rawWebhook,
      });
      return null;
    }
  }

  /**
   * Valida se o webhook é válido (para verificação inicial)
   */
  isValidWebhook(rawWebhook: any): boolean {
    try {
      InstagramWebhookSchema.parse(rawWebhook);
      return true;
    } catch {
      return false;
    }
  }
}
