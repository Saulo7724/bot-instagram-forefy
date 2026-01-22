# 🚀 Guia de Setup - Bot Instagram Forefy

Este guia te leva passo a passo desde a instalação até o bot rodando em produção.

---

## 📋 Pré-requisitos

Antes de começar, você precisa ter:

- ✅ Node.js 18+ instalado
- ✅ Conta Instagram Business (conectada ao Facebook)
- ✅ Azure OpenAI configurado (GPT-4o + Embeddings)
- ✅ Supabase com knowledge_base criada
- ✅ Conta SerpAPI

---

## 1️⃣ Instalação Local

### **1.1 Clone e instale**

```bash
cd Bot_Instagram_Forefy
npm install
```

### **1.2 Configure o .env**

Copie o `.env.example` para `.env`:

```bash
cp .env.example .env
```

Preencha todas as variáveis (veja seção **3. Credenciais** abaixo).

### **1.3 Teste localmente**

```bash
npm run dev
```

O servidor deve iniciar na porta 3000:
```
🚀 Bot Instagram Forefy rodando na porta 3000
📍 Webhook URL: http://localhost:3000/api/instagram/webhook
💚 Health check: http://localhost:3000/health
```

### **1.4 Execute o teste local**

Em outro terminal:

```bash
npx tsx scripts/test-local.ts
```

Você deve ver:
```
✅ Health check OK
✅ Token válido (ou ❌ se ainda não configurou)
✅ Agent respondeu
```

---

## 2️⃣ Configuração do Instagram

### **2.1 Criar App no Meta for Developers**

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Clique em **"Meus Apps"** → **"Criar App"**
3. Escolha **"Empresa"** como tipo
4. Preencha:
   - Nome do app: `Forefy Instagram Bot`
   - Email de contato: seu email

### **2.2 Adicionar produto Instagram**

1. No dashboard do app, clique em **"Adicionar Produtos"**
2. Selecione **"Instagram Graph API"**

### **2.3 Configurar Webhook**

1. Vá em **Webhooks** → **Instagram**
2. Clique em **"Editar Assinatura"**
3. Configure:
   - **URL de Retorno de Chamada**: `https://seu-dominio.com/api/instagram/webhook`
   - **Token de Verificação**: Coloque qualquer string (ex: `forefy_webhook_2024`)
   - Copie esse token para o `.env` em `INSTAGRAM_VERIFY_TOKEN`
4. Clique em **"Verificar e Salvar"**
5. Inscreva-se nos campos:
   - ✅ `messages`

### **2.4 Obter Access Token**

**Opção A: Via Graph API Explorer (Desenvolvimento)**

