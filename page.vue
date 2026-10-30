<template>
  <q-page class="bg-gradient-to-br from-grey-1 to-grey-2 min-h-screen">
    <div class="container q-pa-lg">
      <!-- Enhanced Header -->
      <div class="header-section q-mb-xl">
        <div class="row items-center justify-between">
          <div class="row items-center q-gutter-md">
            <div class="icon-wrapper">
              <q-icon name="photo_camera" size="42px" color="white" />
            </div>
            <div>
              <h3 class="text-h4 q-mb-none text-weight-bold text-grey-8">
                Atualizar Fotos em Massa
              </h3>
              <p class="text-body2 text-grey-6 q-mb-none q-mt-xs">
                Faça upload e atualize fotos de múltiplos anúncios de uma só vez
              </p>
            </div>
          </div>
          <div class="progress-indicator">
            <q-circular-progress
              :value="stepProgress"
              size="60px"
              :thickness="0.15"
              color="primary"
              track-color="grey-3"
              class="text-primary"
            >
              {{ Math.round(stepProgress) }}%
            </q-circular-progress>
          </div>
        </div>
      </div>

      <!-- Enhanced Stepper -->
      <q-stepper
        v-model="step"
        vertical
        color="primary"
        animated
        class="modern-stepper"
      >
        <!-- Step 1: Upload with improved design -->
        <q-step 
          name="1" 
          title="Enviar Fotos" 
          icon="cloud_upload"
          :done="step > '1'"
          class="step-section"
        >
          <div class="step-content">
            <p class="text-body1 text-grey-7 q-mb-lg">
              Selecione as fotos que deseja usar nos seus anúncios
            </p>
            
            <!-- Enhanced File Upload -->
            <div class="upload-area" :class="{ 'has-files': files.length > 0 }">
              <q-file
                v-model="files"
                accept="image/*"
                multiple
                outlined
                use-chips
                @update:model-value="onFileChange"
                class="full-width"
              >
                <template v-slot:prepend>
                  <q-icon name="cloud_upload" size="24px" />
                </template>
                <template v-slot:hint>
                  Formatos aceitos: JPG, PNG, GIF (máx. 10MB cada)
                </template>
              </q-file>
              
              <!-- File Preview Grid -->
              <div v-if="previews.length" class="preview-grid q-mt-lg">
                <div class="text-subtitle2 q-mb-md text-weight-medium">
                  {{ previews.length }} foto(s) selecionada(s)
                </div>
                <div class="row q-col-gutter-sm">
                  <div
                    v-for="(url, idx) in previews.slice(0, 4)"
                    :key="idx"
                    class="col-3"
                  >
                    <q-img
                      :src="url"
                      ratio="1"
                      class="rounded-borders shadow-1"
                      fit="cover"
                    />
                  </div>
                  <div v-if="previews.length > 4" class="col-3">
                    <div class="more-photos-indicator">
                      <q-icon name="add" size="24px" />
                      <div class="text-caption">+{{ previews.length - 4 }} fotos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="step-actions q-mt-xl">
              <q-btn
                label="Próximo"
                color="primary"
                size="lg"
                :disable="files.length === 0"
                @click="nextStep"
                class="action-btn"
              >
                <q-icon right name="arrow_forward" />
              </q-btn>
            </div>
          </div>
        </q-step>

        <!-- Step 2: Enhanced Cover Photo Selection -->
        <q-step 
          name="2" 
          title="Definir Capa" 
          icon="star"
          :done="step > '2'"
          class="step-section"
        >
          <div class="step-content">
            <p class="text-body1 text-grey-7 q-mb-lg">
              Escolha qual foto será a capa principal dos anúncios
            </p>

            <div class="photo-grid">
              <div
                v-for="(url, idx) in previews"
                :key="idx"
                class="photo-item"
                :class="{ 'selected': mainPhoto === idx }"
                @click="mainPhoto = idx"
              >
                <div class="photo-wrapper">
                  <q-img :src="url" ratio="1" fit="cover" />
                  <div class="photo-overlay">
                    <q-icon
                      :name="mainPhoto === idx ? 'star' : 'star_border'"
                      size="28px"
                      :color="mainPhoto === idx ? 'yellow-6' : 'white'"
                    />
                  </div>
                  <div class="photo-label">
                    {{ mainPhoto === idx ? 'Foto Principal' : 'Definir como capa' }}
                  </div>
                </div>
              </div>
            </div>

            <div class="step-actions q-mt-xl">
              <q-btn
                label="Voltar"
                flat
                size="lg"
                @click="prevStep"
                class="q-mr-sm"
              >
                <q-icon left name="arrow_back" />
              </q-btn>
              <q-btn
                label="Próximo"
                color="primary"
                size="lg"
                :disable="previews.length === 0"
                @click="nextStep"
                class="action-btn"
              >
                <q-icon right name="arrow_forward" />
              </q-btn>
            </div>
          </div>
        </q-step>

        <!-- Step 3: Enhanced Search -->
        <q-step 
          name="3" 
          title="Buscar Anúncios" 
          icon="search"
          :done="step > '3'"
          class="step-section"
        >
          <div class="step-content">
            <p class="text-body1 text-grey-7 q-mb-lg">
              Digite o SKU para encontrar os anúncios que deseja atualizar
            </p>

            <div class="search-section">
              <div class="row q-col-gutter-md items-end">
                <div class="col-8">
                  <q-input
                    v-model="sku"
                    label="SKU do Produto"
                    outlined
                    dense
                    class="search-input"
                    @keyup.enter="buscarAnuncios"
                  >
                    <template v-slot:prepend>
                      <q-icon name="inventory_2" />
                    </template>
                  </q-input>
                </div>
                <div class="col-4">
                  <q-btn
                    label="Buscar"
                    color="primary"
                    size="lg"
                    :loading="loadingSearch"
                    @click="buscarAnuncios"
                    class="full-width"
                  >
                    <q-icon right name="search" />
                  </q-btn>
                </div>
              </div>

              <!-- Search Results Summary -->
              <div v-if="anuncios.length" class="search-results-summary q-mt-lg">
                <q-banner class="bg-positive text-white rounded-borders">
                  <template v-slot:avatar>
                    <q-icon name="check_circle" color="white" />
                  </template>
                  Encontrados <strong>{{ anuncios.length }}</strong> anúncio(s) para o SKU "{{ sku }}"
                </q-banner>
              </div>
            </div>

            <div class="step-actions q-mt-xl">
              <q-btn
                label="Voltar"
                flat
                size="lg"
                @click="prevStep"
                class="q-mr-sm"
              >
                <q-icon left name="arrow_back" />
              </q-btn>
              <q-btn
                label="Próximo"
                color="primary"
                size="lg"
                :disable="anuncios.length === 0"
                @click="nextStep"
                class="action-btn"
              >
                <q-icon right name="arrow_forward" />
              </q-btn>
            </div>
          </div>
        </q-step>

        <!-- Step 4: Enhanced Selection -->
        <q-step 
          name="4" 
          title="Selecionar Anúncios" 
          icon="checklist"
          :done="step > '4'"
          class="step-section"
        >
          <div class="step-content">
            <p class="text-body1 text-grey-7 q-mb-lg">
              Selecione quais anúncios devem receber as novas fotos
            </p>

            <!-- Selection Summary -->
            <div v-if="selecionados.length" class="selection-summary q-mb-lg">
              <q-chip
                color="primary"
                text-color="white"
                icon="check_circle"
                size="lg"
              >
                {{ selecionados.length }} anúncio(s) selecionado(s)
              </q-chip>
            </div>

            <!-- Enhanced Table -->
            <div class="table-container">
              <q-table
                v-if="anuncios.length"
                :rows="anuncios"
                :columns="cols"
                row-key="item_id"
                selection="multiple"
                v-model:selected="selecionados"
                flat
                class="modern-table"
                :pagination="{ rowsPerPage: 10 }"
              >
                <template v-slot:body-cell-title="props">
                  <q-td :props="props" class="title-cell">
                    <div class="row items-center q-gutter-sm">
                      <q-avatar size="40px" class="bg-grey-3">
                        <q-icon name="inventory_2" color="grey-6" />
                      </q-avatar>
                      <div>
                        <div class="text-weight-bold text-grey-8">{{ props.row.title }}</div>
                        <div class="text-caption text-grey-6">
                          ID: {{ props.row.item_id }}
                        </div>
                      </div>
                    </div>
                  </q-td>
                </template>
                <template v-slot:body-cell-sku="props">
                  <q-td :props="props">
                    <q-chip
                      color="grey-3"
                      text-color="grey-8"
                      size="sm"
                    >
                      {{ props.row.sku }}
                    </q-chip>
                  </q-td>
                </template>
              </q-table>

              <div
                v-if="anuncios.length === 0 && !loadingSearch"
                class="empty-state"
              >
                <q-icon name="search_off" size="64px" color="grey-4" />
                <div class="text-h6 text-grey-5 q-mt-md">Nenhum anúncio encontrado</div>
                <div class="text-body2 text-grey-4">Tente buscar com um SKU diferente</div>
              </div>
            </div>

            <div class="step-actions q-mt-xl">
              <q-btn
                label="Voltar"
                flat
                size="lg"
                @click="prevStep"
                class="q-mr-sm"
              >
                <q-icon left name="arrow_back" />
              </q-btn>
              <q-btn
                label="Próximo"
                color="primary"
                size="lg"
                :disable="selecionados.length === 0"
                @click="nextStep"
                class="action-btn"
              >
                <q-icon right name="arrow_forward" />
              </q-btn>
            </div>
          </div>
        </q-step>

        <!-- Step 5: Enhanced Final Step -->
        <q-step 
          name="5" 
          title="Aplicar Fotos" 
          icon="publish"
          class="step-section"
        >
          <div class="step-content">
            <p class="text-body1 text-grey-7 q-mb-lg">
              Revise as informações antes de aplicar as alterações
            </p>

            <!-- Summary Cards -->
            <div class="summary-section q-mb-xl">
              <div class="row q-col-gutter-md">
                <div class="col-md-4 col-sm-6 col-xs-12">
                  <q-card flat class="summary-card bg-primary text-white">
                    <q-card-section class="text-center">
                      <q-icon name="photo_library" size="32px" class="q-mb-sm" />
                      <div class="text-h4 text-weight-bold">{{ previews.length }}</div>
                      <div class="text-body2">Foto(s)</div>
                    </q-card-section>
                  </q-card>
                </div>
                <div class="col-md-4 col-sm-6 col-xs-12">
                  <q-card flat class="summary-card bg-positive text-white">
                    <q-card-section class="text-center">
                      <q-icon name="inventory_2" size="32px" class="q-mb-sm" />
                      <div class="text-h4 text-weight-bold">{{ selecionados.length }}</div>
                      <div class="text-body2">Anúncio(s)</div>
                    </q-card-section>
                  </q-card>
                </div>
                <div class="col-md-4 col-sm-6 col-xs-12">
                  <q-card flat class="summary-card bg-orange text-white">
                    <q-card-section class="text-center">
                      <q-icon name="star" size="32px" class="q-mb-sm" />
                      <div class="text-h4 text-weight-bold">1</div>
                      <div class="text-body2">Foto Principal</div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="final-actions">
              <q-btn
                label="Voltar"
                flat
                size="lg"
                @click="prevStep"
                class="q-mr-md"
              >
                <q-icon left name="arrow_back" />
              </q-btn>
              <q-btn
                label="Atualizar Fotos Agora"
                color="positive"
                size="lg"
                :loading="loadingApply"
                @click="atualizarFotos"
                class="action-btn-final"
              >
                <q-icon right name="publish" />
              </q-btn>
            </div>
          </div>
        </q-step>
      </q-stepper>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { api } from 'boot/axios'

