# 🚀 Deploy no Coolify - Bot Instagram Forefy

## 📋 Pré-requisitos

- ✅ Código commitado no Git
- ✅ Acesso ao Coolify (https://coolify.forefy.ai)
- ✅ Variáveis de ambiente prontas

---

## 🎯 Passo a Passo

### **1. Acessar o Coolify**

```
https://coolify.forefy.ai
```

### **2. Criar Novo Resource**

1. Clique em **"+ New"** ou **"Add Resource"**
2. Selecione **"Application"**
3. Escolha o tipo: **"Docker Compose"** ou **"Dockerfile"**

### **3. Configurar Source**

**Opção A: Git Repository (Recomendado)**
- Source Type: **Git Repository**
- Repository: Cole o caminho do diretório:
  ```
  /Users/saulofarias/Development/Forefy/Bot_Instagram_Forefy
  ```
  Ou se for um repositório remoto:
  ```
  https://github.com/seu-usuario/bot-instagram-forefy
  ```
- Branch: **main** ou **master**
- Build Pack: **Dockerfile**

**Opção B: Local Directory**
- Source Type: **Directory**
- Path: `/Users/saulofarias/Development/Forefy/Bot_Instagram_Forefy`

### **4. Configurar Domínio**

- **Domain**: `bot.forefy.ai` ou `instagram-bot.forefy.ai`
- **Port**: `3000`
- **Protocol**: `http` (o Coolify adiciona HTTPS automaticamente)

### **5. Adicionar Variáveis de Ambiente**

No Coolify, vá em **Environment Variables** e adicione:

**IMPORTANTE**: Copie as variáveis do arquivo `.env` do projeto.

As variáveis necessárias são:
- `NODE_ENV=production`
- `PORT=3000`
- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_APP_SECRET`
- `INSTAGRAM_VERIFY_TOKEN`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT_NAME`
- `AZURE_OPENAI_API_VERSION`
- `AZURE_OPENAI_EMBEDDINGS_API_KEY`
- `AZURE_OPENAI_EMBEDDINGS_ENDPOINT`
- `AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT_NAME`
- `AZURE_OPENAI_EMBEDDINGS_API_VERSION`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SERPAPI_API_KEY`
- `LOG_LEVEL=info`

### **6. Configurar Health Check**

- **Health Check URL**: `/health`
- **Health Check Interval**: `30s`
- **Health Check Timeout**: `10s`
- **Health Check Retries**: `3`

### **7. Deploy**

1. Clique em **"Deploy"**
2. Aguarde o build (2-3 minutos)
3. Acompanhe os logs em tempo real

### **8. Verificar Deploy**

Após o deploy, teste:

```bash
curl https://bot.forefy.ai/health
```

Deve retornar:
```json
{
  "status": "ok",
  "service": "bot-instagram-forefy",
  "timestamp": "..."
}
```

---

## 🔗 Configurar Webhook no Meta

Agora que o bot está no ar, configure o webhook:

1. Acesse: https://developers.facebook.com/apps/876893011661346/
2. Vá em **Instagram** → **Configuration** → **Webhooks**
3. Edite o webhook existente:
   - **URL de callback**: `https://bot.forefy.ai/api/instagram/webhook`
   - **Verificar token**: `forefy_webhook_verify_2026`
4. Clique em **"Verificar e Salvar"**
5. Certifique-se que `messages` está assinado

---

## 📊 Monitoramento

### **Ver Logs**

No Coolify:
- Vá em **Logs**
- Ou use CLI: `docker logs -f nome-do-container`

### **Ver Métricas**

- CPU e Memória: Dashboard do Coolify
- Logs de erro: `/logs/error.log` (volume montado)

---

## 🔄 Atualizar Código

Quando fizer mudanças:

```bash
git add .
git commit -m "Descrição da mudança"
git push origin main
```

No Coolify:
- Clique em **"Redeploy"**
- Ou configure **Auto Deploy** no Git

---

## 🐛 Troubleshooting

### **Erro: Port already in use**
- Verifique se a porta 3000 está livre
- Ou mude a porta no `.env`

### **Erro: Cannot connect to Supabase**
- Verifique se `SUPABASE_URL` está correto
- Teste conexão: `curl http://supabase-saulo.forefy.ai`

### **Erro: Azure OpenAI authentication**
- Verifique `AZURE_OPENAI_API_KEY`
- Teste no endpoint diretamente

### **Webhook não recebe mensagens**
- Verifique se `bot.forefy.ai` está acessível
- Teste: `curl https://bot.forefy.ai/health`
- Verifique logs do Coolify

---

## ✅ Checklist Final

- [ ] Código commitado no Git
- [ ] Resource criado no Coolify
- [ ] Variáveis de ambiente configuradas
- [ ] Domínio `bot.forefy.ai` configurado
- [ ] Deploy executado com sucesso
- [ ] Health check retorna 200 OK
- [ ] Webhook configurado no Meta
- [ ] Mensagem de teste enviada no Instagram
- [ ] Bot respondeu corretamente

---

**Pronto! Bot em produção no Coolify! 🎉**
