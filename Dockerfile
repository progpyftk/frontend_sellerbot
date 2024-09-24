# Etapa 1: Usar a imagem do Node.js para fazer o build
FROM node:18-alpine AS build-stage

# Definir o diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema necessárias (opcional)
RUN apk add --no-cache python3 make g++

# Atualizar npm e instalar Quasar CLI globalmente
RUN npm install -g npm@latest @quasar/cli && npm cache clean --force

# Copiar apenas os arquivos necessários para instalar dependências
COPY package*.json ./

# Usar npm ci para instalação determinística
RUN npm ci --ignore-scripts

# Copiar o restante dos arquivos do projeto
COPY . .

# Fazer o build para produção
RUN quasar build

# Etapa 2: Configurar Nginx
FROM nginx:alpine AS production-stage

# Copiar o arquivo de configuração do Nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copiar os arquivos estáticos gerados pelo Quasar para o Nginx
COPY --from=build-stage /app/dist/spa/ /usr/share/nginx/html/

# Adicionar script de entrada personalizado
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expor a porta 8080 para o servidor Nginx
EXPOSE 8080

# Definir o ponto de entrada e iniciar o Nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