/* ----- Estados ----- */
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

/* ----- Computed Properties ----- */
const stepProgress = computed(() => {
  const stepNumber = parseInt(step.value)
  return (stepNumber / 5) * 100
})

/* ----- Colunas da Tabela ----- */
const cols = [
  { 
    name: 'title', 
    label: 'Anúncio', 
    field: 'title', 
    align: 'left',
    style: 'width: 60%'
  },
  { 
    name: 'sku', 
    label: 'SKU', 
    field: 'sku', 
    align: 'center',
    style: 'width: 40%'
  }
]

/* ----- Navigation Methods ----- */
function nextStep() {
  const currentStep = parseInt(step.value)
  if (currentStep < 5) {
    step.value = String(currentStep + 1)
  }
}

function prevStep() {
  const currentStep = parseInt(step.value)
  if (currentStep > 1) {
    step.value = String(currentStep - 1)
  }
}

/* ----- Handlers ----- */
function onFileChange() {
  previews.value = files.value.map(f => URL.createObjectURL(f))
  mainPhoto.value = 0
}

async function buscarAnuncios() {
  if (!sku.value) {
    $q.notify({ 
      type: 'warning', 
      message: 'Por favor, informe o SKU!',
      position: 'top'
    })
    return
  }
  
  loadingSearch.value = true
  try {
    const { data } = await api.get('/mercadolivre/anuncios/', { 
      params: { sku: sku.value } 
    })
    anuncios.value = data || []
    
    if (anuncios.value.length === 0) {
      $q.notify({ 
        type: 'info', 
        message: 'Nenhum anúncio encontrado para este SKU',
        position: 'top'
      })
    }
  } catch (e) {
    console.error(e)
    $q.notify({ 
      type: 'negative', 
      message: 'Erro ao buscar anúncios. Tente novamente.',
      position: 'top'
    })
  } finally {
    loadingSearch.value = false
  }
}

