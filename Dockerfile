# Etapa 1: Usar a imagem do Node.js para fazer o build
FROM node:20-alpine AS build-stage

WORKDIR /app

# Atualizar npm e instalar Quasar CLI globalmente
RUN npm install -g npm@latest @quasar/cli

# Copiar apenas os arquivos necessários para instalar dependências
COPY package*.json ./
RUN npm ci

# Copiar o restante dos arquivos do projeto
COPY . .

# Fazer o build para produção
RUN quasar build

# Etapa 2: Configurar Nginx
FROM nginx:alpine AS production-stage

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=build-stage /app/dist/spa/ /usr/share/nginx/html/

# Adicionar script de entrada
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
