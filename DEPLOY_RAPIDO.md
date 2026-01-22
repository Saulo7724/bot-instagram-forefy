# 🚀 Deploy RÁPIDO - 5 Minutos

## 1️⃣ Acessar Coolify

Abra: https://coolify.forefy.ai

- User: `ajbnf5qaQo86SG4O`
- Password: `gx01ZQDl1i7NlHWz45TcnSvEi7bdYRWT`

## 2️⃣ Criar Resource

1. Vá em **Projects** → **Saulo-Projects** → **production**
2. Clique em **"+ Add New Resource"**
3. Escolha **"New Application"**

## 3️⃣ Configurar Source

- **Source Type**: `Public Repository`
- **Git Repository URL**: `https://github.com/Saulo7724/bot-instagram-forefy`
- **Branch**: `main`
- **Build Pack**: `Dockerfile`

## 4️⃣ Configurar Networking

- **Domains**: `bot.forefy.ai`
- **Port**: `3000`

## 5️⃣ Environment Variables

Clique em **"Environment Variables"** e adicione (copie do .env local):

```
NODE_ENV=production
PORT=3000
INSTAGRAM_ACCESS_TOKEN=<do .env>
INSTAGRAM_APP_SECRET=<do .env>
INSTAGRAM_VERIFY_TOKEN=<do .env>
AZURE_OPENAI_API_KEY=<do .env>
AZURE_OPENAI_ENDPOINT=<do .env>
AZURE_OPENAI_DEPLOYMENT_NAME=<do .env>
AZURE_OPENAI_API_VERSION=<do .env>
AZURE_OPENAI_EMBEDDINGS_API_KEY=<do .env>
AZURE_OPENAI_EMBEDDINGS_ENDPOINT=<do .env>
AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT_NAME=<do .env>
AZURE_OPENAI_EMBEDDINGS_API_VERSION=<do .env>
SUPABASE_URL=<do .env>
SUPABASE_SERVICE_KEY=<do .env>
SERPAPI_API_KEY=<do .env>
LOG_LEVEL=info
```

## 6️⃣ Deploy

1. Clique em **"Deploy"**
2. Aguarde 2-3 minutos
3. Acompanhe os logs

## 7️⃣ Testar

```bash
curl https://bot.forefy.ai/health
```

Deve retornar: `{"status":"ok",...}`

## 8️⃣ Configurar Webhook Meta

1. Acesse: https://developers.facebook.com/apps/876893011661346/
2. **Instagram** → **Webhooks** → **Edit Callback URL**
3. URL: `https://bot.forefy.ai/api/instagram/webhook`
4. Token: `forefy_webhook_verify_2026`
5. **Verify and Save**

## ✅ Pronto!

Envie uma mensagem no Instagram para `@forefy` e veja a mágica acontecer! 🎉