async function atualizarFotos() {
  loadingApply.value = true
  try {
    const payload = {
      item_ids: selecionados.value.map(a => a.item_id),
      photos: previews.value,
      main_photo_index: mainPhoto.value
    }
    
    await api.post('/mercadolivre/atualizar-fotos-em-massa/', payload)
    
    $q.notify({ 
      type: 'positive', 
      message: 'Fotos atualizadas com sucesso!',
      position: 'top',
      timeout: 3000
    })
    
    // Reset form
    step.value = '1'
    files.value = []
    previews.value = []
    anuncios.value = []
    selecionados.value = []
    sku.value = ''
    mainPhoto.value = 0
    
  } catch (e) {
    console.error(e)
    $q.notify({ 
      type: 'negative', 
      message: 'Falha ao atualizar fotos. Tente novamente.',
      position: 'top'
    })
  } finally {
    loadingApply.value = false
  }
}
</script>

<style scoped>
.container {
  max-width: 1000px;
  margin: 0 auto;
}

/* Header Styles */
.header-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 2rem;
  color: white;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}

.icon-wrapper {
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  padding: 12px;
  backdrop-filter: blur(10px);
}

.progress-indicator {
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  padding: 8px;
  backdrop-filter: blur(10px);
}

/* Modern Stepper */
.modern-stepper {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  overflow: hidden;
}

