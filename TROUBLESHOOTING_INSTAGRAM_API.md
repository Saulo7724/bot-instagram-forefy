# 🔧 Troubleshooting: Instagram Graph API

Este guia resolve os problemas mais comuns ao enviar mensagens via Instagram Graph API.

---

## ⚠️ Problema Principal: "Envia resposta para o Direct" falha

O node **"Envia resposta para o Direct"** do n8n estava falhando. Aqui estão todos os possíveis motivos e soluções.

---

## 🔍 Diagnóstico Rápido

Execute este comando para diagnosticar:

```bash
curl -X GET "https://seu-dominio.com/api/instagram/validate-token"
```

Se retornar `{"valid": false}`, o problema é com o token.

---

## 1️⃣ Erro 401: Token Inválido ou Expirado

### **Sintomas**
```json
{
  "error": {
    "message": "Invalid OAuth access token.",
    "type": "OAuthException",
    "code": 190
  }
}
```

### **Causas**
- Token de curta duração expirado (1 hora)
- Token revogado
- Token gerado para o app errado
- Token não tem as permissões corretas

### **Solução**

**1. Verifique se o token está ativo:**

```bash
curl -X GET "https://graph.facebook.com/v23.0/me?access_token=SEU_TOKEN"
```

Se retornar erro 190, o token está inválido.

**2. Gere um token de longa duração:**

```bash
curl -X GET "https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=SEU_APP_ID&client_secret=SEU_APP_SECRET&fb_exchange_token=SEU_TOKEN_CURTO"
```

**3. Verifique as permissões:**

```bash
curl -X GET "https://graph.facebook.com/v23.0/me/permissions?access_token=SEU_TOKEN"
```

Você DEVE ter:
- `instagram_basic` (granted)
- `instagram_manage_messages` (granted)
- `pages_manage_metadata` (granted)

**4. Atualize o token no `.env`:**

```env
INSTAGRAM_ACCESS_TOKEN=novo_token_aqui
```

**5. Reinicie o servidor:**

```bash
npm run dev
```

---

## 2️⃣ Erro 403: Permissões Insuficientes

### **Sintomas**
```json
{
  "error": {
    "message": "Insufficient permissions",
    "type": "OAuthException",
    "code": 10
  }
}
```

### **Causas**
- Falta a permissão `instagram_manage_messages`
- Conta Instagram não está em modo Business/Creator
- App não está aprovado para uso em produção

### **Solução**

**1. Verifique o tipo da conta Instagram:**

A conta DEVE ser **Business** ou **Creator**. Contas pessoais não funcionam.

Para converter:
1. Abra o Instagram → Perfil → Menu (≡)
2. Configurações → Conta
3. Mudar tipo de conta → Conta profissional
4. Escolha **Empresa** ou **Criador**

**2. Reconecte a página Facebook:**

