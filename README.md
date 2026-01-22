# 🤖 Bot Instagram Forefy

Bot de resposta automática para Direct Messages do Instagram, utilizando IA (Azure OpenAI GPT-4o) com RAG (Retrieval-Augmented Generation) e memória de conversação.

## 📋 Descrição

Este bot replica o fluxo do n8n `[Agente_Instagram_Forefy]` em código TypeScript puro, transformando o Saulo Farias (Co-Founder Forefy) em um agente de vendas consultivo que converte leads em assinantes através do método LightCopy.

### **Funcionalidades Principais**

- ✅ Recebe mensagens do Instagram via Webhook
- ✅ Processa com AI Agent (LangChain + GPT-4o)
- ✅ Busca conhecimento curado na Knowledge Base (Supabase Vector Store)
- ✅ Pesquisa notícias de editais/concursos (SerpAPI)
- ✅ Mantém contexto de conversação (Window Buffer Memory - 10 mensagens)
- ✅ Responde com mensagens curtas e viscerais (máx 20 palavras)
- ✅ **CORRIGIDO**: Envia respostas robustas com retry logic

---

## 🏗️ Arquitetura

```
┌─────────────┐
│  Instagram  │
│   Webhook   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Parser         │  ← Extrai dados da mensagem
└─────────┬───────┘
          │
          ▼
┌──────────────────────────┐
│     AI Agent Service     │
│  ┌────────────────────┐  │
│  │  GPT-4o (Azure)    │  │
│  │  + LangChain       │  │
│  └────────────────────┘  │
│           │              │
│     ┌─────┴─────┐        │
│     ▼           ▼        │
│  ┌────┐     ┌────────┐  │
│  │RAG │     │SerpAPI │  │
│  │KB  │     │Search  │  │
│  └────┘     └────────┘  │
│     +                    │
│  ┌─────────────┐         │
│  │   Memory    │         │
│  │  (10 msgs)  │         │
│  └─────────────┘         │
└───────────┬──────────────┘
            │
            ▼
┌───────────────────────┐
│  Instagram Sender     │  ← Envia resposta
│  (com Retry Logic)    │
└───────────────────────┘
```

---

## 📦 Instalação

### **1. Pré-requisitos**

- Node.js >= 18.x
- npm ou yarn
- Conta Instagram Business conectada ao Facebook
- Azure OpenAI (GPT-4o + Embeddings)
- Supabase (com knowledge_base configurada)
- SerpAPI

### **2. Clone e instale dependências**

```bash
cd Bot_Instagram_Forefy
npm install
```

### **3. Configure variáveis de ambiente**

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Preencha todas as variáveis:

```env
# Instagram
INSTAGRAM_ACCESS_TOKEN=seu_token_aqui
INSTAGRAM_APP_SECRET=seu_app_secret
INSTAGRAM_VERIFY_TOKEN=seu_verify_token

# Azure OpenAI
AZURE_OPENAI_API_KEY=sua_key
AZURE_OPENAI_ENDPOINT=https://seu-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o

# Azure Embeddings
AZURE_OPENAI_EMBEDDINGS_API_KEY=sua_key
AZURE_OPENAI_EMBEDDINGS_ENDPOINT=https://seu-resource.openai.azure.com
AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT_NAME=text_embedding_ada_002_azure_open_ai

# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua_service_key

# SerpAPI
SERPAPI_API_KEY=sua_serpapi_key
```

---

## 🚀 Uso

### **Desenvolvimento**

```bash
npm run dev
```

### **Produção**

```bash
npm run build
npm start
```

### **Testes**

```bash
npm test
npm run test:watch
```

---

## 🔧 Estrutura de Arquivos

