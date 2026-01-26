import { AgentExecutor, createStructuredChatAgent } from 'langchain/agents';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';
import { AzureOpenAIService } from '../integrations/azure-openai.service';
import { SupabaseVectorService } from '../integrations/supabase-vector.service';
import { SerpApiService } from '../integrations/serpapi.service';
import { MemoryManagerService } from '../integrations/memory-manager.service';
import { LeadMemoryService, LeadMemory } from '../integrations/lead-memory.service';
import { AgentOutput, AgentOutputSchema } from '../types/instagram.types';
import { agentLogger as logger } from '../utils/logger';
import { config } from '../config';

/**
 * Prompt do Sistema: Saulo Farias (Co-Founder Forefy)
 */
const SYSTEM_PROMPT = `Você é Saulo Farias, Co-Founder do Forefy e aprovado na PF aos 22 anos.

O Forefy é o "Waze da Aprovação" - uma IA que mapeia bancas e recalcula a rota de estudo diariamente.

REGRAS:
- Máximo 50 palavras por mensagem
- Português coloquial: tá, pra, bora
- Seja direto e conversacional
- Use a tool "documents" para buscar informações sobre o Forefy quando perguntarem sobre funcionalidades, preços, etc
- Use a tool "search_web" para buscar notícias de editais quando mencionarem um órgão ou concurso específico

FUNIL DE VENDAS:
1. Saudação → Pergunte qual concurso o lead mira
2. Concurso mencionado → Busque notícias relevantes e apresente o Forefy
3. Interesse → Explique: O Forefy recalcula sua rota de estudo todo dia, como um GPS da aprovação
4. Oferta → Plano Estratégico Anual por R$ 699,90 em até 12x
5. CTA → Link: https://app.forefy.ai/

SOBRE O FOREFY:
- Plataforma de IA para concurseiros
- Mapeia bancas e ajusta estudos diariamente
- Revisões automáticas e simulados personalizados
- Alertas de editais e curadoria de materiais

Responda de forma natural e ajude o lead a entender como o Forefy pode acelerar a aprovação dele.`;

/**
 * Serviço principal do AI Agent
 * Integra LangChain, Azure OpenAI, RAG, SerpAPI, Memory e Lead Memory (persistente)
 */
export class InstagramAgentService {
  private azureService: AzureOpenAIService;
  private vectorService: SupabaseVectorService;
  private serpService: SerpApiService;
  private memoryService: MemoryManagerService;
  private leadMemoryService: LeadMemoryService;
  private outputParser: StructuredOutputParser<AgentOutput>;

