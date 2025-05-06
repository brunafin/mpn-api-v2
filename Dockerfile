# Etapa 1: build
FROM node:23 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: produção com usuário não-root
FROM node:23-alpine AS production

# Cria um usuário e grupo não-root
RUN addgroup -g 1001 appgroup && \
  adduser -S -u 1001 -G appgroup appuser

WORKDIR /app

# Copia apenas os arquivos necessários da etapa de build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Define permissões apropriadas
RUN chown -R appuser:appgroup /app

# Usa o usuário não-root
USER appuser

EXPOSE 3000

CMD ["node", "main.js"]
