import axios, { AxiosError } from 'axios';
import { config } from '../config';
import {
  InstagramSendPayload,
  InstagramApiResponse,
  InstagramApiError,
} from '../types/instagram.types';
import { instagramLogger as logger } from '../utils/logger';

/**
 * Serviço responsável por enviar mensagens via Instagram Graph API
 *
 * Este é o componente que estava com problemas no n8n.
 * Implementado com retry logic, logs detalhados e tratamento robusto de erros.
 */
export class InstagramSenderService {
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly apiVersion: string;

  constructor() {
    this.baseUrl = config.instagram.baseUrl;
    this.accessToken = config.instagram.accessToken;
    this.apiVersion = config.instagram.apiVersion;
  }

  /**
   * Envia uma mensagem de texto para um usuário do Instagram
   */
  async sendMessage(
    recipientId: string,
    messageText: string
  ): Promise<InstagramApiResponse> {
    // URL correta: me/messages (não recipientId/messages)
    const url = `${this.baseUrl}/${this.apiVersion}/me/messages`;

    const payload: InstagramSendPayload = {
      recipient: { id: recipientId },
      message: { text: messageText },
    };

    logger.info('Tentando enviar mensagem', {
      recipientId,
      messageLength: messageText.length,
      url,
    });

    try {
      const response = await axios.post<InstagramApiResponse>(url, payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 segundos
      });

      logger.info('Mensagem enviada com sucesso', {
        recipientId: response.data.recipient_id,
        messageId: response.data.message_id,
      });

      return response.data;
    } catch (error) {
      return this.handleSendError(error, recipientId, messageText);
    }
  }

  /**
   * Envia mensagem com retry logic (máx 3 tentativas)
   */
  async sendMessageWithRetry(
    recipientId: string,
    messageText: string,
    maxRetries: number = 3
  ): Promise<InstagramApiResponse> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Tentativa ${attempt} de ${maxRetries}`, { recipientId });
        return await this.sendMessage(recipientId, messageText);
      } catch (error) {
        lastError = error as Error;

        logger.warn(`Tentativa ${attempt} falhou`, {
          recipientId,
          error: error instanceof Error ? error.message : String(error),
        });

        // Se não é a última tentativa, aguarda antes de tentar novamente
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Backoff exponencial
          logger.debug(`Aguardando ${delay}ms antes da próxima tentativa`);
          await this.sleep(delay);
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError || new InstagramApiError('Todas as tentativas falharam');
  }

  /**
   * Trata erros detalhadamente
   */
  private handleSendError(
    error: unknown,
    recipientId: string,
    messageText: string
  ): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      const errorDetails = {
        recipientId,
        messageTextLength: messageText.length,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        errorData: axiosError.response?.data,
        headers: axiosError.response?.headers,
        requestUrl: axiosError.config?.url,
      };

      logger.error('Erro ao enviar mensagem no Instagram', errorDetails);

      // Analisa erros específicos
      const status = axiosError.response?.status;
      const errorData: any = axiosError.response?.data;

      if (status === 400) {
        throw new InstagramApiError(
          `Bad Request: ${errorData?.error?.message || 'Payload inválido'}`,
          400,
          errorData
        );
      } else if (status === 401) {
        throw new InstagramApiError(
          'Token de acesso inválido ou expirado',
          401,
          errorData
        );
      } else if (status === 403) {
        throw new InstagramApiError(
          'Permissões insuficientes. Verifique instagram_manage_messages',
          403,
          errorData
        );
      } else if (status === 429) {
        throw new InstagramApiError(
          'Rate limit excedido. Aguarde antes de tentar novamente.',
          429,
          errorData
        );
      } else if (status && status >= 500) {
        throw new InstagramApiError(
          'Erro no servidor do Instagram. Tente novamente mais tarde.',
          status,
          errorData
        );
      }

      throw new InstagramApiError(
        `Erro HTTP ${status}: ${errorData?.error?.message || 'Erro desconhecido'}`,
        status,
        errorData
      );
    }

    // Erro genérico
    logger.error('Erro desconhecido ao enviar mensagem', {
      recipientId,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new InstagramApiError(
      'Erro desconhecido ao enviar mensagem',
      undefined,
      error
    );
  }

  /**
   * Valida o token de acesso
   */
  async validateToken(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/${this.apiVersion}/me`;

      await axios.get(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        timeout: 5000,
      });

      logger.info('Token de acesso validado com sucesso');
      return true;
    } catch (error) {
      logger.error('Token de acesso inválido', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Utility: Sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
