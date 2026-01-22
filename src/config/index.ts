import dotenv from 'dotenv';

dotenv.config();

/**
 * Configurações centralizadas da aplicação
 */
export const config = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Instagram
  instagram: {
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
    appSecret: process.env.INSTAGRAM_APP_SECRET || '',
    verifyToken: process.env.INSTAGRAM_VERIFY_TOKEN || '',
    apiVersion: 'v23.0',
    baseUrl: 'https://graph.instagram.com',
  },

  // Azure OpenAI (Agent)
  azureOpenAI: {
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
  },

  // Azure OpenAI (Embeddings)
  azureOpenAIEmbeddings: {
    apiKey: process.env.AZURE_OPENAI_EMBEDDINGS_API_KEY || '',
    endpoint: process.env.AZURE_OPENAI_EMBEDDINGS_ENDPOINT || '',
    deploymentName:
      process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT_NAME ||
      'text_embedding_ada_002_azure_open_ai',
    apiVersion:
      process.env.AZURE_OPENAI_EMBEDDINGS_API_VERSION || '2024-02-15-preview',
  },

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    knowledgeBaseTable: 'knowledge_base',
  },

  // SerpAPI
  serpApi: {
    apiKey: process.env.SERPAPI_API_KEY || '',
    gl: 'br',
    hl: 'pt',
    googleDomain: 'google.com',
  },

  // Agent
  agent: {
    contextWindowLength: 10,
    vectorStoreTopK: 20,
    maxResponseWords: 20,
    timeout: 30000, // 30 segundos
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Forefy
  forefy: {
    appUrl: 'https://app.forefy.ai/',
  },
};

/**
 * Valida se todas as variáveis essenciais estão configuradas
 */
export function validateConfig(): void {
  const required = [
    'INSTAGRAM_ACCESS_TOKEN',
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_ENDPOINT',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'SERPAPI_API_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}
