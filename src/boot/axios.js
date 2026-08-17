// src/boot/axios.js
import { boot } from "quasar/wrappers";
import axios from "axios";
import { setupInterceptors } from "./axiosInterceptors";

// Dev local: backend SellerBot rodando na 8001 (a 8000 está ocupada pelo
// Ruralytic em paralelo). NÃO usar import.meta.env.VITE_BACKEND_HOST aqui:
// tanto .env.development quanto .env.production já têm esse valor cravado
// (8000 e um host de um projeto GCP diferente do atual, respectivamente) e
// isso venceria o fallback abaixo em build-time, silenciosamente.
// Em produção o literal abaixo é substituído em runtime pelo docker-entrypoint.sh
// (sed troca VITE_BACKEND_HOST_PLACEHOLDER pelo valor de VITE_BACKEND_HOST do
// Cloud Run, setado em cloudbuild-frontend.yaml) — não remover/alterar esse
// literal sem atualizar o entrypoint também.
const apiBaseUrl =
  process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:8001"
    : "VITE_BACKEND_HOST_PLACEHOLDER";

// `indexes: null` serializa arrays como chave repetida (`?status=PAID&status=SHIPPED`),
// que é o formato lido por `request.query_params.getlist(...)` no Django. Sem isso o
// axios manda `?status[]=PAID` e o backend ignora o filtro em silêncio — foi assim que
// o filtro de status da página de pedidos Shopee parou de funcionar (FB-8).
const api = axios.create({
  baseURL: apiBaseUrl,
  paramsSerializer: { indexes: null },
});

export default boot(({ app, store }) => {
  setupInterceptors(store);

  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

export { api };
