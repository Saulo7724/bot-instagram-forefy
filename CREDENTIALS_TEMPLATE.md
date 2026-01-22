# 🔐 Template de Credenciais

Quando você tiver as credenciais do Meta/Instagram, preencha este template e me envie.

---

## 📱 Instagram / Meta for Developers

### **App Information**
```
App ID: ___________________________
App Secret: _______________________
App Name: Forefy Instagram Bot
```

### **Access Token**
```
Access Token (atual): _______________________________
Token Type: [ ] Curta duração (1h)  [ ] Longa duração (60 dias)
Expira em: ____/____/______
```

### **Webhook Configuration**
```
Webhook URL: https://___________________________/api/instagram/webhook
Verify Token: ___________________________
Status: [ ] Verificado  [ ] Pendente
```

### **Instagram Account**
```
Instagram Username: @_______________
Instagram ID (IGID): ___________________________
Tipo de conta: [ ] Business  [ ] Creator  [ ] Personal
Conectada à página FB: [ ] Sim  [ ] Não
Nome da página FB: ___________________________
```

### **Permissões Concedidas**
Marque as permissões que você já concedeu:
- [ ] `instagram_basic`
- [ ] `instagram_manage_messages`
- [ ] `pages_manage_metadata`
- [ ] `pages_read_engagement`

---

## ☁️ Azure OpenAI

### **GPT-4o (Agent)**
```
Resource Name: ___________________________
API Key: _______________________________
Endpoint: https://_______________.openai.azure.com
Deployment Name: ___________________________
API Version: 2024-02-15-preview (ou outra: _________)
Region: ___________________________
```

### **Embeddings (text-embedding-ada-002)**
```
Resource Name: ___________________________ (pode ser o mesmo)
API Key: _______________________________
Endpoint: https://_______________.openai.azure.com
Deployment Name: ___________________________
API Version: 2024-02-15-preview (ou outra: _________)
```

### **Uso e Limites**
```
Quota TPM (tokens por minuto): ___________
Quota RPM (requests por minuto): ___________
Modelo GPT-4o disponível: [ ] Sim  [ ] Não
Modelo Embeddings disponível: [ ] Sim  [ ] Não
```

---

## 🗄️ Supabase

### **Project Information**
```
Project Name: ___________________________
Project URL: https://_______________.supabase.co
Project ID: ___________________________
Region: ___________________________
```

### **API Keys**
```
Anon Key (public): _______________________________
Service Role Key (secret): _______________________________
```

### **Database**
```
Database Password: _______________________________
Connection String: postgresql://postgres:_______________@...
Direct Connection: [ ] Habilitada  [ ] Desabilitada
```

### **Vector Store**
```
Tabela knowledge_base existe: [ ] Sim  [ ] Não
Função match_documents existe: [ ] Sim  [ ] Não
Embeddings já inseridos: [ ] Sim  [ ] Não
Dimensão dos embeddings: ________ (geralmente 1536)
```

---

## 🔍 SerpAPI

### **Account**
```
API Key: _______________________________
Plan: [ ] Free  [ ] Starter  [ ] Pro
Searches/mês restantes: ___________
```

---

## 🌐 Deployment (Opcional)

### **Servidor/Hosting**
```
Provedor: [ ] Railway  [ ] Render  [ ] DigitalOcean  [ ] AWS  [ ] Outro: _______
URL do servidor: https://___________________________
IP público: ___________________________
Porta: _________ (padrão: 3000)
```

### **SSL/HTTPS**
```
Certificado SSL: [ ] Let's Encrypt  [ ] Cloudflare  [ ] Outro
Status HTTPS: [ ] Configurado  [ ] Pendente
```

---

## ✅ Checklist de Verificação

Antes de me enviar, verifique:

### **Instagram**
- [ ] Tenho o App ID e App Secret
- [ ] Tenho um Access Token válido
- [ ] A conta Instagram é Business ou Creator
- [ ] A página Facebook está conectada
- [ ] As permissões `instagram_manage_messages` estão concedidas

### **Azure OpenAI**
- [ ] Tenho acesso ao recurso Azure OpenAI
- [ ] GPT-4o está deployado
- [ ] text-embedding-ada-002 está deployado
- [ ] Tenho a API Key e Endpoint

### **Supabase**
- [ ] Tenho a Project URL
- [ ] Tenho a Service Role Key
- [ ] A tabela `knowledge_base` existe
- [ ] Há embeddings inseridos na tabela

### **SerpAPI**
- [ ] Tenho a API Key
- [ ] Tenho searches disponíveis

---

## 📝 Informações Adicionais

### **Problemas Conhecidos**
```
Descreva qualquer problema que você já enfrentou:

1. ___________________________________________
2. ___________________________________________
3. ___________________________________________
```

### **Observações**
```
Qualquer informação adicional relevante:

_______________________________________________
_______________________________________________
_______________________________________________
```

---

## 🚨 Segurança

**IMPORTANTE:**
- ✅ Envie as credenciais por canal seguro (DM, e-mail criptografado)
- ✅ NUNCA poste credenciais em issues públicas
- ✅ Use tokens de longa duração para produção
- ✅ Revogue tokens antigos após gerar novos

---

## 📤 Como me enviar

Depois de preencher este template:

1. Salve em um arquivo `.txt` ou `.md`
2. Envie por:
   - DM direto
   - E-mail criptografado
   - Canal privado
3. Aguarde minha confirmação de recebimento
4. Eu configurarei o `.env` e testarei localmente
5. Te enviarei o status de funcionamento

---

**Aguardo suas credenciais para finalizar a configuração! 🚀**
