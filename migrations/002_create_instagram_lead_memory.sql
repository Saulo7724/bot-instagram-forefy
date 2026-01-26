-- Migração: Tabela de memória de leads do Instagram
-- Execute este SQL no Supabase SQL Editor

-- Tabela para armazenar informações persistentes dos leads
CREATE TABLE IF NOT EXISTS instagram_lead_memory (
  id BIGSERIAL PRIMARY KEY,
  instagram_user_id TEXT NOT NULL UNIQUE,

  -- Informações do Lead
  nome TEXT,
  concurso_interesse TEXT,
  area_interesse TEXT,
  vertical TEXT DEFAULT 'DESCONHECIDO',

  -- Estado do Funil
  funnel_stage TEXT DEFAULT 'Etapa 1: Diagnóstico',
  interesse_nivel INTEGER DEFAULT 0, -- 0-10
  objecoes TEXT[], -- Array de objeções identificadas

  -- Contexto da Conversa
  ultimo_topico TEXT,
  perguntas_feitas TEXT[],
  informacoes_fornecidas JSONB DEFAULT '{}',

  -- Métricas
  total_mensagens INTEGER DEFAULT 0,
  mensagens_positivas INTEGER DEFAULT 0,
  mensagens_negativas INTEGER DEFAULT 0,

  -- Timestamps
  primeiro_contato TIMESTAMPTZ DEFAULT NOW(),
  ultimo_contato TIMESTAMPTZ DEFAULT NOW(),

  -- Metadados adicionais
  metadata JSONB DEFAULT '{}'
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lead_memory_user_id ON instagram_lead_memory(instagram_user_id);
CREATE INDEX IF NOT EXISTS idx_lead_memory_vertical ON instagram_lead_memory(vertical);
CREATE INDEX IF NOT EXISTS idx_lead_memory_funnel_stage ON instagram_lead_memory(funnel_stage);
CREATE INDEX IF NOT EXISTS idx_lead_memory_ultimo_contato ON instagram_lead_memory(ultimo_contato DESC);

-- Função para atualizar o timestamp de último contato automaticamente
CREATE OR REPLACE FUNCTION update_ultimo_contato()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ultimo_contato = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar último contato
DROP TRIGGER IF EXISTS trigger_update_ultimo_contato ON instagram_lead_memory;
CREATE TRIGGER trigger_update_ultimo_contato
  BEFORE UPDATE ON instagram_lead_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_ultimo_contato();

-- Habilitar RLS (Row Level Security)
ALTER TABLE instagram_lead_memory ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso com service key
CREATE POLICY "Service role can do everything" ON instagram_lead_memory
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Confirmar criação
SELECT 'Tabela instagram_lead_memory criada com sucesso!' AS status;
