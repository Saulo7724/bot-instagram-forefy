import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Interface para dados do lead
 */
export interface LeadMemory {
  instagram_user_id: string;
  nome?: string;
  concurso_interesse?: string;
  area_interesse?: string;
  vertical: string;
  funnel_stage: string;
  interesse_nivel: number;
  objecoes: string[];
  ultimo_topico?: string;
  perguntas_feitas: string[];
  informacoes_fornecidas: Record<string, any>;
  total_mensagens: number;
  mensagens_positivas: number;
  mensagens_negativas: number;
  primeiro_contato?: string;
  ultimo_contato?: string;
  metadata: Record<string, any>;
}

/**
 * Serviço de memória persistente para leads do Instagram
 * Armazena informações capturadas pelo agente para manter contexto entre sessões
 */
export class LeadMemoryService {
  private supabaseClient: SupabaseClient;
  private localCache: Map<string, LeadMemory> = new Map();
  private tableExists: boolean | null = null;
  private readonly tableName = 'instagram_lead_memory';

  constructor() {
    this.supabaseClient = createClient(
      config.supabase.url,
      config.supabase.serviceKey
    );
  }

  /**
   * Verifica se a tabela existe no Supabase
   */
  private async checkTableExists(): Promise<boolean> {
    if (this.tableExists !== null) {
      return this.tableExists;
    }

    try {
      const { error } = await this.supabaseClient
        .from(this.tableName)
        .select('id')
        .limit(1);

      this.tableExists = !error || error.code !== '42P01';

      if (!this.tableExists) {
        logger.warn('Tabela instagram_lead_memory não existe. Usando cache local.');
      }

      return this.tableExists;
    } catch {
      this.tableExists = false;
      return false;
    }
  }

  /**
   * Busca memória de um lead pelo ID do Instagram
   */
  async getLeadMemory(instagramUserId: string): Promise<LeadMemory | null> {
    // Primeiro verifica cache local
    if (this.localCache.has(instagramUserId)) {
      return this.localCache.get(instagramUserId)!;
    }

    // Tenta buscar do Supabase
    if (await this.checkTableExists()) {
      try {
        const { data, error } = await this.supabaseClient
          .from(this.tableName)
          .select('*')
          .eq('instagram_user_id', instagramUserId)
          .single();

        if (!error && data) {
          const memory = this.mapToLeadMemory(data);
          this.localCache.set(instagramUserId, memory);
          return memory;
        }
      } catch (error) {
        logger.error('Erro ao buscar memória do lead', {
          error: error instanceof Error ? error.message : String(error),
          instagramUserId,
        });
      }
    }

    return null;
  }

