// src/boot/pinia.js

import { boot } from "quasar/wrappers";
import { createPinia } from "pinia";

export default boot(({ app, router }) => {
  const pinia = createPinia();

  // Plugin que adiciona $api e $router a todos os stores
  pinia.use(({ store }) => {
    store.$api = app.config.globalProperties.$api;
    store.$router = router;
  });

  app.use(pinia);
});
