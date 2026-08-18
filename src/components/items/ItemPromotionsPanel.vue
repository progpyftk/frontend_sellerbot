<template>
  <div class="promo-panel">
    <div class="row items-center q-mb-sm">
      <div class="text-overline text-grey-7">Promoções ativas</div>
      <q-space />
      <q-btn v-if="!loading" flat dense round size="sm" color="grey-6" icon="refresh"
        @click="load(true)">
        <q-tooltip anchor="top middle" self="bottom middle">Reconsultar no Mercado Livre</q-tooltip>
      </q-btn>
      <q-btn v-if="canWrite && removableCount > 1" flat dense size="sm" color="red-7"
        icon="layers_clear" label="Remover todas" class="q-ml-xs"
        :loading="removingAll" @click="confirmRemove(null)" />
    </div>

    <q-banner v-if="error" dense class="bg-red-1 text-red-9 rounded-borders q-mb-sm">
      <template v-slot:avatar><q-icon name="cloud_off" color="red-7" /></template>
      {{ error }}
      <template v-slot:action>
        <q-btn flat dense size="sm" color="red-9" label="Tentar de novo" @click="load(true)" />
      </template>
    </q-banner>

    <q-markup-table flat bordered class="bg-white" dense>
      <thead class="bg-grey-2">
        <tr>
          <th class="text-left">Campanha</th>
          <th class="text-center">Tipo</th>
          <th class="text-right">Preço promocional</th>
          <th class="text-center">Desconto</th>
          <th class="text-center">Ação</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="5" class="text-center text-caption text-grey-6 q-pa-md">
            <q-spinner-dots color="indigo" size="2em" /> Consultando o Mercado Livre...
          </td>
        </tr>
        <tr v-else-if="!promotions.length">
          <td colspan="5" class="text-center text-caption text-grey-6 q-pa-md">
            Nenhuma promoção ativa neste anúncio
          </td>
        </tr>
        <tr v-else v-for="promo in promotions" :key="promoKey(promo)">
          <td>
            <div class="text-body2 text-grey-9">{{ promo.name || 'Sem nome' }}</div>
            <div class="text-caption text-grey-6 font-mono">{{ promo.promotion_id || '—' }}</div>
            <div v-if="promo.status === 'pending'" class="text-caption text-orange-8">
              Aguardando início
            </div>
          </td>
          <td class="text-center">
            <q-badge color="purple-1" text-color="purple-9" class="promo-type">
              {{ promo.promotion_type }}
            </q-badge>
            <div v-if="promo.boosted_offer" class="q-mt-xs">
              <q-badge color="green-1" text-color="green-9">
                <q-icon name="bolt" size="11px" class="q-mr-xs" />boost ML
              </q-badge>
            </div>
          </td>
          <td class="text-right">
            <div class="text-weight-bold text-grey-9">{{ formatCurrency(promo.price) }}</div>
            <div v-if="promo.original_price" class="text-caption text-grey-5 price-strike">
              {{ formatCurrency(promo.original_price) }}
            </div>
          </td>
          <td class="text-center">
            <span v-if="promo.discount_pct != null" class="text-red-7 text-weight-bold">
              -{{ promo.discount_pct }}%
            </span>
            <span v-else class="text-grey-5">—</span>
            <!-- Campanha cofinanciada: só `seller_percentage` sai do bolso do
                 vendedor. Sem isso um SMART de 47% parece todo custo dele. -->
            <div v-if="promo.seller_percentage != null" class="text-caption text-grey-6">
              você {{ promo.seller_percentage }}%
              <span v-if="promo.meli_percentage != null">· ML {{ promo.meli_percentage }}%</span>
            </div>
          </td>
          <td class="text-center">
            <q-btn v-if="canWrite && promo.can_remove" unelevated dense size="sm"
              color="red-6" icon="delete_outline" label="Remover"
              :loading="removingKey === promoKey(promo)"
              :disable="!!removingKey || removingAll"
              @click="confirmRemove(promo)" />
            <template v-else-if="canWrite">
              <q-icon name="lock" size="16px" color="grey-6" />
              <q-tooltip class="bg-blue-grey-9" anchor="top middle" self="bottom middle"
                max-width="280px">
                {{ promo.removal_block_reason }}
              </q-tooltip>
            </template>
            <span v-else class="text-caption text-grey-5">—</span>

            <!-- Aviso de tipo que o ML costuma recusar ou gerencia sozinho: não
                 bloqueia o botão, só explica o risco antes do clique. -->
            <q-icon v-if="promo.removal_warning" name="info_outline" size="15px"
              color="amber-8" class="q-ml-xs">
              <q-tooltip class="bg-blue-grey-9" anchor="top middle" self="bottom middle"
                max-width="280px">
                {{ promo.removal_warning }}
              </q-tooltip>
            </q-icon>
          </td>
        </tr>
      </tbody>
    </q-markup-table>

    <!-- Resultado por promoção: o backend confirma no ML antes de dizer que
         removeu, então o que aparece aqui é o estado real do anúncio. -->
    <q-list v-if="results.length" dense class="q-mt-sm rounded-borders bg-white" bordered>
      <q-item v-for="(res, idx) in results" :key="idx">
        <q-item-section avatar min-width>
          <q-icon :name="res.ok ? 'check_circle' : 'error_outline'"
            :color="res.ok ? 'green-7' : 'red-6'" size="xs" />
        </q-item-section>
        <q-item-section class="text-caption"
          :class="res.ok ? 'text-grey-8' : 'text-red-9'">
          <span class="text-weight-medium">{{ res.promotion_type }}</span> — {{ res.message }}
        </q-item-section>
      </q-item>
    </q-list>

    <q-dialog v-model="showConfirm" persistent>
      <q-card style="min-width:min(420px, 95vw)">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="delete_outline" color="red-7" size="sm" class="q-mr-sm" />
          <div class="text-h6 text-grey-9">Remover promoção</div>
        </q-card-section>
        <q-card-section class="text-body2 text-grey-8">
          <template v-if="pending">
            Remover <b>{{ pending.name || pending.promotion_type }}</b> deste anúncio?
          </template>
          <template v-else>
            Remover as <b>{{ removableCount }}</b> promoções removíveis deste anúncio?
          </template>
          <q-banner v-if="pendingWarning" dense
            class="bg-amber-1 text-amber-9 rounded-borders q-mt-md">
            <template v-slot:avatar><q-icon name="info_outline" color="amber-8" /></template>
            {{ pendingWarning }}
          </q-banner>
          <div class="text-caption text-grey-6 q-mt-md">
            O preço volta ao valor cheio do anúncio assim que o Mercado Livre confirmar.
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md q-pt-none">
          <q-btn flat label="Cancelar" color="grey-7" v-close-popup />
          <q-btn unelevated label="Remover" color="red-6" @click="runRemove" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
