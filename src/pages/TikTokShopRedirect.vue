<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="bg-gradient flex flex-center">
        <q-card class="auth-card q-pa-lg">
          <q-card-section class="text-center">
            <q-avatar size="80px" class="q-mb-md" color="grey-3">
              <q-icon name="smart_display" color="grey-10" size="48px" />
            </q-avatar>
            <h4 class="text-weight-bold q-mt-none q-mb-md">Autenticação TikTok Shop</h4>

            <transition appear enter-active-class="animated fadeIn">
              <div v-if="state === 'loading'" key="loading">
                <q-spinner-dots color="grey-8" size="3rem" />
                <p class="text-h6 q-mt-md">Conectando sua loja...</p>
                <p class="text-grey-6">Por favor, aguarde...</p>
              </div>

              <div v-else-if="state === 'success'" key="success">
                <q-icon name="check_circle" color="positive" size="3rem" />
                <p class="text-h6 q-mt-md text-positive">Loja conectada!</p>
                <p class="text-grey-7">{{ shopName }}</p>
                <p class="text-grey-5 text-caption">Redirecionando...</p>
              </div>

              <div v-else-if="state === 'error'" key="error">
                <q-icon name="error" color="negative" size="3rem" />
                <p class="text-h6 q-mt-md text-negative">Falha na conexão</p>
                <p class="text-grey-6 text-caption">{{ errorMsg }}</p>
                <q-btn
                  flat
                  color="grey-8"
                  label="Voltar"
                  class="q-mt-md"
                  @click="$router.push('/app/accounts?tab=tiktokshop')"
                />
              </div>
            </transition>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import TikTokShopService from 'src/services/TikTokShopService'

const $q = useQuasar()
const router = useRouter()

const state = ref('loading')
const shopName = ref('')
const errorMsg = ref('')

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')

  if (!code) {
    state.value = 'error'
    errorMsg.value = 'Parâmetros de autorização incompletos. Tente conectar novamente.'
    return
  }

  try {
    const res = await TikTokShopService.callback({ code })

    shopName.value = res.data.shop_name || 'TikTok Shop'
    state.value = 'success'

    $q.notify({ type: 'positive', message: `Loja "${shopName.value}" conectada com sucesso!`, position: 'top' })

    setTimeout(() => router.push('/app/accounts?tab=tiktokshop'), 1500)

  } catch (e) {
    state.value = 'error'
    errorMsg.value = e?.response?.data?.error || e.message || 'Erro desconhecido.'
    $q.notify({ type: 'negative', message: 'Falha ao conectar a loja. Tente novamente.', position: 'top' })
  }
})
</script>

<style lang="scss" scoped>
.bg-gradient {
  background: linear-gradient(135deg, #010101 0%, #333 100%);
  min-height: 100vh;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
</style>