```
Bot_Instagram_Forefy/
├── src/
│   ├── config/
│   │   └── index.ts                    # Configurações centralizadas
│   ├── controllers/
│   │   └── instagram.controller.ts     # Rotas Express
│   ├── integrations/
│   │   ├── azure-openai.service.ts     # Cliente Azure OpenAI
│   │   ├── supabase-vector.service.ts  # Vector Store RAG
│   │   ├── serpapi.service.ts          # Busca web
│   │   └── memory-manager.service.ts   # Window Buffer Memory
│   ├── services/
│   │   ├── instagram-message-parser.ts # Parser de webhooks
│   │   ├── instagram-sender.service.ts # 🔧 CORRIGIDO: Envio robusto
│   │   └── instagram-agent.service.ts  # AI Agent principal
│   ├── types/
│   │   └── instagram.types.ts          # Types e schemas
│   ├── utils/
│   │   └── logger.ts                   # Logger Winston
│   └── index.ts                        # Entry point
├── tests/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📝 Fluxo de Execução

1. **Instagram envia webhook** → `POST /api/instagram/webhook`
2. **Parser valida e extrai dados** → `InstagramMessageParser`
3. **AI Agent processa mensagem**:
   - Identifica vertical e etapa do funil
   - Busca contexto na Knowledge Base (RAG)
   - Pesquisa notícias se necessário (SerpAPI)
   - Mantém histórico de 10 mensagens (Memory)
   - Gera resposta estruturada (máx 20 palavras)
4. **Sender envia resposta** → `InstagramSenderService` com retry
5. **Instagram entrega mensagem ao usuário**

---

## ⚙️ Configuração do Instagram

### **1. Criar App no Meta for Developers**

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Crie um novo app
3. Adicione o produto **Instagram Basic Display** ou **Instagram Graph API**

### **2. Configurar Webhook**

1. Vá em **Webhooks** → **Instagram**
2. Configure:
   - **Callback URL**: `https://seu-dominio.com/api/instagram/webhook`
   - **Verify Token**: O mesmo que você colocou em `INSTAGRAM_VERIFY_TOKEN`
3. Inscreva-se nos eventos: `messages`

### **3. Obter Access Token**

Use o [Graph API Explorer](https://developers.facebook.com/tools/explorer/) para gerar um token com permissões:
- `instagram_basic`
- `instagram_manage_messages`
- `pages_manage_metadata`

---

## 🐛 Solução de Problemas

### **Erro: "Token de acesso inválido ou expirado"**

- Verifique se o token em `.env` está correto
- Tokens de curta duração expiram em 1 hora
- Gere um token de longa duração (60 dias)

### **Erro: "Permissões insuficientes"**

- Verifique se seu app tem `instagram_manage_messages`
- Confirme que a conta Instagram está em modo Business/Creator

### **Erro: "Rate limit excedido"**

- Aguarde alguns minutos antes de tentar novamente
- Implemente fila de mensagens se volume for alto

### **Vector Store não retorna resultados**

- Verifique se a tabela `knowledge_base` existe no Supabase
- Confirme que há documentos embedados
- Teste a função `match_documents` no SQL Editor

---

## 📊 Logs

Todos os logs são salvos em:
- `logs/combined.log` - Todos os logs
- `logs/error.log` - Apenas erros

Níveis de log:
- `error`: Erros críticos
- `warn`: Avisos
- `info`: Informações gerais
- `debug`: Debug detalhado

Configure o nível em `.env`:
```env
LOG_LEVEL=debug
```

---

## 🔐 Segurança

- ✅ Nunca commite o arquivo `.env`
- ✅ Use tokens de longa duração em produção
- ✅ Implemente rate limiting no Express
- ✅ Valide assinatura do webhook Instagram (implementar)
- ✅ Use HTTPS em produção

---

## 📈 Próximos Passos

- [ ] Implementar validação de assinatura do webhook Instagram
- [ ] Adicionar fila de mensagens (Bull/Redis)
- [ ] Implementar analytics e métricas
- [ ] Deploy em produção (Railway/Render/Vercel)
- [ ] Adicionar testes de integração completos
- [ ] Implementar fallback para quando o AI Agent falhar

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-feature`
3. Commit suas mudanças: `git commit -m 'Adiciona nova feature'`
4. Push para a branch: `git push origin feature/nova-feature`
5. Abra um Pull Request

---

## 📄 Licença

MIT License - veja LICENSE para detalhes

---

## 👨‍💻 Autores

**Forefy Team**
- Saulo Farias (Co-Founder)

---

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.

---

**Feito com ❤️ para o Forefy**
