# Usa uma imagem base do Node.js (slim para menor tamanho)
FROM node:20-slim

# Cria um usuário não-root para rodar a aplicação
RUN groupadd -r nodeapp && useradd -m -r -g nodeapp nodeapp

# Define o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copia arquivos de dependência (package.json e package-lock.json) como root, com permissões restritas
COPY --chown=root:root --chmod=444 package*.json ./

# Instala as dependências (sem scripts de pós-instalação)
RUN npm install --ignore-scripts

# Copia apenas os arquivos relevantes para a construção da aplicação
COPY --chown=nodeapp:nodeapp src ./src
COPY --chown=nodeapp:nodeapp tsconfig.json ./
COPY --chown=nodeapp:nodeapp nest-cli.json ./

# Executa a compilação da aplicação (gerando os arquivos em dist/)
RUN npm run build

# Muda para o usuário não-root para rodar a aplicação
USER nodeapp

# Expõe a porta da aplicação (3000 é a porta padrão do NestJS)
EXPOSE 3000

# Define o comando de execução da aplicação (start em produção)
CMD ["npm", "run", "start"]