  constructor() {
    this.azureService = new AzureOpenAIService();
    this.vectorService = new SupabaseVectorService();
    this.serpService = new SerpApiService();
    this.memoryService = new MemoryManagerService();
    this.leadMemoryService = new LeadMemoryService();

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

      // Busca memória persistente do lead
      let leadMemory = await this.leadMemoryService.getLeadMemory(userId);
      if (!leadMemory) {
        leadMemory = this.leadMemoryService.createNewMemory(userId);
      }

      // Gera contexto do lead para o prompt
      const leadContext = this.buildLeadContext(leadMemory);

      // Cria as tools
      const tools = await this.createTools();

      // Cria o modelo
      const model = this.azureService.createAgentModel();

      // Obtém memória de conversa do usuário
      const conversationMemory = this.memoryService.getMemory(userId);

      // Cria o prompt com contexto do lead
      const systemMessage = `${SYSTEM_PROMPT}

${leadContext}

IMPORTANTE: Responda de forma natural e conversacional. Sua resposta deve ser curta (max 20 palavras).

Você tem acesso às seguintes ferramentas:
{tools}

Para usar uma ferramenta, use o seguinte formato JSON:
\`\`\`json
{{
  "action": "nome_da_ferramenta",
  "action_input": {{"query": "sua busca aqui"}}
}}
\`\`\`

Quando tiver a resposta final, use:
\`\`\`json
{{
  "action": "Final Answer",
  "action_input": "sua resposta aqui"
}}
\`\`\`

Ferramentas disponíveis: {tool_names}`;

      const prompt = ChatPromptTemplate.fromMessages([
        ['system', systemMessage],
        ['placeholder', '{chat_history}'],
        ['human', '{input}'],
        ['assistant', '{agent_scratchpad}'],
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
        memory: conversationMemory,
        verbose: config.nodeEnv === 'development',
        maxIterations: 5,
        returnIntermediateSteps: false,
        handleParsingErrors: true,
      });

      // Executa o agent
      const result = await executor.invoke({
        input: message,
      });

      logger.info('Agent executado com sucesso', { userId });

      // Parseia a resposta
      const parsedOutput = await this.parseAgentOutput(result.output);

      // Atualiza memória persistente do lead
      await this.updateLeadMemory(userId, message, parsedOutput, leadMemory);

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
   * Constrói o contexto do lead para o prompt
   */
  private buildLeadContext(leadMemory: LeadMemory): string {
    const parts: string[] = ['CONTEXTO DO LEAD (informações já coletadas):'];

    if (leadMemory.nome) {
      parts.push(`- Nome: ${leadMemory.nome}`);
    }
    if (leadMemory.concurso_interesse) {
      parts.push(`- Concurso de interesse: ${leadMemory.concurso_interesse}`);
    }
    if (leadMemory.area_interesse) {
      parts.push(`- Área de interesse: ${leadMemory.area_interesse}`);
    }
    if (leadMemory.vertical !== 'DESCONHECIDO') {
      parts.push(`- Vertical: ${leadMemory.vertical}`);
    }
    parts.push(`- Estágio atual do funil: ${leadMemory.funnel_stage}`);
    parts.push(`- Total de interações: ${leadMemory.total_mensagens}`);

    if (leadMemory.objecoes.length > 0) {
      parts.push(`- Objeções identificadas: ${leadMemory.objecoes.join(', ')}`);
    }
    if (leadMemory.ultimo_topico) {
      parts.push(`- Último tópico discutido: ${leadMemory.ultimo_topico}`);
    }

    if (parts.length === 1) {
      return 'CONTEXTO DO LEAD: Primeiro contato. Colete informações básicas.';
    }

    return parts.join('\n');
  }

  /**
   * Atualiza a memória persistente do lead com base na conversa
   */
  private async updateLeadMemory(
    userId: string,
    userMessage: string,
    agentOutput: AgentOutput,
    currentMemory: LeadMemory
  ): Promise<void> {
    try {
      const updates: Partial<LeadMemory> = {
        funnel_stage: agentOutput.current_funnel_stage,
        ultimo_topico: userMessage.substring(0, 100),
      };

      // Atualiza vertical se identificada
      if (agentOutput.identified_vertical !== 'DESCONHECIDO') {
        updates.vertical = agentOutput.identified_vertical;
      }

      // Extrai informações da mensagem do usuário
      const extractedInfo = this.extractInfoFromMessage(userMessage);

      if (extractedInfo.concurso) {
        updates.concurso_interesse = extractedInfo.concurso;
      }
      if (extractedInfo.nome) {
        updates.nome = extractedInfo.nome;
      }
      if (extractedInfo.area) {
        updates.area_interesse = extractedInfo.area;
      }

      // Detecta objeções
      const objection = this.detectObjection(userMessage);
      if (objection && !currentMemory.objecoes.includes(objection)) {
        updates.objecoes = [...currentMemory.objecoes, objection];
      }

      // Salva atualizações
      await this.leadMemoryService.updateLeadMemory(userId, updates);

      logger.debug('Memória do lead atualizada', {
        userId,
        updates: Object.keys(updates),
      });
    } catch (error) {
      logger.error('Erro ao atualizar memória do lead', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Extrai informações relevantes da mensagem do usuário
   */
  private extractInfoFromMessage(message: string): {
    nome?: string;
    concurso?: string;
    area?: string;
  } {
    const result: { nome?: string; concurso?: string; area?: string } = {};
    const lowerMessage = message.toLowerCase();

    // Detecta concursos mencionados
    const concursos = [
      'polícia federal', 'pf', 'receita federal', 'rf', 'inss', 'ibge',
      'banco do brasil', 'bb', 'caixa', 'cef', 'trt', 'tre', 'trf',
      'tj', 'mp', 'ministério público', 'defensoria', 'oab', 'enem',
      'medicina', 'residência', 'prf', 'pm', 'pc', 'polícia civil',
      'polícia militar', 'bombeiro', 'agente', 'escrivão', 'delegado',
      'auditor', 'fiscal', 'analista', 'técnico'
    ];

    for (const concurso of concursos) {
      if (lowerMessage.includes(concurso)) {
        result.concurso = concurso.toUpperCase();
        break;
      }
    }

    // Detecta áreas
    const areas = [
      { pattern: /fiscal|tribut/i, area: 'FISCAL' },
      { pattern: /polic|segurança/i, area: 'POLICIAL' },
      { pattern: /tribunal|jur[íi]dic/i, area: 'TRIBUNAIS' },
      { pattern: /saúde|médic|enferm/i, area: 'SAÚDE' },
      { pattern: /admin|gest[ãa]o/i, area: 'ADMINISTRATIVA' },
      { pattern: /banco|financ/i, area: 'BANCÁRIA' },
    ];

    for (const { pattern, area } of areas) {
      if (pattern.test(message)) {
        result.area = area;
        break;
      }
    }

    // Detecta nome (padrões comuns de apresentação)
    const nomeMatch = message.match(/(?:me chamo|meu nome [ée]|sou o?a?\s*)([A-ZÁÉÍÓÚÂÊÎÔÛÃ][a-záéíóúâêîôûã]+)/i);
    if (nomeMatch) {
      result.nome = nomeMatch[1];
    }

    return result;
  }

  /**
   * Detecta objeções na mensagem do usuário
   */
  private detectObjection(message: string): string | null {
    const lowerMessage = message.toLowerCase();

    const objections = [
      { pattern: /caro|preço|dinheiro|pagar|valor/i, type: 'PREÇO' },
      { pattern: /tempo|ocupado|não consigo|difícil/i, type: 'TEMPO' },
      { pattern: /funciona|resultado|serve/i, type: 'EFICÁCIA' },
      { pattern: /pensar|depois|mais tarde|agora não/i, type: 'ADIAMENTO' },
      { pattern: /confi|segur|garanti/i, type: 'CONFIANÇA' },
    ];

    for (const { pattern, type } of objections) {
      if (pattern.test(lowerMessage)) {
        return type;
      }
    }

    return null;
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
        try {
          const json = JSON.parse(jsonMatch[0]);
          return AgentOutputSchema.parse(json);
        } catch {
          // Continua para fallback final
        }
      }

      // Fallback final: retorna resposta básica conversacional
      // Limpa o output de mensagens de erro do sistema
      let cleanOutput = output;
      if (output.includes('Agent stopped') || output.includes('max iterations')) {
        cleanOutput = 'E aí! Qual concurso você tá mirando? Posso te ajudar a traçar a rota!';
      } else if (output.length > 100) {
        cleanOutput = output.substring(0, 100);
      }

      return {
        current_funnel_stage: 'Etapa 1: Diagnóstico',
        identified_vertical: 'DESCONHECIDO',
        search_required: false,
        response_message: cleanOutput,
      };
    }
  }

  /**
   * Limpa a memória de um usuário (conversa e persistente)
   */
  async clearUserMemory(userId: string): Promise<void> {
    await this.memoryService.clearMemory(userId);
    // Nota: não limpamos a memória persistente do lead,
    // apenas a memória de conversa
  }

  /**
   * Obtém a memória persistente de um lead
   */
  async getLeadMemory(userId: string): Promise<LeadMemory | null> {
    return await this.leadMemoryService.getLeadMemory(userId);
  }
}
