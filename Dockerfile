# Dockerfile para Bot Instagram Forefy
# Multi-stage build para otimização

# Stage 1: Build
FROM node:18-alpine AS builder

# Instalar dependências do sistema para compilação
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Forçar instalação de TODAS as dependências (ignorar NODE_ENV)
ENV NODE_ENV=development
RUN npm ci --legacy-peer-deps

# Copiar código fonte
COPY . .

# Build TypeScript com mais memória
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

# Instalar dependências de sistema para módulos nativos
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar apenas dependências de produção
ENV NODE_ENV=production
RUN npm ci --omit=dev --legacy-peer-deps && \
    apk del python3 make g++ && \
    rm -rf /var/cache/apk/*

# Copiar build do stage anterior
COPY --from=builder /app/dist ./dist

# Criar diretório de logs
RUN mkdir -p logs

# Expor porta
EXPOSE 3000

# Comando para iniciar
CMD ["npm", "start"]
