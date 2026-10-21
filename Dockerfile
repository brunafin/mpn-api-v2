# Etapa 1: build
FROM node:23 AS builder

WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./
RUN npm install

# Copia o restante dos arquivos do projeto
COPY . .

# Executa o build e verifica se os arquivos foram gerados
RUN npm run build && ls -la /app/dist

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

# Exponha a porta da aplicação
EXPOSE 3001

# A pipe não tem um passo de migration. O CLI tenta primeiro; se ele falhar
# ou a Railway trocar o CMD, o Nest ainda aplica as pendentes no boot.
CMD ["sh", "-c", "node ./node_modules/typeorm/cli.js -d dist/src/database/data-source.js migration:run || echo 'migration:run do CLI falhou; o boot do Nest aplica as pendentes'; exec node dist/src/main.js"]