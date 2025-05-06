# Etapa 1: build
FROM node:23 AS builder

# Define o diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos necessários para instalar as dependências
COPY package*.json ./

# Instala as dependências com o cache de build
RUN npm install

# Copia o restante dos arquivos e constrói a aplicação
COPY . .
RUN npm run build

# Etapa 2: produção
FROM node:23-alpine AS production

# Define o diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos necessários da etapa anterior
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Expõe a porta usada pela aplicação NestJS
EXPOSE 3001

# Comando para iniciar a aplicação
CMD ["node", "dist/main"]
