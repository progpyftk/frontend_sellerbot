<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="bg-gradient flex flex-center">
        <q-card class="auth-card q-pa-lg">
          <q-card-section class="text-center">
            <q-avatar size="80px" color="orange-2" class="q-mb-md">
              <q-icon name="receipt_long" color="orange" size="50px" />
            </q-avatar>
            <h4 class="text-weight-bold q-mt-none q-mb-md">Integração Tiny ERP</h4>

            <transition appear enter-active-class="animated fadeIn">
              <!-- Sucesso -->
              <div v-if="status === 'success'" key="success">
                <q-icon name="check_circle" color="positive" size="3rem" />
                <p class="text-h6 q-mt-md">Tiny conectado com sucesso!</p>
                <p class="q-mb-lg text-grey-7">Redirecionando para a página de contas...</p>
              </div>

              <!-- Erro -->
              <div v-else-if="status === 'error'" key="error">
                <q-icon name="error" color="negative" size="3rem" />
                <p class="text-h6 q-mt-md">Falha na autenticação</p>
                <p class="q-mb-lg text-grey-7">{{ errorMessage }}</p>
                <q-btn color="orange" label="Voltar para contas" @click="goToAccounts" unelevated />
              </div>

              <!-- Processando -->
              <div v-else key="loading">
                <q-spinner-dots color="orange" size="3rem" />
                <p class="text-h6 q-mt-md">Autenticando com o Tiny...</p>
                <p class="text-grey-7">Por favor, aguarde...</p>
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
import { useQuasar } from 'quasar'
import { api } from 'src/boot/axios'

const $q     = useQuasar()
const status = ref('loading')   // 'loading' | 'success' | 'error'
const errorMessage = ref('')

const goToAccounts = () => {
  window.location.href = '/app/accounts'
}

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const code  = params.get('code')
  const cnpj  = params.get('state')   // state = CNPJ, enviado na URL de autorização

  if (!code || !cnpj) {
    status.value = 'error'
    errorMessage.value = 'Parâmetros inválidos retornados pelo Tiny. Tente novamente.'
    return
  }

  try {
    const { data } = await api.post('/api/erps/tiny/callback/', { code, state: cnpj })

    if (data.success) {
      status.value = 'success'
      $q.notify({ type: 'positive', message: 'Tiny ERP conectado!', position: 'top', timeout: 1500 })
      setTimeout(goToAccounts, 1500)
    } else {
      status.value = 'error'
      errorMessage.value = data.error || 'Erro desconhecido.'
    }
  } catch (err) {
    console.error('Erro no callback Tiny:', err)
    status.value = 'error'
    errorMessage.value = err?.response?.data?.error || 'Erro ao comunicar com o servidor.'
  }
})
</script>

<style lang="scss" scoped>
.bg-gradient {
  background: linear-gradient(135deg, #e65100 0%, #ff9800 100%);
  min-height: 100vh;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
}
</style>
