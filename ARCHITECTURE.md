# 🏗️ Arquitetura do Bot Instagram Forefy

Documento detalhando a arquitetura completa do sistema.

---

## 📐 Diagrama de Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                        INSTAGRAM                                 │
│                                                                  │
│  Usuário envia DM → Instagram Graph API → Webhook              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WEBHOOK RECEIVER                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ GET  /api/instagram/webhook   → Verificação do webhook  │  │
│  │ POST /api/instagram/webhook   → Recebe mensagens        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Controller: instagram.controller.ts                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ Responde 200 OK imediatamente
                         │
                         ▼ Processa assíncrono
┌─────────────────────────────────────────────────────────────────┐
│                   MESSAGE PARSER                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Valida schema Zod                                        │  │
│  │ Extrai:                                                  │  │
│  │   - contaId (recipient.id)                               │  │
│  │   - contatoId (sender.id)                                │  │
│  │   - contatoMsg (message.text)                            │  │
│  │   - data (timestamp)                                     │  │
│  │   - messageId (message.mid)                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Service: instagram-message-parser.ts                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI AGENT                                    │
│                    (LangChain)                                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   PROMPT TEMPLATE                         │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │ System: "ROLE: SAULO FARIAS..."                   │  │  │
│  │  │ History: {chat_history} (últimas 10 msgs)         │  │  │
│  │  │ Human: {input}                                     │  │  │
│  │  │ Scratchpad: {agent_scratchpad}                    │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    AGENT EXECUTOR                        │  │
│  │                                                          │  │
│  │  Model: GPT-4o (Azure OpenAI)                           │  │
│  │  Max Iterations: 5                                      │  │
│  │  Memory: Window Buffer (10 msgs)                        │  │
│  │                                                          │  │
│  │  Tools:                                                  │  │
│  │    1. documents (Vector Store RAG)                      │  │
│  │    2. search_web (SerpAPI)                              │  │
│  └───────┬──────────────────────┬───────────────────────────┘  │
│          │                      │                               │
│          ▼                      ▼                               │
│  ┌──────────────┐      ┌─────────────────┐                    │
│  │  TOOL 1:     │      │  TOOL 2:        │                    │
│  │  documents   │      │  search_web     │                    │
│  │              │      │                 │                    │
│  │  Busca RAG   │      │  Busca Google   │                    │
│  │  Supabase    │      │  via SerpAPI    │                    │
│  └──────┬───────┘      └────────┬────────┘                    │
│         │                       │                              │
│         └───────────┬───────────┘                              │
│                     │                                          │
│                     ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           STRUCTURED OUTPUT PARSER                       │  │
│  │                                                          │  │
│  │  Retorna JSON:                                          │  │
│  │  {                                                      │  │
│  │    current_funnel_stage: "Etapa X",                    │  │
│  │    identified_vertical: "CONCURSOS",                   │  │
│  │    search_required: true/false,                        │  │
│  │    search_query: "...",                                │  │
│  │    response_message: "..." (max 20 palavras)           │  │
│  │  }                                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Service: instagram-agent.service.ts                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ AgentOutput
┌─────────────────────────────────────────────────────────────────┐
│                   INSTAGRAM SENDER                               │
│                   (COM RETRY LOGIC)                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Tentativa 1: Envia mensagem                              │  │
│  │   ↓ Se falhar                                            │  │
│  │ Aguarda 2s (backoff exponencial)                         │  │
│  │   ↓                                                       │  │
│  │ Tentativa 2: Envia mensagem                              │  │
│  │   ↓ Se falhar                                            │  │
│  │ Aguarda 4s                                                │  │
│  │   ↓                                                       │  │
│  │ Tentativa 3: Envia mensagem                              │  │
│  │   ↓ Se falhar                                            │  │
│  │ Lança InstagramApiError                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Service: instagram-sender.service.ts                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ POST Request
┌─────────────────────────────────────────────────────────────────┐
│                   INSTAGRAM GRAPH API                            │
│                                                                  │
│  POST https://graph.instagram.com/v23.0/{recipient_id}/messages │
│                                                                  │
│  Headers:                                                       │
│    Authorization: Bearer {ACCESS_TOKEN}                         │
│    Content-Type: application/json                               │
│                                                                  │
│  Body:                                                          │
│    {                                                            │
│      "recipient": {"id": "{sender_id}"},                        │
│      "message": {"text": "{response_message}"}                  │
│    }                                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        INSTAGRAM                                 │
│                                                                  │
│  Usuário recebe resposta no Direct Messages                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Estrutura de Diretórios

