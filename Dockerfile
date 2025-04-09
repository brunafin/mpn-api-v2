# Usa a imagem oficial do Node.js
FROM node:latest

# Define o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copia os arquivos do projeto para dentro do container
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante dos arquivos do projeto
COPY . .

RUN npm run build

# Expõe a porta usada pelo NestJS
EXPOSE 3000

# Comando padrão ao iniciar o container
CMD ["npm", "run", "start"]
