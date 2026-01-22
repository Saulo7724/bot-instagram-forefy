import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { vectorLogger as logger } from '../utils/logger';

/**
 * Serviço para interação com o Vector Store do Supabase
 * Implementa a busca RAG na knowledge_base do Forefy
 */
export class SupabaseVectorService {
  private vectorStore: SupabaseVectorStore | null = null;
  private embeddings: OpenAIEmbeddings;

  constructor() {
    // Inicializa embeddings do Azure OpenAI
    this.embeddings = new OpenAIEmbeddings({
      azureOpenAIApiKey: config.azureOpenAIEmbeddings.apiKey,
      azureOpenAIApiInstanceName: this.extractInstanceName(
        config.azureOpenAIEmbeddings.endpoint
      ),
      azureOpenAIApiDeploymentName:
        config.azureOpenAIEmbeddings.deploymentName,
      azureOpenAIApiVersion: config.azureOpenAIEmbeddings.apiVersion,
    });
  }

  /**
   * Inicializa o Vector Store
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Inicializando Supabase Vector Store');

      const supabaseClient = createClient(
        config.supabase.url,
        config.supabase.serviceKey
      );

      this.vectorStore = await SupabaseVectorStore.fromExistingIndex(
        this.embeddings,
        {
          client: supabaseClient,
          tableName: config.supabase.knowledgeBaseTable,
          queryName: 'match_documents',
        }
      );

      logger.info('Supabase Vector Store inicializado com sucesso');
    } catch (error) {
      logger.error('Erro ao inicializar Vector Store', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Busca documentos similares na knowledge base
   */
  async searchSimilarDocuments(
    query: string,
    topK: number = config.agent.vectorStoreTopK
  ): Promise<string[]> {
    if (!this.vectorStore) {
      await this.initialize();
    }

    try {
      logger.debug('Buscando documentos similares', { query, topK });

      const results = await this.vectorStore!.similaritySearch(query, topK);

      const documents = results.map((doc) => doc.pageContent);

      logger.info('Documentos encontrados', {
        count: documents.length,
        query: query.substring(0, 50),
      });

      return documents;
    } catch (error) {
      logger.error('Erro ao buscar documentos', {
        error: error instanceof Error ? error.message : String(error),
        query,
      });
      return [];
    }
  }

  /**
   * Retorna o Vector Store (para uso em Tools do LangChain)
   */
  async getVectorStore(): Promise<SupabaseVectorStore> {
    if (!this.vectorStore) {
      await this.initialize();
    }
    return this.vectorStore!;
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
}
