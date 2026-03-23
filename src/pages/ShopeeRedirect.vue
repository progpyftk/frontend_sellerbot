<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="bg-gradient flex flex-center">
        <q-card class="auth-card q-pa-lg">
          <q-card-section class="text-center">
            <q-avatar size="80px" class="q-mb-md" color="orange-2">
              <q-icon name="storefront" color="orange-9" size="48px" />
            </q-avatar>
            <h4 class="text-weight-bold q-mt-none q-mb-md">Autenticação Shopee</h4>

            <transition appear enter-active-class="animated fadeIn">
              <div v-if="state === 'loading'" key="loading">
                <q-spinner-dots color="orange" size="3rem" />
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
                  color="orange"
                  label="Voltar"
                  class="q-mt-md"
                  @click="$router.push('/app/accounts?tab=shopee')"
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
import ShopeeService from 'src/services/ShopeeService'

const $q = useQuasar()
const router = useRouter()

const state = ref('loading')
const shopName = ref('')
const errorMsg = ref('')

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')
  const shop_id = urlParams.get('shop_id')

  const partner_id = sessionStorage.getItem('shopee_partner_id')
  const partner_key = sessionStorage.getItem('shopee_partner_key')

  if (!code || !shop_id || !partner_id || !partner_key) {
    state.value = 'error'
    errorMsg.value = 'Parâmetros de autorização incompletos. Tente conectar novamente.'
    return
  }

  try {
    const res = await ShopeeService.callback({ partner_id, partner_key, code, shop_id })

    sessionStorage.removeItem('shopee_partner_id')
    sessionStorage.removeItem('shopee_partner_key')

    shopName.value = res.data.shop_name || `Loja ${shop_id}`
    state.value = 'success'

    $q.notify({ type: 'positive', message: `Loja "${shopName.value}" conectada com sucesso!`, position: 'top' })

    setTimeout(() => router.push('/app/accounts?tab=shopee'), 1500)

  } catch (e) {
    state.value = 'error'
    errorMsg.value = e?.response?.data?.error || e.message || 'Erro desconhecido.'
    $q.notify({ type: 'negative', message: 'Falha ao conectar a loja. Tente novamente.', position: 'top' })
  }
})
</script>

<style lang="scss" scoped>
.bg-gradient {
  background: linear-gradient(135deg, #ff6600 0%, #ee4d2d 100%);
  min-height: 100vh;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
</style>
