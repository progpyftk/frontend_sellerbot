<template>
  <q-page class="krivus-page">
    <div class="krivus-container" v-if="client">

      <SbPageHeader :title="client.nome" icon="business_center">
        <template #actions>
          <SbBadge :variant="statusVariant(client.status)">{{ client.status }}</SbBadge>
          <q-btn flat round dense icon="edit" color="grey-6" size="sm" @click="openEditClient">
            <q-tooltip>Editar cliente</q-tooltip>
          </q-btn>
          <q-btn flat round dense icon="ios_share" color="grey-6" size="sm" @click="portalDialog = true">
            <q-tooltip>Portal do cliente</q-tooltip>
          </q-btn>
          <q-select
            v-model="selectedSlug"
            :options="clientOptions"
            dense outlined emit-value map-options
            label="Trocar de cliente"
            style="min-width: 220px"
            @update:model-value="onClientChange"
          />
        </template>
      </SbPageHeader>

      <div class="row items-center q-gutter-md q-mb-lg meta-row">
        <span class="meta-item"><q-icon name="calendar_today" size="13px" /> desde {{ formatDate(client.data_inicio) }}</span>
        <span class="meta-item"><q-icon name="payments" size="13px" /> {{ formatCurrency(client.mensalidade) }}/mês</span>
        <span class="meta-item" v-for="acc in client.ml_accounts_detail" :key="'ml' + acc.id">
          <q-icon name="store" size="13px" color="amber-8" /> {{ acc.account_nickname }}
        </span>
        <span class="meta-item" v-for="acc in client.shopee_accounts_detail" :key="'sh' + acc.id">
          <q-icon name="store" size="13px" color="deep-orange" /> {{ acc.shop_name }}
        </span>
      </div>

      <!-- KPIs -->
      <SbKpiGrid :columns="4" class="q-mb-xl">
        <SbKpiCard
          label="GMV" variant="teal" :prefix="'R$'"
          :value="formatNumber(stats.total_gmv)" sub="últimos 30 dias"
          :sparkline-data="gmvSparkline" sparkline-color="#0f766e"
        />
        <SbKpiCard
          label="Pedidos" variant="sky"
          :value="stats.total_orders?.toLocaleString('pt-BR') || '0'" sub="últimos 30 dias"
          :sparkline-data="ordersSparkline" sparkline-color="#0284c7"
        />
        <SbKpiCard
          label="Anúncios Ativos" variant="indigo"
          :value="stats.ml?.active_items?.toLocaleString('pt-BR') || '0'" sub="Mercado Livre"
        />
        <SbKpiCard
          label="Gasto Ads" variant="amber" :prefix="'R$'"
          :value="formatNumber(stats.ml?.ads_cost)"
          :sub="stats.ml?.ads_roas ? `ROAS ${stats.ml.ads_roas}x` : 'ROAS —'"
        />
      </SbKpiGrid>

      <!-- Roadmap do Projeto -->
      <div class="section-header q-mb-md">
        <h2 class="section-title">Roadmap do Projeto</h2>
      </div>

      <div class="stage-track q-mb-xl">
        <div
          v-for="(s, idx) in stages"
          :key="s.value"
          class="stage-step"
          :class="{
            'stage-step--done': idx < currentStageIndex,
            'stage-step--current': idx === currentStageIndex,
          }"
        >
          <div class="stage-dot" @click="confirmMoveStage(s)">
            <q-icon v-if="idx < currentStageIndex" name="check" size="14px" color="white" />
          </div>
          <div class="stage-card">
            <div class="stage-label">{{ s.label }}</div>
            <div class="stage-date" v-if="stageMilestone(s)">{{ formatDate(stageMilestone(s).data) }}</div>
            <div class="stage-docs" v-if="stageDocuments(s).length">
              <q-chip
                v-for="doc in stageDocuments(s)"
                :key="doc.id"
                dense clickable
                size="sm"
                icon="description"
                color="teal-1"
                text-color="teal-9"
                :label="doc.titulo"
                @click="openDocument(doc)"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="row justify-end q-mb-xl">
        <q-btn unelevated color="primary" label="Gerar documento" icon="add" no-caps size="sm" @click="openTemplateDialog" />
      </div>

      <!-- Lifetime da Conta -->
      <div class="section-header q-mb-md">
        <h2 class="section-title">Lifetime da Conta (Mercado Livre)</h2>
      </div>

      <div class="lifetime-track q-mb-xl">
        <div v-for="b in lifetimeBadges" :key="b.key" class="lifetime-badge" @click="openLifetimeDialog(b)">
          <div class="lifetime-icon" :class="{ 'lifetime-icon--done': client[b.field] }">
            <q-icon :name="b.icon" size="20px" />
          </div>
          <div class="lifetime-label">{{ b.label }}</div>
          <div class="lifetime-date">{{ client[b.field] ? formatDate(client[b.field]) : '—' }}</div>
        </div>
      </div>

      <!-- Evolução -->
      <div class="section-header q-mb-md">
        <h2 class="section-title">Evolução (desde o início da consultoria)</h2>
      </div>
      <SbCard :padded="false" class="q-mb-xl">
        <SbEmptyState v-if="!timeseries.length" message="Sem dados de vendas ainda." />
        <div ref="evolutionChartRef" class="evolution-chart q-pa-sm" v-show="timeseries.length" />
      </SbCard>

      <!-- Marcos -->
      <div class="section-header q-mb-md">
        <h2 class="section-title">Marcos</h2>
        <q-btn unelevated color="primary" label="Novo Marco" icon="add" no-caps size="sm" @click="openNewMilestone" />
      </div>

      <div class="timeline-wrapper q-mb-xl" v-if="milestones.length">
        <div class="timeline-track" />
        <div
          v-for="m in milestones"
          :key="m.id"
          class="milestone-item"
          @click="openMilestoneDrawer(m)"
        >
          <div class="milestone-dot" :style="`background: ${categoriaColor(m.categoria)}`" />
          <div class="milestone-card">
            <div class="milestone-date">{{ formatDate(m.data) }}</div>
            <div class="milestone-title">{{ m.titulo }}</div>
            <SbBadge :variant="categoriaVariant(m.categoria)">{{ m.categoria }}</SbBadge>
            <div class="milestone-docs q-mt-xs" v-if="m.document_count > 0">
              <q-icon name="description" size="12px" color="grey-5" />
              <span class="q-ml-xs text-grey-6" style="font-size:11px">{{ m.document_count }} doc(s)</span>
            </div>
          </div>
        </div>
      </div>
      <SbEmptyState v-else class="q-mb-xl" title="Nenhum marco ainda" message="Registre reuniões, conquistas e etapas importantes da jornada deste cliente." />

      <!-- Cobranças -->
      <div class="section-header q-mb-md">
        <h2 class="section-title">Cobranças</h2>
        <q-btn flat dense no-caps size="sm" label="Ver todas" icon-right="chevron_right" color="primary" to="/krivus/cobrancas" />
      </div>

      <SbTable class="q-mb-xl" v-if="invoices.length">
        <thead>
          <tr><th>Competência</th><th>Tipo</th><th class="text-right">Valor</th><th>Vencimento</th><th class="text-center">Status</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="inv in invoices.slice(0, 6)" :key="inv.id">
            <td>{{ formatMonth(inv.competencia) }}</td>
            <td>{{ inv.tipo }}</td>
            <td class="text-right">{{ formatCurrency(inv.valor) }}</td>
            <td>{{ formatDate(inv.data_vencimento) }}</td>
            <td class="text-center"><SbBadge :variant="invoiceStatusVariant(inv.status)">{{ inv.status }}</SbBadge></td>
            <td class="text-right">
              <q-btn v-if="inv.status !== 'pago'" flat dense no-caps size="sm" color="positive" label="Marcar pago" @click="markPaid(inv)" />
            </td>
          </tr>
        </tbody>
      </SbTable>
      <SbEmptyState v-else class="q-mb-xl" message="Nenhuma cobrança gerada ainda." />

      <!-- Tarefas -->
      <div class="section-header q-mb-md">
        <h2 class="section-title">Tarefas</h2>
        <q-btn flat dense no-caps size="sm" icon="add" label="Nova tarefa" color="primary" @click="openNewTask" />
      </div>
      <div class="task-list q-mb-xl" v-if="tasks.length">
        <div v-for="task in tasks" :key="task.id" class="task-item row items-center">
          <q-checkbox
            :model-value="task.concluida"
            @update:model-value="(val) => toggleTask(task, val)"
            color="positive" dense
          />
          <div :class="{ 'task-done': task.concluida }" class="task-title">{{ task.titulo }}</div>
          <q-space />
          <div class="task-meta">{{ task.prazo ? formatDate(task.prazo) : '' }} {{ task.responsavel_nome || '' }}</div>
          <q-btn flat round dense icon="close" size="xs" color="grey-5" @click="removeTask(task)" />
        </div>
      </div>
      <SbEmptyState v-else class="q-mb-xl" message="Nenhuma tarefa cadastrada." />

      <!-- Interações -->
      <div class="section-header q-mb-md">
        <h2 class="section-title">Interações</h2>
        <q-btn flat dense no-caps size="sm" icon="add" label="Registrar" color="primary" @click="openNewInteraction" />
      </div>
      <div class="interaction-list q-mb-xl" v-if="interactions.length">
        <div v-for="i in interactions" :key="i.id" class="interaction-item">
          <div class="row items-center q-mb-xs">
            <SbBadge variant="indigo">{{ i.tipo }}</SbBadge>
            <div class="interaction-date q-ml-sm">{{ formatDate(i.data) }}</div>
            <q-space />
            <q-btn flat round dense icon="close" size="xs" color="grey-5" @click="removeInteraction(i)" />
          </div>
          <div class="interaction-desc">{{ i.descricao }}</div>
        </div>
      </div>
      <SbEmptyState v-else class="q-mb-xl" message="Nenhuma interação registrada." />

    </div>

    <div class="krivus-container" v-else-if="loading">
      <q-skeleton height="40px" class="q-mb-md" />
      <q-skeleton height="120px" />
    </div>

    <div class="krivus-container" v-else>
      <SbEmptyState variant="error" title="Cliente não encontrado" message="Verifique o link ou volte para a visão geral." />
    </div>

    <!-- Dialog: editar cliente -->
    <q-dialog v-model="editClientDialog" persistent>
      <q-card style="min-width: 520px; max-width: 580px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Editar Cliente</div>
          <q-space />
          <q-btn flat round dense icon="close" color="grey" v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-sm" v-if="editForm">
          <q-input v-model="editForm.nome" label="Nome" outlined dense />
          <div class="row q-gutter-sm">
            <q-input v-model="editForm.data_inicio" label="Início do contrato" type="date" outlined dense style="flex:1" />
            <q-input v-model.number="editForm.mensalidade" label="Mensalidade (R$)" type="number" outlined dense style="flex:1" />
          </div>
          <q-select
            v-model="editForm.status"
            :options="[{label:'Ativo',value:'ativo'},{label:'Pausado',value:'pausado'},{label:'Encerrado',value:'encerrado'}]"
            emit-value map-options label="Status" outlined dense
          />
          <div class="row items-center q-gutter-sm">
            <div class="text-caption text-grey-6">Cor:</div>
            <div class="row q-gutter-xs">
              <div
                v-for="cor in coresSugeridas"
                :key="cor"
                class="color-swatch"
                :style="`background:${cor}; outline: ${editForm.cor_hex === cor ? '2px solid #1e293b' : 'none'}`"
                @click="editForm.cor_hex = cor"
              />
            </div>
          </div>
          <div>
            <div class="text-caption text-grey-6 q-mb-xs">Contas Mercado Livre</div>
            <div class="accounts-checklist">
              <q-checkbox v-for="acc in mlAccounts" :key="acc.id" v-model="editForm.ml_accounts" :val="acc.id" :label="acc.account_nickname" color="amber-8" dense />
            </div>
          </div>
          <div>
            <div class="text-caption text-grey-6 q-mb-xs">Contas Shopee</div>
            <div class="accounts-checklist">
              <q-checkbox v-for="acc in shopeeAccounts" :key="acc.id" v-model="editForm.shopee_accounts" :val="acc.id" :label="acc.shop_name" color="deep-orange" dense />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn unelevated label="Salvar" color="primary" :loading="savingClient" @click="saveClient" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: portal do cliente -->
    <q-dialog v-model="portalDialog">
      <q-card style="min-width: 420px; max-width: 520px">
        <q-card-section>
          <div class="text-h6">Portal do Cliente</div>
          <div class="text-caption text-grey-6">Link somente-leitura, sem necessidade de login.</div>
        </q-card-section>
        <q-card-section>
          <q-input :model-value="portalUrl" readonly outlined dense>
            <template #append><q-btn flat round dense icon="content_copy" @click="copyPortalUrl" /></template>
          </q-input>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Regenerar link" color="negative" :loading="regeneratingToken" @click="regeneratePortalToken" />
          <q-btn flat label="Fechar" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: mover estágio -->
    <q-dialog v-model="moveStageDialog">
      <q-card style="min-width: 380px">
        <q-card-section>
          <div class="text-h6">Mover estágio</div>
          <div class="text-caption text-grey-6">Mover {{ client?.nome }} para "{{ targetStage?.label }}"?</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="primary" label="Confirmar" :loading="savingStage" @click="moveStage" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: marcar data de lifetime -->
    <q-dialog v-model="lifetimeDialog">
      <q-card style="min-width: 340px">
        <q-card-section><div class="text-h6">{{ activeBadge?.label }}</div></q-card-section>
        <q-card-section>
          <q-input v-model="lifetimeDate" type="date" outlined dense label="Data de conquista" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="primary" label="Salvar" :loading="savingLifetime" @click="saveLifetime" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Marco Drawer -->
    <q-drawer v-model="milestoneDrawerOpen" side="right" :width="520" elevated class="milestone-drawer">
      <div class="drawer-inner q-pa-lg" v-if="activeMilestone">
        <div class="row items-center q-mb-lg">
          <q-btn flat round icon="close" color="grey-6" @click="milestoneDrawerOpen = false" />
          <q-space />
          <q-btn v-if="activeMilestone.id" flat round icon="delete" color="negative" @click="confirmDeleteMilestone" />
          <q-btn unelevated color="primary" label="Salvar" size="sm" :loading="savingMilestone" @click="saveMilestoneDrawer" />
        </div>

        <q-input v-model="activeMilestone.titulo" borderless class="milestone-title-input q-mb-sm" placeholder="Título do marco" input-style="font-size:20px; font-weight:700; color:#0f172a" />

        <div class="row q-gutter-sm q-mb-lg items-center">
          <q-input v-model="activeMilestone.data" type="date" dense outlined style="width:150px" />
          <q-select v-model="activeMilestone.categoria" :options="categoriaOptions" emit-value map-options dense outlined style="width:160px" />
        </div>

        <div class="q-mb-lg">
          <div class="drawer-label q-mb-sm">Notas</div>
          <q-input v-model="activeMilestone.descricao" type="textarea" outlined dense autogrow placeholder="Descrição ou notas do marco..." />
        </div>

        <div class="q-mb-lg">
          <div class="row items-center q-mb-sm">
            <div class="drawer-label">Links Externos</div>
            <q-space />
            <q-btn flat size="sm" icon="add_link" label="Adicionar" color="primary" no-caps @click="openNewLink" />
          </div>
          <div v-if="activeMilestone.links?.length" class="link-list">
            <div v-for="(link, idx) in activeMilestone.links" :key="idx" class="link-item row items-center">
              <q-icon name="link" size="16px" color="grey-6" class="q-mr-sm" />
              <a :href="link.url" target="_blank" rel="noopener" class="link-anchor">{{ link.titulo }}</a>
              <q-space />
              <q-btn flat round dense icon="close" size="xs" color="grey-5" @click="removeLink(idx)" />
            </div>
          </div>
          <div class="text-grey-5 text-caption" v-else>Nenhum link adicionado.</div>
        </div>

        <div class="q-mb-md">
          <div class="row items-center q-mb-sm">
            <div class="drawer-label">Documentos</div>
            <q-space />
            <q-btn flat size="sm" icon="add" label="Novo doc" color="primary" no-caps @click="openNewDoc" />
            <q-btn flat size="sm" icon="file_copy" label="Do template" color="grey-7" no-caps @click="openTemplateDialog" />
          </div>
          <div v-if="milestoneDrawerDocuments.length" class="doc-list">
            <div v-for="doc in milestoneDrawerDocuments" :key="doc.id" class="doc-item row items-center" @click="openDocument(doc)">
              <q-icon :name="docIcon(doc.tipo)" size="18px" color="primary" class="q-mr-sm" />
              <div>
                <div class="doc-title">{{ doc.titulo }}</div>
                <div class="doc-meta">{{ doc.tipo }} · {{ doc.status }}</div>
              </div>
              <q-space />
              <q-icon name="chevron_right" color="grey-4" />
            </div>
          </div>
          <div class="text-grey-5 text-caption" v-else>Nenhum documento neste marco.</div>
        </div>
      </div>
    </q-drawer>

    <!-- Dialog: preview / editor de documento -->
    <q-dialog v-model="docDialogOpen" full-width>
      <q-card style="max-width: 860px; width: 100%">
        <q-card-section class="row items-center q-pb-none">
          <q-input v-model="activeDoc.titulo" borderless placeholder="Título do documento" style="font-size:18px; font-weight:600; flex:1" />
          <q-chip :label="activeDoc.tipo" dense color="teal-1" text-color="teal-9" />
          <q-btn flat round icon="close" color="grey" v-close-popup />
        </q-card-section>
        <q-card-section>
          <TipTapEditor v-model="activeDoc.content" placeholder="Escreva o documento aqui..." />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-if="activeDoc.id" flat color="primary" label="Baixar PDF" icon="picture_as_pdf" :loading="downloadingPdf" @click="downloadPdf" />
          <q-btn flat label="Rascunho" color="grey" @click="saveDoc('rascunho')" />
          <q-btn unelevated label="Finalizar" color="primary" @click="saveDoc('finalizado')" :loading="savingDoc" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: escolher template -->
    <q-dialog v-model="templateDialogOpen">
      <q-card style="min-width: 380px">
        <q-card-section><div class="text-h6">Gerar documento</div></q-card-section>
        <q-card-section>
          <q-list bordered separator>
            <q-item v-for="t in templates" :key="t.id" clickable @click="instantiateTemplate(t)">
              <q-item-section avatar><q-icon name="description" color="primary" /></q-item-section>
              <q-item-section>
                <q-item-label>{{ t.nome }}</q-item-label>
                <q-item-label caption>{{ t.tipo }} · v{{ t.versao }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        <q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup /></q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: novo link -->
    <q-dialog v-model="newLinkDialog">
      <q-card style="min-width: 380px">
        <q-card-section><div class="text-h6">Adicionar link externo</div></q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input v-model="newLink.titulo" label="Título" outlined dense autofocus />
          <q-input v-model="newLink.url" label="URL" outlined dense placeholder="https://..." />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="primary" label="Adicionar" :disable="!newLink.titulo || !newLink.url" @click="addLink" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: nova tarefa -->
    <q-dialog v-model="newTaskDialog">
      <q-card style="min-width: 380px">
        <q-card-section><div class="text-h6">Nova tarefa</div></q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input v-model="newTask.titulo" label="Título" outlined dense autofocus />
          <q-input v-model="newTask.prazo" type="date" label="Prazo" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="primary" label="Criar" :disable="!newTask.titulo" :loading="savingTask" @click="saveTask" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: nova interação -->
    <q-dialog v-model="newInteractionDialog">
      <q-card style="min-width: 380px">
        <q-card-section><div class="text-h6">Registrar interação</div></q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-select v-model="newInteraction.tipo" :options="interactionTipoOptions" emit-value map-options label="Tipo" outlined dense />
          <q-input v-model="newInteraction.data" type="date" label="Data" outlined dense />
          <q-input v-model="newInteraction.descricao" type="textarea" label="Descrição" outlined dense autogrow />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="primary" label="Salvar" :disable="!newInteraction.descricao" :loading="savingInteraction" @click="saveInteraction" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import KrivusService from 'src/services/KrivusService'
import { api } from 'src/boot/axios'
import TipTapEditor from 'src/components/krivus/TipTapEditor.vue'
import SbPageHeader from 'src/components/common/SbPageHeader.vue'
import SbKpiCard from 'src/components/common/SbKpiCard.vue'
import SbKpiGrid from 'src/components/common/SbKpiGrid.vue'
import SbBadge from 'src/components/common/SbBadge.vue'
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbTable from 'src/components/common/SbTable.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()

const client = ref(null)
const clients = ref([])
const milestones = ref([])
const documents = ref([])
const templates = ref([])
const invoices = ref([])
const tasks = ref([])
const interactions = ref([])
const timeseries = ref([])
const stats = ref({})
const loading = ref(true)
const selectedSlug = ref(route.params.slug)

const clientOptions = computed(() => clients.value.map((c) => ({ label: c.nome, value: c.slug })))
const gmvSparkline = computed(() => timeseries.value.map((r) => r.gmv))
const ordersSparkline = computed(() => timeseries.value.map((r) => r.orders))

const stages = [
  { value: 'lead', label: 'Lead' },
  { value: 'proposta_enviada', label: 'Proposta Enviada' },
  { value: 'contrato_assinado', label: 'Contrato Assinado' },
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'setup_implementacao', label: 'Setup & Implementação' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'gestao_continua', label: 'Gestão Contínua' },
  { value: 'encerrado', label: 'Encerrado' },
]