1. Vá no [Meta Business Suite](https://business.facebook.com/)
2. Configurações → Instagram
3. Reconecte a conta

**3. Regenere o token com permissões corretas:**

No [Graph API Explorer](https://developers.facebook.com/tools/explorer/):
1. Selecione seu app
2. Adicione permissões:
   - ✅ `instagram_basic`
   - ✅ `instagram_manage_messages`
   - ✅ `pages_manage_metadata`
3. Gere novo token
4. Atualize o `.env`

---

## 3️⃣ Erro 400: Payload Inválido

### **Sintomas**
```json
{
  "error": {
    "message": "Invalid parameter",
    "type": "OAuthException",
    "code": 100
  }
}
```

### **Causas**
- Formato do JSON incorreto
- Campo `recipient.id` errado
- Mensagem vazia
- Caracteres especiais mal encodados

### **Solução**

**1. Verifique o payload:**

O payload correto é:
```json
{
  "recipient": {
    "id": "ID_DO_USUARIO"
  },
  "message": {
    "text": "Texto da mensagem"
  }
}
```

**2. Valide o recipient.id:**

O `recipient.id` deve ser o **ID do usuário que enviou a mensagem**, não o ID da sua conta.

No webhook do Instagram, ele vem em:
```json
{
  "entry": [
    {
      "messaging": [
        {
          "sender": {
            "id": "ESTE_É_O_RECIPIENT_ID"  ← Use este!
          }
        }
      ]
    }
  ]
}
```

**3. Teste com curl:**

```bash
curl -X POST "https://graph.instagram.com/v23.0/RECIPIENT_ID/messages" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": {"id": "RECIPIENT_ID"},
    "message": {"text": "Teste"}
  }'
```

---

## 4️⃣ Erro 429: Rate Limit Excedido

### **Sintomas**
```json
{
  "error": {
    "message": "Application request limit reached",
    "type": "OAuthException",
    "code": 4
  }
}
```

### **Causas**
- Muitas requisições em pouco tempo
- Rate limit do Instagram: ~200 mensagens/hora por usuário

### **Solução**

**1. Aguarde alguns minutos**

O rate limit reseta automaticamente.

**2. Implemente fila de mensagens:**

```typescript
// Exemplo com Bull Queue
import Queue from 'bull';

const messageQueue = new Queue('instagram-messages', {
  redis: { port: 6379, host: '127.0.0.1' },
  limiter: {
    max: 50, // 50 mensagens
    duration: 3600000, // por hora
  },
});

messageQueue.process(async (job) => {
  const { recipientId, message } = job.data;
  await senderService.sendMessage(recipientId, message);
});
```

**3. Use backoff exponencial (já implementado):**

O código já implementa retry com delay crescente:
```typescript
const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
```

---

## 5️⃣ Erro 500: Erro no Servidor Instagram

### **Sintomas**
```json
{
  "error": {
    "message": "An unknown error occurred",
    "type": "OAuthException",
    "code": 1
  }
}
```

### **Causas**
- Instabilidade temporária do Instagram
- Manutenção programada

### **Solução**

**1. Aguarde e tente novamente**

Geralmente resolve em alguns minutos.

**2. Use retry logic (já implementado):**

```typescript
await senderService.sendMessageWithRetry(recipientId, message, 3);
```

**3. Monitore status do Instagram:**

- [Facebook Platform Status](https://developers.facebook.com/status/)

---

## 6️⃣ Erro: URL Incorreta

### **Sintomas**
```
404 Not Found
```

### **Causas**
- URL mal formatada
- Versão da API incorreta
- `recipient.id` no lugar errado

### **Solução**

**URL correta:**
```
https://graph.instagram.com/v23.0/{RECIPIENT_ID}/messages
```

**Errado:**
```
❌ https://graph.instagram.com/v23.0/messages/{RECIPIENT_ID}
❌ https://graph.facebook.com/v23.0/{RECIPIENT_ID}/messages
❌ https://graph.instagram.com/{RECIPIENT_ID}/messages (sem versão)
```

---

## 7️⃣ Webhook não recebe mensagens

### **Sintomas**
- Bot não responde
- Logs não mostram mensagens recebidas

### **Causas**
- Webhook não verificado
- URL incorreta
- HTTPS não configurado
- Servidor não acessível

### **Solução**

**1. Verifique se o webhook está ativo:**

No [Meta for Developers](https://developers.facebook.com/):
1. Seu App → Webhooks → Instagram
2. Deve estar **"Ativo"** e **"Verificado"**

**2. Teste a URL publicamente:**

```bash
curl https://seu-dominio.com/api/instagram/webhook
```

Se retornar 405 Method Not Allowed, está funcionando (espera POST).

**3. Verifique se está inscrito em `messages`:**

No webhook config, deve ter:
- ✅ `messages` (inscrito)

**4. Teste manualmente:**

```bash
curl -X POST "https://seu-dominio.com/api/instagram/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "instagram",
    "entry": [{
      "messaging": [{
        "sender": {"id": "123"},
        "recipient": {"id": "456"},
        "timestamp": 1234567890000,
        "message": {"mid": "test", "text": "teste"}
      }]
    }]
  }'
```

---

## 8️⃣ Mensagens duplicadas

### **Sintomas**
- Bot envia a mesma resposta várias vezes

### **Causas**
- Webhook sendo processado múltiplas vezes
- Retry logic sem deduplicação

### **Solução**

**1. Implemente deduplicação:**

```typescript
const processedMessages = new Set<string>();

async processWebhookAsync(data: { body: any }): Promise<void> {
  const message = this.parser.parse(data.body);

  if (processedMessages.has(message.messageId)) {
    logger.warn('Mensagem já processada', { messageId: message.messageId });
    return;
  }

  processedMessages.add(message.messageId);

  // Processa mensagem...
}
```

**2. Use Redis para deduplicação distribuída:**

```typescript
import Redis from 'ioredis';

const redis = new Redis();

if (await redis.exists(`msg:${messageId}`)) {
  return; // Já processado
}

await redis.setex(`msg:${messageId}`, 3600, '1'); // Expira em 1 hora
```

---

## 9️⃣ Token expira frequentemente

### **Sintomas**
- Bot para de funcionar depois de alguns dias

### **Causas**
- Token de curta duração (1 hora)
- Token de longa duração não configurado

### **Solução**

**1. Use token de longa duração (60 dias):**

Siga o passo 2.4 do [SETUP_GUIDE.md](./SETUP_GUIDE.md#24-obter-access-token).

**2. Configure renovação automática:**

```typescript
// Renovar token a cada 50 dias
import cron from 'node-cron';

cron.schedule('0 0 */50 * *', async () => {
  logger.info('Renovando token Instagram...');
  const newToken = await renovarTokenInstagram();
  // Atualizar token no .env ou banco de dados
});
```

---

## 🛠️ Ferramentas de Debug

### **1. Logs detalhados**

O código já implementa logs em cada etapa:

```bash
tail -f logs/combined.log | grep instagram
```

### **2. Graph API Explorer**

Teste chamadas diretamente:
[https://developers.facebook.com/tools/explorer/](https://developers.facebook.com/tools/explorer/)

### **3. Webhook Tester**

Use [Webhook.site](https://webhook.site/) para ver o payload bruto:
1. Crie uma URL temporária
2. Configure no Meta (temporariamente)
3. Envie uma DM
4. Veja o payload exato

### **4. Postman Collection**

Teste todas as APIs:
[Instagram Graph API Postman](https://www.postman.com/meta-platform/workspace/instagram-api/overview)

---

## 📊 Checklist de Verificação

Use este checklist quando o bot não funcionar:

- [ ] Token válido (`/api/instagram/validate-token`)
- [ ] Permissões corretas (`instagram_manage_messages`)
- [ ] Conta Instagram em modo Business/Creator
- [ ] Webhook verificado e ativo
- [ ] Inscrito em `messages` events
- [ ] URL pública e com HTTPS
- [ ] Servidor rodando (`/health`)
- [ ] Logs não mostram erros (`tail -f logs/error.log`)
- [ ] Rate limit não excedido
- [ ] Payload correto (teste com curl)

---

## 🚨 Quando procurar ajuda

Se após seguir todos os passos o problema persistir:

1. Capture os logs completos:
```bash
tail -n 200 logs/combined.log > debug.log
```

2. Teste com curl e salve a resposta:
```bash
curl -v -X POST "..." > curl-output.txt 2>&1
```

3. Abra uma issue com:
   - Logs completos
   - Output do curl
   - Versão da API usada
   - Screenshot do webhook config

---

**Problemas resolvidos! 🎉**

Com este guia, você deve conseguir resolver 99% dos problemas com o Instagram Graph API.
