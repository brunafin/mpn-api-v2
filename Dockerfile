FROM node:20-slim

# Cria um usuário e grupo não-root
RUN groupadd -r nodeapp && useradd -m -r -g nodeapp nodeapp

# Define diretório de trabalho
WORKDIR /usr/src/app

# Copia arquivos de dependência e ajusta propriedade
COPY --chown=nodeapp:nodeapp package*.json ./

# Remove permissões de escrita dos arquivos sensíveis
RUN chmod 444 package.json package-lock.json || true

# Instala dependências com segurança
RUN npm install --ignore-scripts

# Copia o restante da aplicação com segurança
COPY --chown=nodeapp:nodeapp . .

# Compila a aplicação
RUN npm run build

# Troca para o usuário seguro
USER nodeapp

# Expõe a porta da aplicação
EXPOSE 3000

# Comando padrão de inicialização
CMD ["npm", "run", "start"]
