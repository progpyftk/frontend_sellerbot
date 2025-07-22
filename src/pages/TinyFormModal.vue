<template>
  <q-dialog v-model="dialogVisible">
    <q-card style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">Conectar ao Tiny ERP</div>
        <div class="text-subtitle2">Informe os dados fornecidos no painel do Tiny.</div>
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <q-input :model-value="cnpj" label="CNPJ da Conta Tiny" filled readonly />
        <q-input v-model="form.client_id" label="Client ID" filled />
        <q-input v-model="form.client_secret" label="Client Secret" type="password" filled />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancelar" color="primary" @click="closeModal" />
        <q-btn label="Salvar e Conectar" color="primary" @click="submit" :loading="loading" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { api } from 'src/boot/axios'
import { useQuasar } from 'quasar'

const props = defineProps({
  modelValue: Boolean,
  mlAccountId: String,
  cnpj: String  // novo: cnpj vindo do componente pai
})

const emit = defineEmits(['update:modelValue'])

const dialogVisible = ref(props.modelValue)
const loading = ref(false)
const $q = useQuasar()

const form = ref({
  client_id: '',
  client_secret: ''
})

const redirect_uri = 'https://sellerbot-frontend-367123809032.us-central1.run.app/tiny/callback'

watch(() => props.modelValue, (newVal) => {
  dialogVisible.value = newVal
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

const closeModal = () => {
  dialogVisible.value = false
}

const submit = async () => {
  loading.value = true
  try {
    // monta o payload completo
    const payload = {
      client_id: form.value.client_id,
      client_secret: form.value.client_secret,
      cnpj: props.cnpj,
      redirect_uri
    }

    await api.post('/api/erps/tiny/setup/', payload)

    const authUrl = `https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/auth?` +
      `client_id=${encodeURIComponent(payload.client_id)}` +
      `&redirect_uri=${encodeURIComponent(payload.redirect_uri)}` +
      `&scope=openid&response_type=code&state=${props.mlAccountId}`

    window.location.href = authUrl
  } catch (error) {
    $q.notify({ message: 'Erro ao salvar ou redirecionar', color: 'negative' })
  } finally {
    loading.value = false
  }
}
</script>
