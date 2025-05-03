FROM node:20-slim

# Cria um usuário e grupo não-root
RUN groupadd -r nodeapp && useradd -m -r -g nodeapp nodeapp

# Define diretório de trabalho
WORKDIR /usr/src/app

# Copia arquivos de dependência com segurança (sem permissões de escrita para o runtime)
COPY --chown=root:root --chmod=644 package*.json ./

# Instala dependências com scripts desativados para evitar execuções indesejadas
RUN npm install --ignore-scripts

# Copia restante do projeto com permissões para o usuário de execução
COPY --chown=nodeapp:nodeapp . .

# Compila a aplicação
RUN npm run build

# Define o usuário que executará o container
USER nodeapp

# Expõe a porta da aplicação
EXPOSE 3000

# Comando de execução padrão
CMD ["npm", "run", "start"]
