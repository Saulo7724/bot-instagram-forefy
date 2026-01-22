/**
 * Script para testar o Bot localmente sem precisar do Instagram
 *
 * Para usar:
 * 1. Configure o .env com todas as credenciais
 * 2. Execute: npm run dev (em um terminal)
 * 3. Execute: npx tsx scripts/test-local.ts (em outro terminal)
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testBot() {
  console.log('🧪 Testando Bot Instagram Forefy localmente...\n');

  // 1. Health Check
  console.log('1️⃣ Testando health check...');
  try {
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check OK:', healthResponse.data);
  } catch (error) {
    console.error('❌ Health check falhou:', error);
    return;
  }

  // 2. Validar Token Instagram
  console.log('\n2️⃣ Validando token do Instagram...');
  try {
    const tokenResponse = await axios.get(`${BASE_URL}/api/instagram/validate-token`);
    console.log(tokenResponse.data.valid ? '✅ Token válido' : '❌ Token inválido');
    console.log('Resposta:', tokenResponse.data);
  } catch (error: any) {
    console.error('❌ Erro ao validar token:', error.response?.data || error.message);
  }

  // 3. Testar Agent diretamente
  console.log('\n3️⃣ Testando AI Agent...');
  try {
    const agentResponse = await axios.post(`${BASE_URL}/api/instagram/test-agent`, {
      userId: 'test-user-123',
      message: 'Olá! Quero saber sobre o Forefy para concurso da Polícia Federal',
    });

    console.log('✅ Agent respondeu:');
    console.log('Etapa do Funil:', agentResponse.data.output.current_funnel_stage);
    console.log('Vertical:', agentResponse.data.output.identified_vertical);
    console.log('Busca Web Necessária?', agentResponse.data.output.search_required);
    console.log('Resposta:', agentResponse.data.output.response_message);
  } catch (error: any) {
    console.error('❌ Erro no Agent:', error.response?.data || error.message);
  }

  // 4. Testar segunda mensagem (verifica memória)
  console.log('\n4️⃣ Testando memória (segunda mensagem)...');
  try {
    const agentResponse2 = await axios.post(`${BASE_URL}/api/instagram/test-agent`, {
      userId: 'test-user-123',
      message: 'Sim, me interessa. Quanto custa?',
    });

    console.log('✅ Agent respondeu (com memória):');
    console.log('Etapa do Funil:', agentResponse2.data.output.current_funnel_stage);
    console.log('Resposta:', agentResponse2.data.output.response_message);
  } catch (error: any) {
    console.error('❌ Erro no Agent:', error.response?.data || error.message);
  }

  // 5. Limpar memória
  console.log('\n5️⃣ Limpando memória do usuário teste...');
  try {
    const clearResponse = await axios.post(`${BASE_URL}/api/instagram/clear-memory`, {
      userId: 'test-user-123',
    });
    console.log('✅ Memória limpa:', clearResponse.data);
  } catch (error: any) {
    console.error('❌ Erro ao limpar memória:', error.response?.data || error.message);
  }

  console.log('\n✅ Testes concluídos!');
}

// Executa testes
testBot().catch(console.error);