const lifetimeBadges = [
  { key: 'ativacao', field: 'ativacao_em', label: 'Ativação', icon: 'my_location' },
  { key: 'flex', field: 'flex_em', label: 'Flex', icon: 'local_shipping' },
  { key: 'coletas', field: 'coletas_em', label: 'Coletas', icon: 'inventory_2' },
  { key: 'full', field: 'full_em', label: 'Full', icon: 'rocket_launch' },
  { key: 'gold', field: 'gold_em', label: 'Gold', icon: 'emoji_events' },
]

const categoriaOptions = [
  { label: 'Onboarding', value: 'onboarding' },
  { label: 'Contrato', value: 'contrato' },
  { label: 'Lançamento', value: 'lancamento' },
  { label: 'Conquista', value: 'conquista' },
  { label: 'Reunião', value: 'reuniao' },
  { label: 'Encerramento', value: 'encerramento' },
  { label: 'Outro', value: 'outro' },
]
const categoriaColors = {
  onboarding: '#0284c7', contrato: '#6366f1', lancamento: '#16a34a',
  conquista: '#d97706', reuniao: '#8b5cf6', encerramento: '#dc2626', outro: '#94a3b8',
}
const categoriaVariantMap = {
  onboarding: 'sky', contrato: 'indigo', lancamento: 'green',
  conquista: 'amber', reuniao: 'indigo', encerramento: 'red', outro: 'slate',
}
function categoriaColor(cat) { return categoriaColors[cat] || '#94a3b8' }
function categoriaVariant(cat) { return categoriaVariantMap[cat] || 'slate' }