```
Bot_Instagram_Forefy/
│
├── src/
│   │
│   ├── config/
│   │   └── index.ts                      # Configurações centralizadas
│   │
│   ├── controllers/
│   │   └── instagram.controller.ts       # Rotas Express + Webhook Handler
│   │
│   ├── services/
│   │   ├── instagram-message-parser.ts   # Parseia webhooks do Instagram
│   │   ├── instagram-agent.service.ts    # AI Agent principal (LangChain)
│   │   └── instagram-sender.service.ts   # Envia mensagens (COM RETRY)
│   │
│   ├── integrations/
│   │   ├── azure-openai.service.ts       # Cliente Azure OpenAI
│   │   ├── supabase-vector.service.ts    # Vector Store RAG (Supabase)
│   │   ├── serpapi.service.ts            # Busca web (SerpAPI)
│   │   └── memory-manager.service.ts     # Window Buffer Memory
│   │
│   ├── types/
│   │   └── instagram.types.ts            # Types, Schemas (Zod), Enums
│   │
│   ├── utils/
│   │   └── logger.ts                     # Logger (Winston)
│   │
│   └── index.ts                          # Entry point (Express server)
│
├── tests/
│   └── instagram-parser.test.ts          # Testes (Vitest)
│
├── scripts/
│   └── test-local.ts                     # Script de teste local
│
├── logs/
│   ├── combined.log                      # Todos os logs
│   └── error.log                         # Apenas erros
│
├── .env.example                          # Template de variáveis
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
│
├── README.md                             # Visão geral
├── SETUP_GUIDE.md                        # Guia de setup
├── N8N_VS_CODE.md                        # Comparação n8n vs código
├── TROUBLESHOOTING_INSTAGRAM_API.md      # Solução de problemas
├── ARCHITECTURE.md                       # Este documento
├── SUMMARY.md                            # Sumário executivo
└── CREDENTIALS_TEMPLATE.md               # Template de credenciais
```

---

## 🔄 Fluxo de Dados Detalhado

### **1. Recebimento da Mensagem**

```
Instagram → Webhook → Express
                        ↓
            Valida signature (TODO)
                        ↓
            Responde 200 OK (imediato)
                        ↓
            Processa assíncrono
```

### **2. Parsing**

```
Webhook Payload (JSON)
        ↓
InstagramMessageParser
        ↓
Valida com Zod Schema
        ↓
Retorna InstagramMessage | null
```

### **3. AI Processing**

```
InstagramMessage
        ↓
AI Agent Service
        ↓
┌───────────────────────┐
│ 1. Obtém Memory       │ ← Memory Manager (10 msgs)
│ 2. Cria Prompt        │ ← System Prompt (Saulo Farias)
│ 3. Cria Tools         │ ← RAG + SerpAPI
│ 4. Executa Agent      │ ← LangChain Executor
│ 5. Parseia Output     │ ← Structured Parser
└───────────────────────┘
        ↓
AgentOutput (JSON)
```

### **4. Tool Execution**

**Tool 1: documents (RAG)**
```
Query do Agent
        ↓
Supabase Vector Service
        ↓
Gera embedding (Azure OpenAI)
        ↓
Busca similar no Supabase (topK=20)
        ↓
Retorna documentos relevantes
```

**Tool 2: search_web (SerpAPI)**
```
Query do Agent
        ↓
SerpAPI Service
        ↓
GET https://serpapi.com/search (gl=br, hl=pt)
        ↓
Formata resultados
        ↓
Retorna texto estruturado
```

### **5. Envio da Resposta**

```
AgentOutput.response_message
        ↓
Instagram Sender Service
        ↓
┌─────────────────────┐
│ Tentativa 1         │
│   ↓ (se falhar)     │
│ Aguarda 2s          │
│   ↓                 │
│ Tentativa 2         │
│   ↓ (se falhar)     │
│ Aguarda 4s          │
│   ↓                 │
│ Tentativa 3         │
└─────────────────────┘
        ↓
POST Instagram Graph API
        ↓
Usuário recebe mensagem
```

---

## 🧩 Componentes Principais

### **1. Instagram Controller**

**Responsabilidades:**
- Recebe webhooks do Instagram (GET + POST)
- Valida verificação do webhook
- Responde 200 OK imediatamente
- Processa mensagens de forma assíncrona
- Expõe endpoints de teste/debug

**Rotas:**
```
GET  /health                        → Health check
GET  /api/instagram/webhook         → Verificação webhook
POST /api/instagram/webhook         → Recebe mensagens
GET  /api/instagram/validate-token  → Valida token Instagram
POST /api/instagram/test-agent      → Testa Agent (dev only)
POST /api/instagram/clear-memory    → Limpa memória (dev only)
```

### **2. Message Parser**

**Responsabilidades:**
- Valida payload do webhook com Zod
- Extrai dados estruturados
- Trata mensagens sem texto
- Retorna null se inválido

**Input:**
```json
{
  "object": "instagram",
  "entry": [...]
}
```

**Output:**
```typescript
{
  contaId: string,
  contatoId: string,
  contatoMsg: string,
  data: Date,
  messageId: string
}
```

### **3. AI Agent Service**

**Responsabilidades:**
- Orquestra LangChain Agent
- Gerencia prompt template
- Configura tools (RAG + SerpAPI)
- Aplica memory por usuário
- Parseia output estruturado

