// src/boot/axios.js
import { boot } from "quasar/wrappers";
import axios from "axios";
import { setupInterceptors } from "./axiosInterceptors";

const apiBaseUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "VITE_BACKEND_HOST_PLACEHOLDER";

const api = axios.create({ baseURL: apiBaseUrl });

export default boot(({ app, store }) => {
  setupInterceptors(store);

  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

export { api };
