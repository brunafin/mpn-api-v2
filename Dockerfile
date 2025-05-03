FROM node:20-slim

# Cria um usuário não-root
RUN groupadd -r nodeapp && useradd -m -r -g nodeapp nodeapp

# Diretório de trabalho da aplicação
WORKDIR /usr/src/app

# Copia somente os arquivos necessários para instalar dependências
COPY --chown=nodeapp:nodeapp package*.json ./

# Instala dependências com segurança (ignora scripts de postinstall maliciosos)
RUN npm install --ignore-scripts

# Copia os demais arquivos do projeto
COPY --chown=nodeapp:nodeapp . .

# Compila a aplicação
RUN npm run build

# Usa o usuário não-root
USER nodeapp

# Expõe a porta da aplicação
EXPOSE 3000

# Comando para rodar a aplicação
CMD ["npm", "run", "start"]