const interactionTipoOptions = [
  { label: 'Reunião', value: 'reuniao' },
  { label: 'Ligação', value: 'ligacao' },
  { label: 'Nota', value: 'nota' },
]

function statusVariant(s) { return { ativo: 'green', pausado: 'amber', encerrado: 'red' }[s] || 'slate' }
function invoiceStatusVariant(s) { return { pendente: 'amber', pago: 'green', atrasado: 'red', cancelado: 'slate' }[s] || 'slate' }
function docIcon(tipo) { return { contrato: 'gavel', proposta: 'handshake', relatorio: 'bar_chart', nf: 'receipt', outro: 'description' }[tipo] || 'description' }

function formatCurrency(v) {
  if (!v && v !== 0) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function formatNumber(v) {
  if (!v && v !== 0) return '0,00'
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}
function formatDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}
function formatMonth(d) {
  if (!d) return '—'
  const [y, m] = d.split('-')
  return `${m}/${y}`
}

const currentStageIndex = computed(() => {
  if (!client.value) return 0
  return stages.findIndex((s) => s.value === client.value.current_stage)
})

function stageMilestone(stage) {
  return milestones.value.find((m) => m.titulo === `Estágio: ${stage.label}`)
}
function stageDocuments(stage) {
  const milestone = stageMilestone(stage)
  if (!milestone) return []
  return documents.value.filter((d) => d.milestone === milestone.id)
}