.step-section {
  padding: 2rem;
}

.step-content {
  max-width: 800px;
}

/* Upload Area */
.upload-area {
  border: 2px dashed #e0e0e0;
  border-radius: 12px;
  padding: 2rem;
  transition: all 0.3s ease;
  background: #fafafa;
}

.upload-area.has-files {
  border-color: #1976d2;
  background: #f3f8ff;
}

.preview-grid {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.more-photos-indicator {
  background: #f5f5f5;
  border: 2px dashed #ccc;
  border-radius: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}

/* Photo Grid */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.photo-item {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px;
  overflow: hidden;
}

.photo-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.photo-item.selected {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(25, 118, 210, 0.3);
  border: 3px solid #1976d2;
}

.photo-wrapper {
  position: relative;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.photo-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.5);
  border-radius: 50%;
  padding: 8px;
  backdrop-filter: blur(4px);
}

.photo-label {
  padding: 12px;
  text-align: center;
  font-weight: 500;
  font-size: 0.875rem;
  color: #666;
}

.photo-item.selected .photo-label {
  background: #1976d2;
  color: white;
}

/* Search Section */
.search-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.search-results-summary {
  animation: fadeInUp 0.5s ease;
}

/* Table Styles */
.table-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.modern-table {
  border-radius: 12px;
}

.title-cell {
  padding: 16px !important;
}

.selection-summary {
  text-align: center;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

/* Summary Section */
.summary-section {
  animation: fadeInUp 0.5s ease;
}

.summary-card {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}

.summary-card:hover {
  transform: translateY(-2px);
}

/* Action Buttons */
.step-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.action-btn {
  min-width: 140px;
  border-radius: 8px;
  font-weight: 600;
}

.action-btn-final {
  min-width: 200px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1.1rem;
}

.final-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}

/* Animations */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
  
  .header-section {
    padding: 1.5rem;
  }
  
  .progress-indicator {
    display: none;
  }
  
  .photo-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
  
  .final-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .action-btn-final {
    width: 100%;
  }
}
</style>