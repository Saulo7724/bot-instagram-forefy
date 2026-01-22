import { AgentExecutor, createStructuredChatAgent } from 'langchain/agents';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';
import { AzureOpenAIService } from '../integrations/azure-openai.service';
import { SupabaseVectorService } from '../integrations/supabase-vector.service';
import { SerpApiService } from '../integrations/serpapi.service';
import { MemoryManagerService } from '../integrations/memory-manager.service';
import { AgentOutput, AgentOutputSchema } from '../types/instagram.types';
import { agentLogger as logger } from '../utils/logger';
import { config } from '../config';

/**
 * Prompt do Sistema: Saulo Farias (Co-Founder Forefy)
 */
const SYSTEM_PROMPT = `Você é Saulo Farias, Co-Founder do Forefy e aprovado na PF aos 22 anos.

O Forefy é o "Waze da Aprovação" - uma IA que mapeia bancas e recalcula a rota de estudo diariamente.

REGRAS CRÍTICAS:
- Máximo 20 palavras por mensagem
- Português coloquial: tá, pra, bora
- Sempre pergunte qual concurso o lead quer
- Use a tool search_web para buscar notícias de editais quando o lead mencionar um órgão
- Use a tool documents para buscar informações sobre o Forefy

FUNIL DE VENDAS:
1. Pergunte: Qual concurso você mira?
2. Se mencionar concurso: busque notícias com search_web
3. Apresente: O Forefy recalcula sua rota todo dia. É o Waze da aprovação.
4. Oferta: Plano Estratégico Anual por R$ 699,90
5. Link: https://app.forefy.ai/

Responda de forma visceral e direta. Máximo 20 palavras sempre.`;

/**
 * Serviço principal do AI Agent
 * Integra LangChain, Azure OpenAI, RAG, SerpAPI e Memory
 */
export class InstagramAgentService {
  private azureService: AzureOpenAIService;
  private vectorService: SupabaseVectorService;
  private serpService: SerpApiService;
  private memoryService: MemoryManagerService;
  private outputParser: StructuredOutputParser<AgentOutput>;

  constructor() {
    this.azureService = new AzureOpenAIService();
    this.vectorService = new SupabaseVectorService();
    this.serpService = new SerpApiService();
    this.memoryService = new MemoryManagerService();

    // Configura o output parser estruturado
    this.outputParser = StructuredOutputParser.fromZodSchema(AgentOutputSchema);
  }

  /**
   * Inicializa o Agent (carrega Vector Store)
   */
  async initialize(): Promise<void> {
    logger.info('Inicializando Instagram Agent Service');
    await this.vectorService.initialize();
    logger.info('Instagram Agent Service inicializado');
  }

  /**
   * Processa uma mensagem e retorna a resposta estruturada
   */
  async processMessage(
    userId: string,
    message: string
  ): Promise<AgentOutput> {
    try {
      logger.info('Processando mensagem', { userId, messageLength: message.length });

      // Cria as tools
      const tools = await this.createTools();

      // Cria o modelo
      const model = this.azureService.createAgentModel();

      // Obtém memória do usuário
      const memory = this.memoryService.getMemory(userId);

      // Cria o prompt com instruções de formato
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', SYSTEM_PROMPT],
        ['system', `IMPORTANTE: Retorne JSON com: current_funnel_stage, identified_vertical, search_required, response_message (max 20 palavras)

Você tem acesso a estas tools: {tools}
Tool names: {tool_names}`],
        ['placeholder', '{chat_history}'],
        ['human', '{input}'],
        ['placeholder', '{agent_scratchpad}'],
      ]);

      // Cria o agent
      const agent = await createStructuredChatAgent({
        llm: model,
        tools,
        prompt,
      });

      // Cria o executor
      const executor = AgentExecutor.fromAgentAndTools({
        agent,
        tools,
        memory,
        verbose: config.nodeEnv === 'development',
        maxIterations: 10,
        returnIntermediateSteps: false,
      });

