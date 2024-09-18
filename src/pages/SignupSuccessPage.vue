<!-- SignupSuccessPage.vue -->
<template>
  <div class="q-pa-md q-my-xl flex flex-center">
    <q-card class="q-pa-xl text-center success-card">
      <q-card-section>
        <q-icon name="check_circle" size="8rem" color="green" />
        <div class="text-h4 q-my-md">Cadastro realizado com sucesso!</div>
        <p class="text-subtitle1 q-my-md">
          Seu registro foi concluído com êxito. Agora você pode explorar todas as funcionalidades da plataforma.
        </p>
        <q-btn color="primary" size="lg" class="q-mt-lg" @click="goToHome">
          Ir para a homepage
        </q-btn>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

function goToHome() {
  router.push('/');
}
</script>

<style scoped>
.text-center {
  text-align: center;
}
.q-my-md {
  margin: 1rem 0;
}
.q-my-xl {
  margin: 4rem 0;
}
.success-card {
  max-width: 600px;
  width: 100%;
  border-radius: 12px;
  box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.1);
  background-color: #ffffff;
}
p {
  font-size: 1.1rem;
  color: #4a4a4a;
}
</style>
