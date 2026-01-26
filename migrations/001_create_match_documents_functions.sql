-- Migração: Funções para busca de documentos similares
-- Execute este SQL no Supabase SQL Editor

-- Função 1: match_documents (busca padrão)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Função 2: match_documents_by_source (busca com filtro por source)
CREATE OR REPLACE FUNCTION match_documents_by_source(
  query_embedding vector(768),
  match_count int DEFAULT 10,
  source_filter text DEFAULT 'offerbook_forefy'
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE kb.metadata->>'source' = source_filter
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Verificar se a extensão pgvector está habilitada
-- (execute apenas se não existir)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Criar índice para melhor performance (se não existir)
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx
ON knowledge_base
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Criar índice para filtro por source
CREATE INDEX IF NOT EXISTS knowledge_base_source_idx
ON knowledge_base ((metadata->>'source'));

-- Confirmar criação
SELECT 'Funções match_documents e match_documents_by_source criadas com sucesso!' AS status;
