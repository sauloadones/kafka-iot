# ==============================
# Etapa 1 — Build do NestJS
# ==============================
FROM node:20-alpine AS builder

# Define diretório de trabalho dentro do container
WORKDIR /app

# Copia apenas os arquivos de dependências
COPY package*.json ./

# Instala dependências (usa cache inteligente)
RUN npm install

# Copia todo o código da aplicação
COPY . .

# Compila o projeto NestJS (gera dist/)
RUN npm run build

# ==============================
# Etapa 2 — Execução
# ==============================
FROM node:20-alpine AS runner

WORKDIR /app

# Copia apenas a pasta compilada e dependências necessárias para rodar
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Define variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Expõe a porta padrão
EXPOSE 3000

# Comando de inicialização
CMD ["node", "dist/main.js"]