**Configuração:**
```typescript
Model: GPT-4o (Azure OpenAI)
Temperature: 0.7
Max Tokens: 500
Max Iterations: 5
Memory: Window Buffer (k=10)
Tools: [documents, search_web]
```

### **4. Vector Store Service**

**Responsabilidades:**
- Inicializa conexão com Supabase
- Gerencia embeddings (Azure OpenAI)
- Executa busca de similaridade
- Retorna documentos relevantes (topK=20)

**Configuração:**
```typescript
Table: knowledge_base
Embeddings: text-embedding-ada-002
Query Function: match_documents
```

### **5. SerpAPI Service**

**Responsabilidades:**
- Busca informações na web
- Formata resultados estruturados
- Filtra por região (BR) e idioma (PT)
- Trata erros de API

**Configuração:**
```typescript
gl: 'br'
hl: 'pt'
google_domain: 'google.com'
num_results: 5
```

### **6. Memory Manager**

**Responsabilidades:**
- Cria/obtém memória por usuário
- Mantém histórico de 10 mensagens
- Limpa memórias sob demanda
- Gerencia contexto de conversação

**Configuração:**
```typescript
Type: BufferWindowMemory
Context Window: 10 mensagens
Return Messages: true
Memory Key: 'chat_history'
```

### **7. Instagram Sender** ⚠️ **COMPONENTE CRÍTICO**

**Responsabilidades:**
- Envia mensagens via Instagram Graph API
- Implementa retry logic (3 tentativas)
- Backoff exponencial (2s, 4s, 8s)
- Trata erros específicos (400, 401, 403, 429, 500+)
- Logs detalhados em cada etapa
- Valida token separadamente

**Configuração:**
```typescript
API Version: v23.0
Base URL: https://graph.instagram.com
Max Retries: 3
Timeout: 10s
Backoff: Exponencial (2^attempt * 1000ms)
```

**Tratamento de Erros:**
```typescript
400 → Bad Request (payload inválido)
401 → Token inválido/expirado
403 → Permissões insuficientes
429 → Rate limit excedido
500+ → Erro no servidor Instagram
```

---

## 📊 Fluxo de Memória (Window Buffer)

```
Usuário envia mensagem 1
  ↓
Memory: [msg1]

Usuário envia mensagem 2
  ↓
Memory: [msg1, msg2]

...

Usuário envia mensagem 10
  ↓
Memory: [msg1, msg2, ..., msg10]

Usuário envia mensagem 11
  ↓
Memory: [msg2, msg3, ..., msg11]  ← Remove msg1 (janela de 10)
```

---

## 🔐 Segurança

### **Implementado:**
- ✅ Variáveis sensíveis em `.env`
- ✅ `.gitignore` configurado
- ✅ HTTPS obrigatório (produção)
- ✅ Timeout em requests
- ✅ Validação de schemas (Zod)
- ✅ Logs estruturados (sem secrets)

### **TODO:**
- [ ] Validação de signature do webhook Instagram
- [ ] Rate limiting no Express
- [ ] CORS configurado
- [ ] Helmet.js (security headers)
- [ ] IP whitelist (opcional)

---

## 📈 Performance

### **Otimizações:**
- ✅ Processamento assíncrono (não bloqueia webhook)
- ✅ Resposta 200 OK imediata
- ✅ Timeout em requests externos
- ✅ Retry com backoff (evita sobrecarga)
- ✅ Memory local (Map) para conversas

### **Gargalos Potenciais:**
- Azure OpenAI (latência ~1-2s)
- Supabase Vector Search (~500ms)
- SerpAPI (~1s)
- Instagram Graph API (~500ms)

**Tempo total médio:** ~2-3 segundos

---

## 🧪 Testabilidade

### **Testes Unitários:**
```typescript
tests/instagram-parser.test.ts
  ✓ Parseia webhook válido
  ✓ Retorna null para webhook sem texto
  ✓ Retorna null para webhook inválido
  ✓ Valida webhook corretamente
```

### **Testes de Integração:**
```bash
scripts/test-local.ts
  ✓ Health check
  ✓ Valida token Instagram
  ✓ Testa AI Agent
  ✓ Testa memória (2ª mensagem)
  ✓ Limpa memória
```

---

## 📊 Monitoramento

### **Logs:**
```
logs/combined.log    → Todos os logs (info, debug, warn, error)
logs/error.log       → Apenas erros
```

### **Métricas Recomendadas:**
- Taxa de sucesso de envio (%)
- Tempo médio de resposta (s)
- Taxa de retry (%)
- Taxa de erro por tipo (400, 401, 403, 429, 500)
- Uso de memória (MB)
- Conversões no funil (por etapa)

---

## 🚀 Deploy

### **Mínimo Necessário:**
- Node.js 18+
- HTTPS configurado
- Variáveis de ambiente configuradas
- Porta 3000 (ou variável `PORT`)

### **Recomendado:**
- PM2 para gerenciar processo
- Nginx como reverse proxy
- Logs centralizados (ex: Papertrail)
- Alertas de erro (ex: Sentry)

---

**Arquitetura completa e pronta para produção! 🎉**
