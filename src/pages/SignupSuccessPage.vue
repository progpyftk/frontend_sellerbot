<template>
  <q-page class="flex flex-center bg-grey-1">
    <q-card class="success-card q-pa-lg">
      <q-card-section class="text-center">
        <q-icon name="check_circle" size="100px" color="positive" />
        <h4 class="text-h4 q-mt-md q-mb-sm">Cadastro realizado com sucesso!</h4>
        <p class="text-body1 q-mb-lg">
          Seu registro foi concluído com êxito. Agora você pode explorar todas as
          funcionalidades da plataforma.
        </p>
        <q-btn
          color="primary"
          label="Ir para a homepage"
          @click="goToHome"
          size="lg"
          unelevated
          class="full-width"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useQuasar } from "quasar";
import { onMounted } from "vue";

const router = useRouter();
const $q = useQuasar();

const notify = (message, type = "positive") => {
  $q.notify({
    message,
    type,
    position: "top",
    timeout: 3000,
    actions: [{ icon: "close", color: "white" }],
  });
};

function goToHome() {
  router.push("/");
}

onMounted(() => {
  notify("Bem-vindo! Seu cadastro foi concluído com sucesso.");
});
</script>

<style lang="scss" scoped>
.success-card {
  width: 100%;
  max-width: 500px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.1);
  }

  .q-icon {
    transition: transform 0.3s ease;
    &:hover {
      transform: scale(1.1);
    }
  }
}

.text-body1 {
  color: $grey-7;
  line-height: 1.6;
}

.q-btn {
  transition: background-color 0.3s ease;
  &:hover {
    background-color: darken($primary, 10%);
  }
}
</style>
