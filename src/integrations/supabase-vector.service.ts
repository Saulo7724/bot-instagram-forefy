import { VertexAIEmbeddings } from '@langchain/google-vertexai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { vectorLogger as logger } from '../utils/logger';
import * as path from 'path';

/**
 * Serviço para interação com o Vector Store do Supabase
 * Implementa a busca RAG na knowledge_base do Forefy
 * Usa Vertex AI embeddings (text-embedding-004) - 768 dimensões
 */
export class SupabaseVectorService {
  private supabaseClient: SupabaseClient | null = null;
  private embeddings: VertexAIEmbeddings | null = null;
  private readonly sourceFilter: string = 'offerbook_forefy';

  constructor() {
    // Configura as credenciais do Google
    const credentialsPath = path.resolve(
      process.cwd(),
      config.geminiEmbeddings.credentialsPath
    );
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
  }

  /**
   * Inicializa o Vector Store
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Inicializando Supabase Vector Store com Vertex AI embeddings');

      // Inicializa cliente Supabase
      this.supabaseClient = createClient(
        config.supabase.url,
        config.supabase.serviceKey
      );

      // Inicializa embeddings do Vertex AI (Google Cloud)
      this.embeddings = new VertexAIEmbeddings({
        model: config.geminiEmbeddings.model,
        location: 'us-central1',
      });

      // Testa a conexão gerando um embedding de teste
      await this.embeddings.embedQuery('test');

      logger.info('Supabase Vector Store inicializado com sucesso', {
        model: config.geminiEmbeddings.model,
        sourceFilter: this.sourceFilter,
      });
    } catch (error) {
      logger.error('Erro ao inicializar Vector Store', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Busca documentos similares na knowledge base
   * Filtra apenas documentos com source = 'offerbook_forefy'
   */
  async searchSimilarDocuments(
    query: string,
    topK: number = config.agent.vectorStoreTopK
  ): Promise<string[]> {
    if (!this.supabaseClient || !this.embeddings) {
      await this.initialize();
    }

    try {
      logger.debug('Buscando documentos similares', {
        query,
        topK,
        sourceFilter: this.sourceFilter,
      });

      // Gera embedding da query
      const queryEmbedding = await this.embeddings!.embedQuery(query);

      // Tenta a função RPC primeiro
      const { data: rpcData, error: rpcError } = await this.supabaseClient!.rpc(
        'match_documents_by_source',
        {
          query_embedding: queryEmbedding,
          match_count: topK,
          source_filter: this.sourceFilter,
        }
      );

      if (!rpcError && rpcData) {
        const documents = rpcData.map((doc: any) => doc.content);
        logger.info('Documentos encontrados via RPC', {
          count: documents.length,
          query: query.substring(0, 50),
          source: this.sourceFilter,
        });
        return documents;
      }

      // Fallback: busca direta com filtro
      logger.warn('Função RPC não disponível, usando busca direta');
      return await this.searchDirectWithFilter(queryEmbedding, topK);
    } catch (error) {
      logger.error('Erro ao buscar documentos', {
        error: error instanceof Error ? error.message : String(error),
        query,
      });
      return [];
    }
  }

  /**
   * Busca direta com filtro por source (fallback)
   * Usa a tabela diretamente sem RPC
   */
  private async searchDirectWithFilter(
    queryEmbedding: number[],
    topK: number
  ): Promise<string[]> {
    try {
      // Busca todos os documentos do source específico
      const { data, error } = await this.supabaseClient!
        .from('knowledge_base')
        .select('id, content, metadata, embedding')
        .filter('metadata->>source', 'eq', this.sourceFilter)
        .limit(topK * 5); // Busca mais para ter margem

      if (error) {
        logger.error('Erro na busca direta', { error: error.message });
        return [];
      }

      if (!data || data.length === 0) {
        logger.warn('Nenhum documento encontrado para o source', {
          source: this.sourceFilter,
        });
        return [];
      }

      // Calcula similaridade em memória
      const withSimilarity = data.map((doc: any) => {
        const docEmbedding = this.parseEmbedding(doc.embedding);
        const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
        return { ...doc, similarity };
      });

      // Ordena por similaridade e pega os top K
      withSimilarity.sort((a, b) => b.similarity - a.similarity);
      const topDocs = withSimilarity.slice(0, topK);

      logger.info('Documentos encontrados via busca direta', {
        count: topDocs.length,
        source: this.sourceFilter,
        topSimilarity: topDocs[0]?.similarity?.toFixed(4),
      });

      return topDocs.map((doc) => doc.content);
    } catch (error) {
      logger.error('Erro no fallback de busca', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Parseia embedding de string para array de números
   */
  private parseEmbedding(embedding: string | number[]): number[] {
    if (Array.isArray(embedding)) {
      return embedding;
    }
    // Se for string no formato "[0.1, 0.2, ...]"
    try {
      return JSON.parse(embedding);
    } catch {
      return [];
    }
  }

  /**
   * Calcula similaridade de cosseno entre dois vetores
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Retorna o cliente Supabase
   */
  getClient(): SupabaseClient | null {
    return this.supabaseClient;
  }
}