async function loadAll() {
  loading.value = true
  try {
    const [clientRes, milestonesRes, documentsRes, templatesRes, invoicesRes, tasksRes, interactionsRes, timeseriesRes, statsRes] = await Promise.all([
      KrivusService.getClient(route.params.slug),
      KrivusService.getMilestones(route.params.slug),
      KrivusService.getDocuments(route.params.slug),
      KrivusService.getTemplates(),
      KrivusService.getInvoices(route.params.slug),
      KrivusService.getTasks(route.params.slug),
      KrivusService.getInteractions(route.params.slug),
      KrivusService.getTimeseries(route.params.slug),
      KrivusService.getClientStats(route.params.slug, 30),
    ])
    client.value = clientRes.data
    milestones.value = milestonesRes.data
    documents.value = documentsRes.data
    templates.value = templatesRes.data
    invoices.value = invoicesRes.data
    tasks.value = tasksRes.data
    interactions.value = interactionsRes.data
    timeseries.value = timeseriesRes.data.series
    stats.value = statsRes.data
    await nextTick()
    renderEvolutionChart()
  } finally {
    loading.value = false
  }
}

async function loadClientOptions() {
  const res = await KrivusService.getClients()
  clients.value = res.data
}

function onClientChange(slug) {
  router.push(`/krivus/${slug}`)
}

