import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Interface para resultado do SerpAPI
 */
export interface SerpApiResult {
  title: string;
  link: string;
  snippet: string;
  position?: number;
}

/**
 * Serviço para busca de notícias e informações via SerpAPI
 * Usado para verificar editais, vagas e notícias de concursos
 */
export class SerpApiService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://serpapi.com/search';

  constructor() {
    this.apiKey = config.serpApi.apiKey;
  }

  /**
   * Realiza busca no Google via SerpAPI
   */
  async search(query: string, numResults: number = 5): Promise<string> {
    try {
      logger.info('Realizando busca no SerpAPI', { query, numResults });

      const response = await axios.get(this.baseUrl, {
        params: {
          q: query,
          api_key: this.apiKey,
          engine: 'google',
          gl: config.serpApi.gl,
          hl: config.serpApi.hl,
          google_domain: config.serpApi.googleDomain,
          num: numResults,
        },
        timeout: 10000,
      });

      const results: SerpApiResult[] = response.data.organic_results || [];

      if (results.length === 0) {
        logger.warn('Nenhum resultado encontrado', { query });
        return 'Nenhum resultado encontrado para esta busca.';
      }

      // Formata os resultados em texto estruturado
      const formattedResults = this.formatResults(results);

      logger.info('Busca realizada com sucesso', {
        query,
        resultsCount: results.length,
      });

      return formattedResults;
    } catch (error) {
      logger.error('Erro ao realizar busca no SerpAPI', {
        error: error instanceof Error ? error.message : String(error),
        query,
      });
      return 'Erro ao buscar informações. Tente novamente mais tarde.';
    }
  }

  /**
   * Busca específica para notícias de concursos
   */
  async searchConcursoNews(
    orgao: string,
    ano: number = new Date().getFullYear()
  ): Promise<string> {
    const query = `concurso ${orgao} ${ano} edital vagas autorização`;
    return this.search(query, 3);
  }

  /**
   * Formata resultados para texto legível
   */
  private formatResults(results: SerpApiResult[]): string {
    const lines = results.map((result, index) => {
      return `${index + 1}. ${result.title}\n   ${result.snippet}\n   Link: ${result.link}`;
    });

    return `Resultados da busca:\n\n${lines.join('\n\n')}`;
  }

  /**
   * Valida se a API key está configurada
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
