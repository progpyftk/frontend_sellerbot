<template>
  <q-page class="q-pa-xl">
    <!-- Título -->
    <div class="row items-center q-gutter-sm q-mb-xl">
      <q-icon name="photo_camera" size="38px" color="primary" />
      <h3 class="q-mb-none text-primary text-weight-bold">
        Atualizar Fotos em Massa
      </h3>
    </div>

    <!-- STEPPER -->
    <q-stepper v-model="step" vertical color="primary" animated class="bg-grey-1 rounded-borders shadow-2">

      <!-- 1. Upload -->
      <q-step name="1" title="Enviar fotos" icon="cloud_upload">
        <q-file v-model="files" accept="image/*" label="Arraste ou clique" multiple outlined use-chips
          @update:model-value="onFileChange" class="full-width" />
        <q-btn label="Próximo" color="primary" class="q-mt-md" :disable="files.length === 0" @click="step = '2'" />
      </q-step>

      <!-- 2. Capa -->
      <q-step name="2" title="Definir capa" icon="star">
        <div class="row q-col-gutter-md">
          <div v-for="(url, idx) in previews" :key="idx" class="col-xs-6 col-sm-3">
            <q-card flat bordered class="cursor-pointer" :class="mainPhoto === idx ? 'bg-primary text-white' : ''"
              @click="mainPhoto = idx">
              <q-img :src="url" ratio="1" />
              <q-card-section class="text-center text-caption">
                <q-icon :name="mainPhoto === idx ? 'star' : 'star_border'" size="18px" />
                {{ mainPhoto === idx ? 'Capa' : 'Definir' }}
              </q-card-section>
            </q-card>
          </div>
        </div>

        <div class="row q-gutter-sm q-mt-md">
          <q-btn label="Voltar" flat @click="step = '1'" />
          <q-btn label="Próximo" color="primary" :disable="previews.length === 0" @click="step = '3'" />
        </div>
      </q-step>

      <!-- 3. Buscar -->
      <q-step name="3" title="Buscar anúncios" icon="search">
        <div class="row items-end q-col-gutter-sm">
          <q-input v-model="sku" label="SKU" outlined dense class="col" />
          <q-btn label="Buscar" color="primary" :loading="loadingSearch" @click="buscarAnuncios" />
        </div>

        <div class="row q-gutter-sm q-mt-md">
          <q-btn label="Voltar" flat @click="step = '2'" />
          <q-btn label="Próximo" color="primary" :disable="anuncios.length === 0" @click="step = '4'" />
        </div>
      </q-step>

      <!-- 4. Selecionar -->
      <q-step name="4" title="Selecionar anúncios" icon="checklist">
        <q-banner v-if="anuncios.length" dense class="bg-grey-3 text-dark q-mb-sm">
          {{ anuncios.length }} anúncio(s) encontrado(s) para SKU "{{ sku }}"
        </q-banner>

        <q-table v-if="anuncios.length" :rows="anuncios" :columns="cols" row-key="row_id" selection="multiple"
          v-model:selected="selecionados" dense flat bordered hide-bottom>
          <template #body-cell-title="p">
            <q-td :props="p">
              <div class="text-weight-bold">{{ p.row.title }}</div>
              <div class="text-caption text-grey">
                Item: {{ p.row.item_id }}
              </div>
            </q-td>
          </template>
          <template #body-cell-variation="p">
            <q-td :props="p">
              <q-badge v-if="p.row.is_variation" color="orange" label="Variação" />
              <q-badge v-else label="Anúncio" color="blue" />
            </q-td>
          </template>
        </q-table>

        <div v-if="anuncios.length === 0 && !loadingSearch" class="text-center text-grey q-my-md">
          Nenhum anúncio carregado.
        </div>

        <div class="row q-gutter-sm q-mt-md">
          <q-btn label="Voltar" flat @click="step = '3'" />
          <q-btn label="Próximo" color="primary" :disable="selecionados.length === 0" @click="step = '5'" />
        </div>
      </q-step>

      <!-- 5. Aplicar -->
      <q-step name="5" title="Aplicar fotos" icon="publish">
        <div class="text-body1 q-mb-md">
          Vai atualizar <strong>{{ selecionados.length }}</strong>
          anúncio(s) com <strong>{{ previews.length }}</strong> foto(s).
        </div>

        <q-btn label="Atualizar Agora" color="positive" :loading="loadingApply" @click="atualizarFotos" />
        <q-btn label="Voltar" flat class="q-ml-sm" @click="step = '4'" />
      </q-step>
    </q-stepper>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

/* ------- state ------- */
const step = ref('1')
const files = ref([])
const previews = ref([])
const mainPhoto = ref(0)
const sku = ref('')
const anuncios = ref([])
const selecionados = ref([])

const loadingSearch = ref(false)
const loadingApply = ref(false)
const $q = useQuasar()

/* tabela */
const cols = [
  { name: 'title', label: 'Título', field: 'title', align: 'left' },
  { name: 'variation', label: 'Tipo', field: 'is_variation', align: 'center' }
]

/* ------- handlers ------- */
function onFileChange() {
  previews.value = files.value.map(f => URL.createObjectURL(f))
  mainPhoto.value = 0
}

async function buscarAnuncios() {
  if (!sku.value) {
    $q.notify({ type: 'warning', message: 'Informe o SKU!' })
    return
  }
  loadingSearch.value = true
  try {
    const { data } = await api.get('/mercadolivre/anuncios/', { params: { sku: sku.value } })
    // row_id garante chave única mesmo para variações
    anuncios.value = (data || []).map(r => ({
      ...r,
      row_id: r.item_id + (r.variation_id ?? '')
    }))
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Erro ao buscar anúncios' })
  } finally {
    loadingSearch.value = false
  }
}

async function atualizarFotos() {
  loadingApply.value = true
  try {
    /* reordena fotos conforme mainPhoto */
    const ordered = previews.value.slice()
    ordered.unshift(ordered.splice(mainPhoto.value, 1)[0])

    const payload = {
      item_ids: selecionados.value.map(r => r.item_id),
      variation_ids: selecionados.value.map(r => r.variation_id ?? null),
      photos: ordered,   // trocar depois por URLs reais
      main_photo_index: 0       // já está na posição 0
    }

    await api.post('/mercadolivre/atualizar-fotos-em-massa/', payload)

    $q.notify({ type: 'positive', message: 'Fotos atualizadas com sucesso!' })

    /* reset */
    step.value = '1'
    files.value = []
    previews.value = []
    anuncios.value = []
    selecionados.value = []
    sku.value = ''
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Falha ao atualizar fotos' })
  } finally {
    loadingApply.value = false
  }
}
</script>

<style scoped>
.q-stepper {
  max-width: 900px;
  margin: 0 auto;
}
</style>