/**
 * Promoções vivas de um anúncio, com remoção.
 *
 * Os dados vêm do Mercado Livre a cada abertura (o backend cacheia 60s). Toda
 * a regra de "esta promoção pode ser removida?" vem pronta do backend
 * (`can_remove`, `removal_block_reason`, `removal_warning`), justamente para
 * não duplicar aqui a matriz de tipos da API do ML.
 */
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import MercadoLivreService from 'src/services/MercadoLivreService'

const props = defineProps({
  itemId: { type: String, required: true },
  canWrite: { type: Boolean, default: false },
})
const emit = defineEmits(['changed'])

const $q = useQuasar()

const promotions = ref([])
const results = ref([])
const loading = ref(false)
const error = ref('')
const removingKey = ref('')
const removingAll = ref(false)
const showConfirm = ref(false)
const pending = ref(null)

const removableCount = computed(() => promotions.value.filter(p => p.can_remove).length)
const pendingWarning = computed(() => {
  if (pending.value) return pending.value.removal_warning || ''
  const avisos = promotions.value.filter(p => p.can_remove && p.removal_warning)
  return avisos.length ? avisos[0].removal_warning : ''
})

const promoKey = (promo) => `${promo.promotion_type}:${promo.promotion_id || ''}:${promo.offer_id || ''}`

const formatCurrency = (val) => (val || val === 0)
  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val))
  : '—'

const load = async (refresh = false) => {
  loading.value = true
  error.value = ''
  try {
    const { data } = await MercadoLivreService.getItemPromotions(
      props.itemId, refresh ? { refresh: true } : {},
    )
    promotions.value = data.data || []
  } catch (e) {
    promotions.value = []
    error.value = e.response?.data?.error || 'Não foi possível consultar as promoções no Mercado Livre.'
  } finally {
    loading.value = false
  }
}

const confirmRemove = (promo) => {
  pending.value = promo
  showConfirm.value = true
}

const runRemove = async () => {
  showConfirm.value = false
  const alvo = pending.value
  results.value = []
  if (alvo) removingKey.value = promoKey(alvo)
  else removingAll.value = true

  try {
    const payload = alvo
      ? {
          promotions: [{
            promotion_type: alvo.promotion_type,
            promotion_id: alvo.promotion_id,
            offer_id: alvo.offer_id,
          }],
        }
      : { all: true }

    // 207 = removeu parte; o axios resolve normalmente e "results" explica o resto.
    const { data } = await MercadoLivreService.removeItemPromotions(props.itemId, payload)
    promotions.value = data.promotions || []
    results.value = data.results || []

    if (data.success) {
      $q.notify({ type: 'positive', message: 'Promoção removida e confirmada no Mercado Livre.' })
    } else {
      const falha = (data.results || []).find(r => !r.ok)
      $q.notify({
        type: 'warning',
        timeout: 8000,
        message: falha?.message || 'O Mercado Livre não confirmou a remoção.',
      })
    }
    // Preço e badges da linha mudaram: pede recarga do detalhe ao pai.
    emit('changed')
  } catch (e) {
    $q.notify({
      type: 'negative',
      timeout: 8000,
      message: e.response?.data?.error || 'Falha ao remover a promoção.',
    })
  } finally {
    removingKey.value = ''
    removingAll.value = false
    pending.value = null
  }
}

watch(() => props.itemId, () => load(), { immediate: true })
</script>

<style scoped>
.promo-panel {
  width: 100%;
}

.promo-type {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.price-strike {
  text-decoration: line-through;
}

.font-mono {
  font-family: 'Roboto Mono', monospace;
  font-size: 10px;
}
</style>
