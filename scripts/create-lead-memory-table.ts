import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  console.log('🚀 Criando tabela instagram_lead_memory...\n');

  // SQL para criar a tabela
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS instagram_lead_memory (
      id BIGSERIAL PRIMARY KEY,
      instagram_user_id TEXT NOT NULL UNIQUE,
      nome TEXT,
      concurso_interesse TEXT,
      area_interesse TEXT,
      vertical TEXT DEFAULT 'DESCONHECIDO',
      funnel_stage TEXT DEFAULT 'Etapa 1: Diagnóstico',
      interesse_nivel INTEGER DEFAULT 0,
      objecoes TEXT[] DEFAULT '{}',
      ultimo_topico TEXT,
      perguntas_feitas TEXT[] DEFAULT '{}',
      informacoes_fornecidas JSONB DEFAULT '{}',
      total_mensagens INTEGER DEFAULT 0,
      mensagens_positivas INTEGER DEFAULT 0,
      mensagens_negativas INTEGER DEFAULT 0,
      primeiro_contato TIMESTAMPTZ DEFAULT NOW(),
      ultimo_contato TIMESTAMPTZ DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'
    );
  `;

  // Tentar via RPC se existir uma função de execução SQL
  const { error: rpcError } = await supabase.rpc('exec_sql', { sql: createTableSQL });

  if (rpcError && rpcError.code !== 'PGRST202') {
    console.log('⚠️  RPC exec_sql não disponível, tentando inserção direta...\n');
  }

  // Tentar criar via inserção de teste (para verificar se a tabela existe)
  const testData = {
    instagram_user_id: '__test_creation__',
    nome: 'Test',
    vertical: 'TESTE',
    funnel_stage: 'Etapa 1: Diagnóstico',
    interesse_nivel: 0,
    objecoes: [],
    perguntas_feitas: [],
    informacoes_fornecidas: {},
    total_mensagens: 0,
    mensagens_positivas: 0,
    mensagens_negativas: 0,
    metadata: {}
  };

  const { error: insertError } = await supabase
    .from('instagram_lead_memory')
    .upsert(testData, { onConflict: 'instagram_user_id' });

  if (insertError) {
    if (insertError.code === '42P01') {
      console.log('❌ Tabela não existe e não foi possível criar automaticamente.\n');
      console.log('📋 Execute o seguinte SQL no Supabase SQL Editor:\n');
      console.log('=' .repeat(60));
      console.log(createTableSQL);
      console.log('=' .repeat(60));
      console.log('\n🔗 Acesse: https://supabase-saulo.forefy.ai (SQL Editor)');
      return false;
    }
    console.log('❌ Erro:', insertError.message);
    return false;
  }

  // Limpar registro de teste
  await supabase
    .from('instagram_lead_memory')
    .delete()
    .eq('instagram_user_id', '__test_creation__');

  console.log('✅ Tabela instagram_lead_memory está funcionando!\n');

  // Verificar estrutura
  const { data, error } = await supabase
    .from('instagram_lead_memory')
    .select('*')
    .limit(1);

  if (!error) {
    console.log('📊 Estrutura da tabela verificada com sucesso.');
    console.log('📝 Colunas disponíveis para memória de leads.');
  }

  return true;
}

createTable()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Setup completo!');
    } else {
      console.log('\n⚠️  Ação manual necessária.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('Erro fatal:', err);
    process.exit(1);
  });