  /**
   * Salva ou atualiza memória de um lead
   */
  async saveLeadMemory(memory: LeadMemory): Promise<void> {
    // Atualiza cache local
    this.localCache.set(memory.instagram_user_id, memory);

    // Tenta salvar no Supabase
    if (await this.checkTableExists()) {
      try {
        const { error } = await this.supabaseClient
          .from(this.tableName)
          .upsert({
            instagram_user_id: memory.instagram_user_id,
            nome: memory.nome,
            concurso_interesse: memory.concurso_interesse,
            area_interesse: memory.area_interesse,
            vertical: memory.vertical,
            funnel_stage: memory.funnel_stage,
            interesse_nivel: memory.interesse_nivel,
            objecoes: memory.objecoes,
            ultimo_topico: memory.ultimo_topico,
            perguntas_feitas: memory.perguntas_feitas,
            informacoes_fornecidas: memory.informacoes_fornecidas,
            total_mensagens: memory.total_mensagens,
            mensagens_positivas: memory.mensagens_positivas,
            mensagens_negativas: memory.mensagens_negativas,
            metadata: memory.metadata,
          }, {
            onConflict: 'instagram_user_id',
          });

        if (error) {
          logger.error('Erro ao salvar memória do lead', {
            error: error.message,
            instagramUserId: memory.instagram_user_id,
          });
        } else {
          logger.debug('Memória do lead salva com sucesso', {
            instagramUserId: memory.instagram_user_id,
            funnelStage: memory.funnel_stage,
          });
        }
      } catch (error) {
        logger.error('Erro ao salvar memória do lead', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Cria uma nova memória para um lead
   */
  createNewMemory(instagramUserId: string): LeadMemory {
    return {
      instagram_user_id: instagramUserId,
      vertical: 'DESCONHECIDO',
      funnel_stage: 'Etapa 1: Diagnóstico',
      interesse_nivel: 0,
      objecoes: [],
      perguntas_feitas: [],
      informacoes_fornecidas: {},
      total_mensagens: 0,
      mensagens_positivas: 0,
      mensagens_negativas: 0,
      metadata: {},
    };
  }

  /**
   * Atualiza campos específicos da memória
   */
  async updateLeadMemory(
    instagramUserId: string,
    updates: Partial<LeadMemory>
  ): Promise<LeadMemory> {
    let memory = await this.getLeadMemory(instagramUserId);

    if (!memory) {
      memory = this.createNewMemory(instagramUserId);
    }

    // Aplica as atualizações
    const updatedMemory: LeadMemory = {
      ...memory,
      ...updates,
      instagram_user_id: instagramUserId, // Garantir que não muda
      total_mensagens: memory.total_mensagens + 1,
    };

    await this.saveLeadMemory(updatedMemory);
    return updatedMemory;
  }

  /**
   * Incrementa contadores de mensagens
   */
  async incrementMessageCount(
    instagramUserId: string,
    sentiment: 'positive' | 'negative' | 'neutral'
  ): Promise<void> {
    const memory = await this.getLeadMemory(instagramUserId);
    if (!memory) return;

    if (sentiment === 'positive') {
      memory.mensagens_positivas++;
    } else if (sentiment === 'negative') {
      memory.mensagens_negativas++;
    }

    await this.saveLeadMemory(memory);
  }

  /**
   * Gera resumo da memória para contexto do agente
   */
  getMemorySummary(memory: LeadMemory): string {
    const parts: string[] = [];

    if (memory.nome) {
      parts.push(`Nome: ${memory.nome}`);
    }
    if (memory.concurso_interesse) {
      parts.push(`Concurso de interesse: ${memory.concurso_interesse}`);
    }
    if (memory.area_interesse) {
      parts.push(`Área: ${memory.area_interesse}`);
    }
    if (memory.vertical !== 'DESCONHECIDO') {
      parts.push(`Vertical: ${memory.vertical}`);
    }
    parts.push(`Estágio do funil: ${memory.funnel_stage}`);
    parts.push(`Total de mensagens: ${memory.total_mensagens}`);

    if (memory.objecoes.length > 0) {
      parts.push(`Objeções: ${memory.objecoes.join(', ')}`);
    }
    if (memory.ultimo_topico) {
      parts.push(`Último tópico: ${memory.ultimo_topico}`);
    }

    return parts.join('\n');
  }

  /**
   * Mapeia dados do banco para o tipo LeadMemory
   */
  private mapToLeadMemory(data: any): LeadMemory {
    return {
      instagram_user_id: data.instagram_user_id,
      nome: data.nome,
      concurso_interesse: data.concurso_interesse,
      area_interesse: data.area_interesse,
      vertical: data.vertical || 'DESCONHECIDO',
      funnel_stage: data.funnel_stage || 'Etapa 1: Diagnóstico',
      interesse_nivel: data.interesse_nivel || 0,
      objecoes: data.objecoes || [],
      ultimo_topico: data.ultimo_topico,
      perguntas_feitas: data.perguntas_feitas || [],
      informacoes_fornecidas: data.informacoes_fornecidas || {},
      total_mensagens: data.total_mensagens || 0,
      mensagens_positivas: data.mensagens_positivas || 0,
      mensagens_negativas: data.mensagens_negativas || 0,
      primeiro_contato: data.primeiro_contato,
      ultimo_contato: data.ultimo_contato,
      metadata: data.metadata || {},
    };
  }

  /**
   * Lista todos os leads ativos (últimas 24 horas)
   */
  async getActiveLeads(hoursAgo: number = 24): Promise<LeadMemory[]> {
    if (!(await this.checkTableExists())) {
      return Array.from(this.localCache.values());
    }

    try {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - hoursAgo);

      const { data, error } = await this.supabaseClient
        .from(this.tableName)
        .select('*')
        .gte('ultimo_contato', cutoff.toISOString())
        .order('ultimo_contato', { ascending: false });

      if (error) {
        logger.error('Erro ao buscar leads ativos', { error: error.message });
        return [];
      }

      return (data || []).map(this.mapToLeadMemory);
    } catch (error) {
      logger.error('Erro ao buscar leads ativos', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}