// Editar cliente
const editClientDialog = ref(false)
const editForm = ref(null)
const savingClient = ref(false)
const mlAccounts = ref([])
const shopeeAccounts = ref([])
const coresSugeridas = ['#0d9488', '#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

async function loadAccounts() {
  const [ml, sh] = await Promise.all([api.get('/mercadolivre/accounts/'), api.get('/shopee/accounts/')])
  mlAccounts.value = Array.isArray(ml.data) ? ml.data : (ml.data.results || [])
  shopeeAccounts.value = Array.isArray(sh.data) ? sh.data : (sh.data.results || [])
}

function openEditClient() {
  editForm.value = {
    nome: client.value.nome,
    data_inicio: client.value.data_inicio,
    mensalidade: client.value.mensalidade,
    status: client.value.status,
    cor_hex: client.value.cor_hex,
    ml_accounts: (client.value.ml_accounts_detail || []).map((a) => a.id),
    shopee_accounts: (client.value.shopee_accounts_detail || []).map((a) => a.id),
  }
  editClientDialog.value = true
  if (!mlAccounts.value.length && !shopeeAccounts.value.length) loadAccounts()
}

async function saveClient() {
  savingClient.value = true
  try {
    const res = await KrivusService.updateClient(client.value.slug, editForm.value)
    client.value = res.data
    editClientDialog.value = false
    $q.notify({ type: 'positive', message: 'Cliente atualizado!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao salvar.' })
  } finally {
    savingClient.value = false
  }
}

// Portal do cliente
const portalDialog = ref(false)
const regeneratingToken = ref(false)
const portalUrl = computed(() => `${window.location.origin}/portal/${client.value?.portal_token}`)

async function copyPortalUrl() {
  await navigator.clipboard.writeText(portalUrl.value)
  $q.notify({ type: 'positive', message: 'Link copiado!' })
}

async function regeneratePortalToken() {
  regeneratingToken.value = true
  try {
    const res = await KrivusService.regenerateToken(client.value.slug)
    client.value.portal_token = res.data.portal_token
    $q.notify({ type: 'positive', message: 'Novo link gerado — o anterior parou de funcionar.' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao gerar novo link.' })
  } finally {
    regeneratingToken.value = false
  }
}

// Gráfico de evolução (Plotly via CDN, mesmo padrão do DashboardPage.vue)
const evolutionChartRef = ref(null)
let plotlyLoaded = false

const loadPlotly = () => new Promise((resolve) => {
  if (plotlyLoaded || window.Plotly) { plotlyLoaded = true; resolve(); return }
  const script = document.createElement('script')
  script.src = 'https://cdn.plot.ly/plotly-basic-3.0.0.min.js'
  script.onload = () => { plotlyLoaded = true; resolve() }
  document.head.appendChild(script)
})

async function renderEvolutionChart() {
  if (!timeseries.value.length || !evolutionChartRef.value) return
  await loadPlotly()

  const months = timeseries.value.map((r) => r.month)
  const gmv = timeseries.value.map((r) => r.gmv)
  const orders = timeseries.value.map((r) => r.orders)

  const traces = [
    { x: months, y: gmv, name: 'GMV', type: 'scatter', mode: 'lines+markers', line: { color: '#0f766e' } },
    { x: months, y: orders, name: 'Pedidos', type: 'bar', yaxis: 'y2', marker: { color: '#7dd3c0' }, opacity: 0.6 },
  ]

  const shapes = []
  if (client.value?.data_inicio) {
    const inicioMonth = client.value.data_inicio.slice(0, 7)
    if (months.includes(inicioMonth)) {
      shapes.push({ type: 'line', x0: inicioMonth, x1: inicioMonth, y0: 0, y1: 1, yref: 'paper', line: { color: '#d97706', width: 2, dash: 'dot' } })
    }
  }

  const layout = {
    margin: { l: 50, r: 50, t: 10, b: 30 },
    height: 260,
    font: { family: 'Inter, sans-serif', size: 11, color: '#64748b' },
    xaxis: { gridcolor: '#eef0f4' },
    yaxis: { title: 'GMV', gridcolor: '#eef0f4', tickprefix: 'R$' },
    yaxis2: { title: 'Pedidos', overlaying: 'y', side: 'right', showgrid: false },
    shapes,
    legend: { orientation: 'h', y: -0.2 },
  }

  window.Plotly.react(evolutionChartRef.value, traces, layout, { responsive: true, displayModeBar: false })
}

// Mover estágio
const moveStageDialog = ref(false)
const targetStage = ref(null)
const savingStage = ref(false)

function confirmMoveStage(stage) {
  if (stage.value === client.value.current_stage) return
  targetStage.value = stage
  moveStageDialog.value = true
}

async function moveStage() {
  savingStage.value = true
  try {
    const res = await KrivusService.updateStage(client.value.slug, targetStage.value.value)
    client.value = res.data
    moveStageDialog.value = false
    await loadAll()
    $q.notify({ type: 'positive', message: 'Estágio atualizado!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao mover estágio.' })
  } finally {
    savingStage.value = false
  }
}

// Lifetime da conta
const lifetimeDialog = ref(false)
const activeBadge = ref(null)
const lifetimeDate = ref('')
const savingLifetime = ref(false)

function openLifetimeDialog(badge) {
  activeBadge.value = badge
  lifetimeDate.value = client.value[badge.field] || new Date().toISOString().split('T')[0]
  lifetimeDialog.value = true
}

async function saveLifetime() {
  savingLifetime.value = true
  try {
    const res = await KrivusService.updateLifetime(client.value.slug, activeBadge.value.key, lifetimeDate.value)
    client.value = res.data
    lifetimeDialog.value = false
    $q.notify({ type: 'positive', message: 'Lifetime atualizado!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao salvar.' })
  } finally {
    savingLifetime.value = false
  }
}

// Marcos (timeline livre + drawer completo)
const milestoneDrawerOpen = ref(false)
const activeMilestone = ref(null)
const milestoneDrawerDocuments = ref([])
const savingMilestone = ref(false)

async function loadMilestoneDrawerDocuments(milestoneId) {
  try {
    const res = await KrivusService.getDocuments(client.value.slug, milestoneId)
    milestoneDrawerDocuments.value = res.data
  } catch { /* noop */ }
}

function openMilestoneDrawer(m) {
  activeMilestone.value = { ...m }
  milestoneDrawerOpen.value = true
  loadMilestoneDrawerDocuments(m.id)
}

function openNewMilestone() {
  const today = new Date().toISOString().split('T')[0]
  activeMilestone.value = { titulo: '', data: today, categoria: 'outro', descricao: '', ordem: 0, links: [] }
  milestoneDrawerDocuments.value = []
  milestoneDrawerOpen.value = true
}

async function saveMilestoneDrawer() {
  savingMilestone.value = true
  try {
    if (activeMilestone.value.id) {
      await KrivusService.updateMilestone(client.value.slug, activeMilestone.value.id, activeMilestone.value)
    } else {
      await KrivusService.createMilestone(client.value.slug, activeMilestone.value)
    }
    const res = await KrivusService.getMilestones(client.value.slug)
    milestones.value = res.data
    $q.notify({ type: 'positive', message: 'Marco salvo!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao salvar marco.' })
  } finally {
    savingMilestone.value = false
  }
}

function confirmDeleteMilestone() {
  $q.dialog({
    title: 'Deletar marco',
    message: `Deletar "${activeMilestone.value.titulo}"? Esta ação não pode ser desfeita.`,
    cancel: true, persistent: true,
  }).onOk(async () => {
    await KrivusService.deleteMilestone(client.value.slug, activeMilestone.value.id)
    milestoneDrawerOpen.value = false
    const res = await KrivusService.getMilestones(client.value.slug)
    milestones.value = res.data
  })
}

const newLinkDialog = ref(false)
const newLink = ref({ titulo: '', url: '' })
function openNewLink() { newLink.value = { titulo: '', url: '' }; newLinkDialog.value = true }
function addLink() {
  if (!activeMilestone.value.links) activeMilestone.value.links = []
  activeMilestone.value.links.push({ ...newLink.value })
  newLinkDialog.value = false
}
function removeLink(idx) { activeMilestone.value.links.splice(idx, 1) }

// Documentos
const docDialogOpen = ref(false)
const activeDoc = ref({ titulo: '', tipo: 'outro', content: {}, status: 'rascunho' })
const savingDoc = ref(false)
const downloadingPdf = ref(false)

function openNewDoc() {
  activeDoc.value = { titulo: '', tipo: 'outro', content: {}, status: 'rascunho', milestone: activeMilestone.value?.id }
  docDialogOpen.value = true
}

function openDocument(doc) {
  activeDoc.value = { ...doc }
  docDialogOpen.value = true
}

async function saveDoc(status) {
  savingDoc.value = true
  try {
    const payload = { ...activeDoc.value, status, client: client.value.id }
    if (activeDoc.value.id) {
      await KrivusService.updateDocument(client.value.slug, activeDoc.value.id, payload)
    } else {
      await KrivusService.createDocument(client.value.slug, payload)
    }
    docDialogOpen.value = false
    if (activeMilestone.value?.id) await loadMilestoneDrawerDocuments(activeMilestone.value.id)
    const res = await KrivusService.getDocuments(client.value.slug)
    documents.value = res.data
    $q.notify({ type: 'positive', message: 'Documento salvo!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao salvar documento.' })
  } finally {
    savingDoc.value = false
  }
}

async function downloadPdf() {
  downloadingPdf.value = true
  try {
    const url = KrivusService.documentPdfUrl(client.value.slug, activeDoc.value.id)
    const res = await api.get(url, { responseType: 'blob' })
    const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    window.open(blobUrl, '_blank')
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao gerar PDF.' })
  } finally {
    downloadingPdf.value = false
  }
}

// Template / gerar documento
const templateDialogOpen = ref(false)
function openTemplateDialog() { templateDialogOpen.value = true }

async function instantiateTemplate(template) {
  templateDialogOpen.value = false
  try {
    // Se o drawer de um marco está aberto (ex: "Do template" clicado de dentro
    // dele), o documento pertence a ESSE marco. Só cai para o marco do estágio
    // atual quando "Gerar documento" foi clicado fora de qualquer marco aberto.
    const currentStage = stages[currentStageIndex.value]
    const milestone = milestoneDrawerOpen.value
      ? activeMilestone.value
      : stageMilestone(currentStage)
    const res = await KrivusService.instantiateTemplate(template.id, client.value.slug, milestone?.id || null)
    activeDoc.value = { ...res.data }
    docDialogOpen.value = true
    const docsRes = await KrivusService.getDocuments(client.value.slug)
    documents.value = docsRes.data
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao gerar documento.' })
  }
}

// Cobranças
async function markPaid(invoice) {
  try {
    await KrivusService.markInvoicePaid(client.value.slug, invoice.id)
    const res = await KrivusService.getInvoices(client.value.slug)
    invoices.value = res.data
    $q.notify({ type: 'positive', message: 'Cobrança marcada como paga — recibo gerado!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao marcar como pago.' })
  }
}

// Tarefas
const newTaskDialog = ref(false)
const newTask = ref({ titulo: '', prazo: '' })
const savingTask = ref(false)

function openNewTask() { newTask.value = { titulo: '', prazo: '' }; newTaskDialog.value = true }

async function saveTask() {
  savingTask.value = true
  try {
    await KrivusService.createTask(client.value.slug, newTask.value)
    const res = await KrivusService.getTasks(client.value.slug)
    tasks.value = res.data
    newTaskDialog.value = false
    $q.notify({ type: 'positive', message: 'Tarefa criada!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao criar tarefa.' })
  } finally {
    savingTask.value = false
  }
}

async function toggleTask(task, concluida) {
  try {
    await KrivusService.updateTask(client.value.slug, task.id, { concluida })
    task.concluida = concluida
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao atualizar tarefa.' })
  }
}

async function removeTask(task) {
  try {
    await KrivusService.deleteTask(client.value.slug, task.id)
    tasks.value = tasks.value.filter((t) => t.id !== task.id)
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao remover tarefa.' })
  }
}

// Interações
const newInteractionDialog = ref(false)
const newInteraction = ref({ tipo: 'nota', data: '', descricao: '' })
const savingInteraction = ref(false)

function openNewInteraction() {
  newInteraction.value = { tipo: 'nota', data: new Date().toISOString().split('T')[0], descricao: '' }
  newInteractionDialog.value = true
}

async function saveInteraction() {
  savingInteraction.value = true
  try {
    await KrivusService.createInteraction(client.value.slug, newInteraction.value)
    const res = await KrivusService.getInteractions(client.value.slug)
    interactions.value = res.data
    newInteractionDialog.value = false
    $q.notify({ type: 'positive', message: 'Interação registrada!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao registrar interação.' })
  } finally {
    savingInteraction.value = false
  }
}

async function removeInteraction(interaction) {
  try {
    await KrivusService.deleteInteraction(client.value.slug, interaction.id)
    interactions.value = interactions.value.filter((i) => i.id !== interaction.id)
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao remover interação.' })
  }
}

watch(() => route.params.slug, () => {
  selectedSlug.value = route.params.slug
  loadAll()
})

onMounted(() => {
  loadAll()
  loadClientOptions()
})
</script>

<style lang="scss" scoped>
@import 'src/css/tokens.scss';

.krivus-page { background: #f8fafc; }
.krivus-container { max-width: 1100px; margin: 0 auto; padding: $space-6 $space-6 $space-12; }

.meta-row { margin-top: -$space-2; }
.meta-item { font-size: $text-small-size; color: $text-muted; display: flex; align-items: center; gap: 4px; }
.section-title { font-size: $text-h3-size; font-weight: $font-semibold; color: $text-primary; margin: 0; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-top: $space-8; }

.color-swatch { width: 22px; height: 22px; border-radius: 50%; cursor: pointer; transition: transform 0.1s; }
.color-swatch:hover { transform: scale(1.15); }
.accounts-checklist { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 0; }

/* Stage track */
.stage-track { display: flex; flex-wrap: wrap; gap: $space-2; }
.stage-step { flex: 1; min-width: 130px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.stage-dot {
  width: 22px; height: 22px; border-radius: 50%; background: #e2e8f0;
  display: flex; align-items: center; justify-content: center; cursor: pointer; margin-bottom: $space-2;
}
.stage-step--done .stage-dot { background: #0f766e; }
.stage-step--current .stage-dot { background: #d97706; box-shadow: 0 0 0 4px rgba(217,119,6,0.16); }
.stage-card {
  background: #fff; border: 1px solid #e2e8f0; border-radius: $radius-md; padding: $space-3; width: 100%; min-height: 70px;
}
.stage-step--current .stage-card { border-color: #d97706; }
.stage-label { font-size: $text-xs-size; font-weight: $font-semibold; color: $text-primary; }
.stage-date { font-size: 11px; color: $text-disabled; margin-top: 2px; }
.stage-docs { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin-top: 6px; }

/* Lifetime */
.lifetime-track { display: flex; gap: $space-4; flex-wrap: wrap; }
.lifetime-badge {
  display: flex; flex-direction: column; align-items: center; cursor: pointer;
  min-width: 100px; padding: $space-3; background: #fff; border: 1px solid #e2e8f0; border-radius: $radius-lg;
  transition: box-shadow $transition-base, transform $transition-base;
}
.lifetime-badge:hover { box-shadow: $shadow-sm; transform: translateY(-1px); }
.lifetime-icon {
  width: 44px; height: 44px; border-radius: 50%; background: $tint-slate-bg; color: #94a3b8;
  display: flex; align-items: center; justify-content: center; margin-bottom: 6px;
}
.lifetime-icon--done { background: $tint-teal-bg; color: $tint-teal-text; }
.lifetime-label { font-size: $text-xs-size; font-weight: $font-semibold; color: $text-primary; }
.lifetime-date { font-size: 11px; color: $text-disabled; }

/* Evolution chart */
.evolution-chart { width: 100%; min-height: 260px; }

/* Timeline / marcos */
.timeline-wrapper { position: relative; display: flex; flex-wrap: wrap; gap: $space-4; padding: $space-6 0; }
.timeline-track { position: absolute; top: 52px; left: 0; right: 0; height: 2px; background: #e2e8f0; z-index: 0; }
.milestone-item { position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; z-index: 1; min-width: 150px; max-width: 190px; }
.milestone-dot { width: 14px; height: 14px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 2px currentColor; flex-shrink: 0; margin-bottom: 10px; }
.milestone-card { background: #fff; border: 1px solid #e2e8f0; border-radius: $radius-md; padding: $space-3; text-align: center; transition: box-shadow $transition-base, border-color $transition-base; width: 100%; }
.milestone-item:hover .milestone-card { border-color: #0f766e; box-shadow: $shadow-sm; }
.milestone-date { font-size: 11px; color: $text-disabled; }
.milestone-title { font-size: $text-small-size; font-weight: $font-semibold; color: $text-primary; margin: 2px 0; }

/* Drawer */
.milestone-drawer { background: #fff; }
.drawer-label { font-size: $text-xs-size; font-weight: $font-semibold; color: $text-muted; text-transform: uppercase; letter-spacing: 0.5px; }
.milestone-title-input { font-size: 20px; }
.doc-list { display: flex; flex-direction: column; gap: $space-2; }
.doc-item { padding: $space-2 $space-3; border: 1px solid #e2e8f0; border-radius: $radius-md; cursor: pointer; transition: background $transition-fast; }
.doc-item:hover { background: #f8fafc; }
.doc-title { font-size: $text-small-size; font-weight: 500; color: $text-primary; }
.doc-meta { font-size: 11px; color: $text-disabled; }
.link-list { display: flex; flex-direction: column; gap: 6px; }
.link-item { padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: $radius-sm; }
.link-anchor { font-size: $text-small-size; color: #0f766e; text-decoration: none; }
.link-anchor:hover { text-decoration: underline; }

/* Tasks */
.task-list { display: flex; flex-direction: column; gap: 6px; }
.task-item { padding: $space-2 $space-3; border: 1px solid #e2e8f0; border-radius: $radius-md; gap: $space-2; background: #fff; }
.task-title { font-size: $text-small-size; color: $text-primary; }
.task-done { text-decoration: line-through; color: $text-disabled; }
.task-meta { font-size: 11px; color: $text-disabled; }

/* Interactions */
.interaction-list { display: flex; flex-direction: column; gap: $space-2; }
.interaction-item { padding: $space-3; border: 1px solid #e2e8f0; border-radius: $radius-md; background: #fff; }
.interaction-date { font-size: 11px; color: $text-disabled; }
.interaction-desc { font-size: $text-small-size; color: #334155; }
</style>
