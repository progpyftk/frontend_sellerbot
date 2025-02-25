#!/bin/sh

# Definir um valor padrão para VITE_BACKEND_HOST se não estiver definido
VITE_BACKEND_HOST=${VITE_BACKEND_HOST:-http://localhost:8000}

# Substituir o placeholder nos arquivos JavaScript gerados pelo build
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i "s|VITE_BACKEND_HOST_PLACEHOLDER|$VITE_BACKEND_HOST|g" {} +

# Executar o comando original (iniciar o Nginx)
exec "$@"
