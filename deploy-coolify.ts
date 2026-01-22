#!/usr/bin/env ts-node
/**
 * Script para deploy automático no Coolify
 *
 * Este script:
 * 1. Cria a aplicação no Coolify via API
 * 2. Configura as variáveis de ambiente
 * 3. Dispara o deploy
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Carregar .env
dotenv.config();

const COOLIFY_URL = process.env.COOLIFY_URL || 'https://coolify.forefy.ai';
const COOLIFY_TOKEN = process.env.COOLIFY_TOKEN;
const PROJECT_UUID = 'v40kg0ks0osk484sco80oc0c'; // Saulo-Projects
const ENV_UUID = 'e4wkwscks408s0ogsow48gso'; // production
const SERVER_UUID = 'lkcgsswgw4g0woo0c4soo08w'; // localhost

interface CoolifyResponse {
  uuid?: string;
  message?: string;
  [key: string]: any;
}

async function createApplication(): Promise<string> {
  console.log('📦 Criando aplicação no Coolify...');

  const payload = {
    project_uuid: PROJECT_UUID,
    environment_name: 'production',
    server_uuid: SERVER_UUID,
    destination_uuid: 'auto',
    type: 'public',
    name: 'bot-instagram-forefy',
    description: 'Bot Instagram Forefy - Agente de IA com RAG',
    git_repository: 'https://github.com/Saulo7724/bot-instagram-forefy',
    git_branch: 'main',
    build_pack: 'dockerfile',
    ports_exposes: '3000',
    fqdn: 'bot.forefy.ai',
  };

  try {
    const response = await fetch(`${COOLIFY_URL}/api/v1/applications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COOLIFY_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: CoolifyResponse = await response.json();

    if (!response.ok) {
      throw new Error(`Erro ao criar aplicação: ${JSON.stringify(data)}`);
    }

    console.log('✅ Aplicação criada:', data);
    return data.uuid || '';
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

async function setEnvironmentVariables(appUuid: string): Promise<void> {
  console.log('\n🔐 Configurando variáveis de ambiente...');

  const envVars = {
    NODE_ENV: 'production',
    PORT: '3000',
    INSTAGRAM_ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN,
    INSTAGRAM_APP_SECRET: process.env.INSTAGRAM_APP_SECRET,
    INSTAGRAM_VERIFY_TOKEN: process.env.INSTAGRAM_VERIFY_TOKEN,
    AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_EMBEDDINGS_API_KEY: process.env.AZURE_OPENAI_EMBEDDINGS_API_KEY,
    AZURE_OPENAI_EMBEDDINGS_ENDPOINT: process.env.AZURE_OPENAI_EMBEDDINGS_ENDPOINT,
    AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT_NAME,
    AZURE_OPENAI_EMBEDDINGS_API_VERSION: process.env.AZURE_OPENAI_EMBEDDINGS_API_VERSION,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    SERPAPI_API_KEY: process.env.SERPAPI_API_KEY,
    LOG_LEVEL: 'info',
  };

  try {
    const response = await fetch(`${COOLIFY_URL}/api/v1/applications/${appUuid}/envs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COOLIFY_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(envVars),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Erro ao configurar variáveis: ${JSON.stringify(data)}`);
    }

    console.log('✅ Variáveis configuradas');
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

async function deployApplication(appUuid: string): Promise<void> {
  console.log('\n🚀 Iniciando deploy...');

  try {
    const response = await fetch(`${COOLIFY_URL}/api/v1/applications/${appUuid}/deploy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${COOLIFY_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Erro ao fazer deploy: ${JSON.stringify(data)}`);
    }

    console.log('✅ Deploy iniciado:', data);
    console.log('\n📊 Acompanhe o deploy em:');
    console.log(`   ${COOLIFY_URL}/project/${PROJECT_UUID}/${ENV_UUID}/application/${appUuid}`);
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

async function main() {
  console.log('🤖 Bot Instagram Forefy - Deploy Automático\n');

  if (!COOLIFY_TOKEN) {
    console.error('❌ COOLIFY_TOKEN não encontrado no .env');
    process.exit(1);
  }

  try {
    // 1. Criar aplicação
    const appUuid = await createApplication();

    if (!appUuid) {
      throw new Error('UUID da aplicação não foi retornado');
    }

    // 2. Configurar variáveis
    await setEnvironmentVariables(appUuid);

    // 3. Deploy
    await deployApplication(appUuid);

    console.log('\n✅ Deploy concluído com sucesso!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Aguarde o build (2-3 min)');
    console.log('   2. Teste: curl https://bot.forefy.ai/health');
    console.log('   3. Configure webhook no Meta com URL: https://bot.forefy.ai/api/instagram/webhook');
  } catch (error) {
    console.error('\n❌ Deploy falhou:', error);
    process.exit(1);
  }
}

main();
