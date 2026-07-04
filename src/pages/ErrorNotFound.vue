<template>
  <q-page class="sb-error-page">
    <div class="sb-error-inner">
      <div class="sb-error-mark">
        <q-icon name="rocket_launch" size="32px" />
      </div>
      <div class="sb-error-code">404</div>
      <h1 class="sb-error-title">Página não encontrada</h1>
      <p class="sb-error-message">
        O endereço que você procura não existe ou foi movido. Verifique a URL ou volte para o painel principal.
      </p>
      <div class="sb-error-actions">
        <q-btn unelevated color="primary" no-caps label="Voltar ao Dashboard" to="/app/dashboard" class="sb-error-btn" />
        <q-btn flat color="primary" no-caps label="Ir para a Home" to="/" class="sb-error-btn" />
      </div>
    </div>
  </q-page>
</template>

<script setup>
defineOptions({ name: 'ErrorNotFound' });
</script>

<style lang="scss" scoped>
.sb-error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  padding: 24px;
}

.sb-error-inner {
  text-align: center;
  max-width: 480px;
}

.sb-error-mark {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #0d9488, #14b8a6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  box-shadow: 0 8px 24px rgba(13, 148, 136, 0.25);
}

.sb-error-code {
  font-size: 96px;
  font-weight: 800;
  color: #0d9488;
  line-height: 1;
  letter-spacing: -3px;
  opacity: 0.20;
  margin-bottom: 8px;
}

.sb-error-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 12px;
  letter-spacing: -0.4px;
}

.sb-error-message {
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
  margin: 0 0 32px;
}

.sb-error-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.sb-error-btn {
  font-weight: 600 !important;
  border-radius: 8px !important;
  padding: 8px 20px !important;
}
</style>
