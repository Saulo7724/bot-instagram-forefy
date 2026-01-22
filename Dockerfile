# Dockerfile para Bot Instagram Forefy
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache python3 make g++

# Definir diretório de trabalho
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Build TypeScript
RUN npm run build

# Criar diretório de logs
RUN mkdir -p logs

# Expor porta
EXPOSE 3000

# Comando para iniciar
CMD ["npm", "start"]
