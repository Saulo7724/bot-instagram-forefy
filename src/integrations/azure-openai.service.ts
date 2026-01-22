import { AzureChatOpenAI } from '@langchain/openai';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Serviço para interação com Azure OpenAI
 * Fornece instâncias do modelo GPT-4o configuradas
 */
export class AzureOpenAIService {
  /**
   * Cria instância do ChatModel para o Agent (GPT-4o)
   */
  createAgentModel(): AzureChatOpenAI {
    logger.debug('Criando modelo Azure OpenAI para Agent');

    return new AzureChatOpenAI({
      azureOpenAIApiKey: config.azureOpenAI.apiKey,
      azureOpenAIApiInstanceName: this.extractInstanceName(
        config.azureOpenAI.endpoint
      ),
      azureOpenAIApiDeploymentName: config.azureOpenAI.deploymentName,
      azureOpenAIApiVersion: config.azureOpenAI.apiVersion,
      temperature: 0.7,
      maxTokens: 500,
      streaming: false,
    });
  }

  /**
   * Cria instância do ChatModel para o Vector Store Tool
   */
  createVectorStoreModel(): AzureChatOpenAI {
    logger.debug('Criando modelo Azure OpenAI para Vector Store');

    return new AzureChatOpenAI({
      azureOpenAIApiKey: config.azureOpenAI.apiKey,
      azureOpenAIApiInstanceName: this.extractInstanceName(
        config.azureOpenAI.endpoint
      ),
      azureOpenAIApiDeploymentName: config.azureOpenAI.deploymentName,
      azureOpenAIApiVersion: config.azureOpenAI.apiVersion,
      temperature: 0.3,
      maxTokens: 300,
      streaming: false,
    });
  }

  /**
   * Extrai o instance name da URL do endpoint
   */
  private extractInstanceName(endpoint: string): string {
    // Suporta ambos os formatos:
    // https://xxx.openai.azure.com
    // https://xxx.cognitiveservices.azure.com
    const match = endpoint.match(/https:\/\/([^.]+)\.(openai|cognitiveservices)\.azure\.com/);
    return match ? match[1] : '';
  }

  /**
   * Testa conectividade com Azure OpenAI
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.info('Testando conexão com Azure OpenAI');

      const model = this.createAgentModel();
      const response = await model.invoke('Responda apenas: OK');

      logger.info('Conexão com Azure OpenAI estabelecida', {
        response: response.content,
      });

      return true;
    } catch (error) {
      logger.error('Erro ao conectar com Azure OpenAI', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