1. Acesse [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Selecione seu app
3. Adicione permissões:
   - `instagram_basic`
   - `instagram_manage_messages`
   - `pages_manage_metadata`
4. Clique em **"Gerar Token de Acesso"**
5. **IMPORTANTE**: Este token expira em 1 hora! Use apenas para testes.

**Opção B: Token de Longa Duração (Produção)**

Para gerar um token que dura 60 dias:

```bash
curl -X GET "https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=SEU_APP_ID&client_secret=SEU_APP_SECRET&fb_exchange_token=SEU_TOKEN_CURTO"
```

A resposta terá um `access_token` de longa duração.

### **2.5 Conectar Página do Instagram**

1. No app, vá em **Instagram Basic Display** ou **Instagram Graph API**
2. Conecte uma página do Facebook
3. Vincule a conta Instagram Business dessa página

---

## 3️⃣ Credenciais Necessárias

### **Instagram**

```env
INSTAGRAM_ACCESS_TOKEN=          # Token gerado acima
INSTAGRAM_APP_SECRET=            # Em Configurações → Básico
INSTAGRAM_VERIFY_TOKEN=          # O que você escolheu no webhook
```

### **Azure OpenAI (Agent - GPT-4o)**

1. Acesse [Azure Portal](https://portal.azure.com)
2. Vá em **Azure OpenAI Service** → Seu recurso
3. Clique em **"Keys and Endpoint"**

```env
AZURE_OPENAI_API_KEY=            # Key 1 ou Key 2
AZURE_OPENAI_ENDPOINT=           # Endpoint (ex: https://seu-resource.openai.azure.com)
AZURE_OPENAI_DEPLOYMENT_NAME=    # Nome do deployment (ex: gpt-4o)
AZURE_OPENAI_API_VERSION=        # Ex: 2024-02-15-preview
```

### **Azure OpenAI (Embeddings)**

Se você usa o mesmo recurso Azure para embeddings, repita as mesmas credenciais:

```env
AZURE_OPENAI_EMBEDDINGS_API_KEY=             # Mesma key
AZURE_OPENAI_EMBEDDINGS_ENDPOINT=            # Mesmo endpoint
AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT_NAME=     # Ex: text_embedding_ada_002_azure_open_ai
AZURE_OPENAI_EMBEDDINGS_API_VERSION=         # Ex: 2024-02-15-preview
```

### **Supabase**

1. Acesse [Supabase](https://supabase.com)
2. Vá no seu projeto → **Project Settings** → **API**

```env
SUPABASE_URL=                    # Project URL
SUPABASE_SERVICE_KEY=            # service_role key (secret!)
```

### **SerpAPI**

1. Crie conta em [SerpAPI](https://serpapi.com/)
2. Vá em **Dashboard** → **API Key**

```env
SERPAPI_API_KEY=                 # Sua API key
```

---

## 4️⃣ Deploy em Produção

### **Opção A: Railway**

1. Crie conta em [Railway](https://railway.app/)
2. Conecte seu repositório GitHub
3. Configure variáveis de ambiente no dashboard
4. Deploy automático!

### **Opção B: Render**

1. Crie conta em [Render](https://render.com/)
2. Crie um **Web Service**
3. Conecte o repositório
4. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Adicione variáveis de ambiente

### **Opção C: VPS (DigitalOcean, AWS, etc)**

```bash
# No servidor
git clone seu-repositorio
cd Bot_Instagram_Forefy
npm install
npm run build

# Configure .env

# Use PM2 para rodar em produção
npm install -g pm2
pm2 start dist/index.js --name "instagram-bot"
pm2 save
pm2 startup
```

### **4.1 Configurar HTTPS**

Você **PRECISA** de HTTPS para o webhook funcionar!

**Com Nginx:**

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name seu-dominio.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Com Certbot (SSL grátis):**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

### **4.2 Atualizar Webhook URL no Meta**

Depois do deploy:

1. Volte em **Webhooks** no Meta for Developers
2. Atualize a URL para: `https://seu-dominio.com/api/instagram/webhook`
3. Clique em **"Verificar e Salvar"**

---

## 5️⃣ Verificação Final

### **5.1 Teste o webhook**

```bash
curl https://seu-dominio.com/health
```

Deve retornar:
```json
{
  "status": "ok",
  "service": "bot-instagram-forefy",
  "timestamp": "..."
}
```

### **5.2 Envie uma mensagem no Instagram**

1. Abra o Instagram
2. Envie uma DM para a conta conectada
3. Digite: "Olá, quero saber sobre o Forefy"
4. Aguarde a resposta automática!

### **5.3 Monitore os logs**

```bash
# Se usando PM2
pm2 logs instagram-bot

# Ou veja os arquivos
tail -f logs/combined.log
```

---

## 6️⃣ Troubleshooting

### **Erro: "Token inválido ou expirado"**

- ✅ Verifique se o token está correto no `.env`
- ✅ Gere um token de longa duração
- ✅ Confirme que tem as permissões `instagram_manage_messages`

### **Erro: "Webhook verification failed"**

- ✅ Confirme que `INSTAGRAM_VERIFY_TOKEN` no `.env` é EXATAMENTE o mesmo do Meta
- ✅ Verifique se o servidor está acessível publicamente

### **Erro: "Permissões insuficientes"**

- ✅ Verifique se a conta Instagram está em modo Business/Creator
- ✅ Confirme que a página Facebook está conectada
- ✅ Verifique as permissões do token

### **Bot não responde**

- ✅ Verifique logs: `tail -f logs/combined.log`
- ✅ Teste o endpoint: `curl https://seu-dominio.com/api/instagram/validate-token`
- ✅ Confirme que o webhook está inscrito em `messages`
- ✅ Teste o agent localmente: `npx tsx scripts/test-local.ts`

### **Vector Store não retorna resultados**

- ✅ Verifique se a tabela `knowledge_base` existe no Supabase
- ✅ Confirme que há documentos embedados
- ✅ Teste a função `match_documents` no SQL Editor do Supabase

---

## 7️⃣ Monitoramento

### **Logs**

Todos os logs são salvos em:
- `logs/combined.log` - Todos os logs
- `logs/error.log` - Apenas erros

### **Métricas Recomendadas**

- Taxa de resposta do bot
- Tempo médio de resposta
- Taxa de erro do Instagram API
- Taxa de erro do AI Agent
- Conversões (quantos leads chegam até o link do Forefy)

---

## 8️⃣ Manutenção

### **Atualizar código**

```bash
git pull
npm install
npm run build
pm2 restart instagram-bot
```

### **Renovar token Instagram**

Tokens de longa duração expiram em 60 dias. Configure um lembrete para renovar!

### **Limpar logs antigos**

```bash
find logs -name "*.log" -mtime +30 -delete
```

---

## 🎉 Pronto!

Seu bot está rodando! Qualquer dúvida, consulte o [README.md](./README.md) ou abra uma issue.

---

**Feito com ❤️ para o Forefy**