      // Executa o agent
      const result = await executor.invoke({
        input: message,
      });

      logger.info('Agent executado com sucesso', { userId });

      // Parseia a resposta
      const parsedOutput = await this.parseAgentOutput(result.output);

      logger.info('Resposta estruturada gerada', {
        userId,
        stage: parsedOutput.current_funnel_stage,
        vertical: parsedOutput.identified_vertical,
      });

      return parsedOutput;
    } catch (error) {
      logger.error('Erro ao processar mensagem no Agent', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Cria as tools disponíveis para o Agent
   */
  private async createTools(): Promise<DynamicStructuredTool[]> {
    const tools: DynamicStructuredTool[] = [];

    // Tool 1: Vector Store RAG (documents)
    const vectorStoreTool = new DynamicStructuredTool({
      name: 'documents',
      description: `Base vetorial Forefy: conhecimento curado sobre o produto Forefy (preparação para concursos). Contém: promessa central; posicionamento; públicos/avatares e dores (tribunais, carreiras policiais, área fiscal, concursos gerais, metodologia de estudo); benefícios chave (planos diários por banca/área, revisões automáticas e simulados, curadoria de materiais e insights virais do nicho, alertas de editais e gaps de autoridade); diferenciais/metodologia (organização por edital, trilhas semana a semana, revisão espaçada, foco em banca); objeções comuns e respostas; modos de uso recomendados; resultados esperados; linguagem/gatilhos e mensagens alinhadas ao Offerbook Forefy. Use SEMPRE que a pergunta do cliente for sobre o Forefy — funcionalidades, benefícios, preços/opções de plano, modo de uso, efeitos e qualquer detalhe específico do Forefy.`,
      schema: z.object({
        query: z.string().describe('A pergunta ou termo de busca'),
      }),
      func: async (input: any) => {
        // Aceita tanto string quanto objeto
        const query = typeof input === 'string' ? input : input.query;
        logger.debug('Executando RAG search', { query });
        const results = await this.vectorService.searchSimilarDocuments(query);
        return results.join('\n\n');
      },
    });

    tools.push(vectorStoreTool);

    // Tool 2: SerpAPI (search_web)
    const searchTool = new DynamicStructuredTool({
      name: 'search_web',
      description: 'Busca informações atualizadas na web sobre editais, vagas, autorizações de concursos, notícias recentes sobre órgãos públicos, OAB, ENEM, vestibulares e outros temas relevantes para concurseiros.',
      schema: z.object({
        query: z.string().describe('A query de busca'),
      }),
      func: async (input: any) => {
        // Aceita tanto string quanto objeto
        const query = typeof input === 'string' ? input : input.query;
        logger.debug('Executando web search', { query });
        return await this.serpService.search(query);
      },
    });

    tools.push(searchTool);

    return tools;
  }

  /**
   * Parseia a saída do Agent (lida com diferentes formatos)
   */
  private async parseAgentOutput(output: string): Promise<AgentOutput> {
    try {
      // Tenta parsear diretamente
      const parsed = await this.outputParser.parse(output);
      return parsed;
    } catch (error) {
      logger.warn('Falha ao parsear output estruturado, usando fallback', {
        output: output.substring(0, 200),
      });

      // Fallback: extrai JSON manualmente
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const json = JSON.parse(jsonMatch[0]);
        return AgentOutputSchema.parse(json);
      }

      // Fallback final: retorna resposta básica
      return {
        current_funnel_stage: 'Etapa 1: Diagnóstico',
        identified_vertical: 'DESCONHECIDO',
        search_required: false,
        response_message: output.substring(0, 100),
      };
    }
  }

  /**
   * Limpa a memória de um usuário
   */
  async clearUserMemory(userId: string): Promise<void> {
    await this.memoryService.clearMemory(userId);
  }
}
