<template>
  <q-dialog :model-value="modelValue" @update:model-value="v => emit('update:modelValue', v)" persistent>
    <q-card style="width: min(760px, 95vw)">
      <q-card-section class="row items-center no-wrap">
        <div class="col">
          <div class="text-h6">Faixas de preço</div>
          <div class="text-caption text-grey-7">
            {{ carrier?.name }} · o peso mínimo entra na faixa e o máximo não (última faixa pode ficar aberta).
          </div>
        </div>
        <q-btn flat round dense icon="close" aria-label="Fechar" v-close-popup />
      </q-card-section>

      <q-separator />

      <q-card-section>
        <SbEmptyState v-if="loading" variant="loading" title="Carregando faixas..." />
        <SbEmptyState
          v-else-if="!tiers.length"
          title="Nenhuma faixa cadastrada"
          message="Sem faixas, a auditoria não consegue calcular o custo teórico."
        />

        <SbTable v-else>
          <thead>
            <tr>
              <th>De (kg)</th>
              <th>Até (kg)</th>
              <th>Valor fixo</th>
              <th>Adicional/kg</th>
              <th class="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(tier, index) in tiers" :key="tier._key">
              <td>
                <q-input
                  v-model="tier.min_weight_kg" type="number" step="0.01" min="0"
                  dense borderless :disable="saving" placeholder="0"
                  :aria-label="`Peso mínimo da faixa ${index + 1}`"
                />
              </td>
              <td>
                <q-input
                  v-model="tier.max_weight_kg" type="number" step="0.01" min="0"
                  dense borderless :disable="saving" placeholder="aberto"
                  :aria-label="`Peso máximo da faixa ${index + 1}`"
                  hint="vazio = sem limite"
                />
              </td>
              <td>
                <q-input
                  v-model="tier.base_price" type="number" step="0.01" min="0"
                  dense borderless :disable="saving" prefix="R$"
                  :aria-label="`Valor fixo da faixa ${index + 1}`"
                />
              </td>
              <td>
                <q-input
                  v-model="tier.additional_per_kg" type="number" step="0.01" min="0"
                  dense borderless :disable="saving" prefix="R$"
                  :aria-label="`Adicional por kg da faixa ${index + 1}`"
                />
              </td>
              <td class="text-right no-wrap">
                <q-btn
                  flat dense color="teal-7" :label="tier.id ? 'Salvar' : 'Criar'"
                  :loading="saving" :disable="saving" @click="saveTier(tier)"
                />
                <q-btn
                  flat dense round icon="delete" color="negative" :disable="saving"
                  :aria-label="`Excluir faixa ${index + 1}`"
                  @click="removeTier(tier)"
                >
                  <q-tooltip>Excluir faixa</q-tooltip>
                </q-btn>
              </td>
            </tr>
          </tbody>
        </SbTable>

        <div v-if="errorMessage" class="text-negative text-caption q-mt-sm">
          <q-icon name="error_outline" class="q-mr-xs" />{{ errorMessage }}
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="between">
        <q-btn flat color="teal-7" icon="add" label="Nova faixa" :disable="loading" @click="addTier" />
        <q-btn flat label="Concluído" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbTable from 'src/components/common/SbTable.vue'
import DeliveryCarrierService from 'src/services/DeliveryCarrierService'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  carrier: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const $q = useQuasar()
const tiers = ref([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
let keySeed = 0

const blankTier = () => ({
  _key: `new-${keySeed++}`,
  id: null,
  min_weight_kg: '',
  max_weight_kg: '',
  base_price: '',
  additional_per_kg: '',
})

function normalize(tier) {
  return {
    min_weight_kg: tier.min_weight_kg === '' || tier.min_weight_kg === null ? null : Number(tier.min_weight_kg),
    max_weight_kg: tier.max_weight_kg === '' || tier.max_weight_kg === null ? null : Number(tier.max_weight_kg),
    base_price: tier.base_price === '' || tier.base_price === null ? 0 : Number(tier.base_price),
    additional_per_kg:
      tier.additional_per_kg === '' || tier.additional_per_kg === null ? 0 : Number(tier.additional_per_kg),
  }
}

function validate(tier) {
  const data = normalize(tier)
  if (data.min_weight_kg === null || Number.isNaN(data.min_weight_kg) || data.min_weight_kg < 0) {
    return 'Informe o peso mínimo (maior ou igual a zero).'
  }
  if (data.max_weight_kg !== null && data.max_weight_kg <= data.min_weight_kg) {
    return 'O peso máximo deve ser maior que o mínimo (ou vazio, para faixa aberta).'
  }
  const start = data.min_weight_kg
  const end = data.max_weight_kg === null ? Number.POSITIVE_INFINITY : data.max_weight_kg
  const collides = tiers.value.some((other) => {
    if (other._key === tier._key) return false
    const otherData = normalize(other)
    if (otherData.min_weight_kg === null) return false
    const otherEnd = otherData.max_weight_kg === null ? Number.POSITIVE_INFINITY : otherData.max_weight_kg
    return start < otherEnd && otherData.min_weight_kg < end
  })
  if (collides) return 'Esta faixa se sobrepõe a outra já cadastrada.'
  return ''
}

async function load() {
  if (!props.carrier?.id) return
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await DeliveryCarrierService.listRateTiers(props.carrier.id)
    const rows = data?.results || data || []
    tiers.value = rows.map((tier) => ({ ...tier, _key: `tier-${tier.id}-${keySeed++}` }))
  } catch {
    errorMessage.value = 'Não foi possível carregar as faixas desta transportadora.'
  } finally {
    loading.value = false
  }
}

function addTier() {
  errorMessage.value = ''
  tiers.value.push(blankTier())
}

async function saveTier(tier) {
  const problem = validate(tier)
  if (problem) {
    errorMessage.value = problem
    return
  }
  saving.value = true
  errorMessage.value = ''
  try {
    const payload = normalize(tier)
    if (tier.id) {
      await DeliveryCarrierService.updateRateTier(props.carrier.id, tier.id, payload)
    } else {
      await DeliveryCarrierService.createRateTier(props.carrier.id, payload)
    }
    $q.notify({ type: 'positive', message: 'Faixa salva.' })
    emit('saved')
    await load()
  } catch (error) {
    errorMessage.value =
      error?.response?.data?.detail ||
      error?.response?.data?.non_field_errors?.[0] ||
      'Não foi possível salvar a faixa. Verifique os valores informados.'
  } finally {
    saving.value = false
  }
}

function removeTier(tier) {
  const label = `Faixa ${tier.min_weight_kg ?? '?'}–${tier.max_weight_kg ?? 'aberto'} kg`
  $q.dialog({ title: 'Excluir faixa?', message: label, cancel: true, persistent: true }).onOk(async () => {
    errorMessage.value = ''
    try {
      if (tier.id) await DeliveryCarrierService.removeRateTier(props.carrier.id, tier.id)
      else tiers.value = tiers.value.filter((item) => item._key !== tier._key)
      $q.notify({ type: 'positive', message: 'Faixa excluída.' })
      emit('saved')
      if (tier.id) await load()
    } catch {
      errorMessage.value = 'Não foi possível excluir a faixa.'
    }
  })
}

watch(
  () => [props.modelValue, props.carrier?.id],
  () => {
    if (props.modelValue) load()
  },
  { immediate: true },
)
</script>
