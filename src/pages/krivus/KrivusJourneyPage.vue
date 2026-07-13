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

      <div class="row items-center q-gutter-md q-mb-md meta-row">
        <span class="meta-item"><q-icon name="calendar_today" size="13px" /> desde {{ formatDate(client.data_inicio) }}</span>
        <span class="meta-item"><q-icon name="payments" size="13px" /> {{ formatCurrency(client.mensalidade) }}/mês</span>
        <span class="meta-item" v-if="client.contato_telefone"><q-icon name="call" size="13px" /> {{ client.contato_telefone }}</span>
        <span class="meta-item" v-if="client.contato_email"><q-icon name="mail" size="13px" /> {{ client.contato_email }}</span>
        <span class="meta-item" v-for="acc in client.ml_accounts_detail" :key="'ml' + acc.id">
          <q-icon name="store" size="13px" color="amber-8" /> {{ acc.account_nickname }}
        </span>
        <span class="meta-item" v-for="acc in client.shopee_accounts_detail" :key="'sh' + acc.id">
          <q-icon name="store" size="13px" color="deep-orange" /> {{ acc.shop_name }}
        </span>
      </div>

      <!-- Sub-navegação sticky: a página tem 7 seções, isso evita o scroll cego -->
      <nav class="section-nav q-mb-lg">
        <a
          v-for="s in sectionNav"
          :key="s.id"
          class="section-nav-link"
          :class="{ 'section-nav-link--active': activeSection === s.id }"
          @click="scrollToSection(s.id)"
        >{{ s.label }}</a>
      </nav>

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
      <div class="section-header q-mb-md" id="sec-roadmap">
        <h2 class="section-title">Roadmap do Projeto</h2>
        <q-btn unelevated color="primary" label="Gerar documento" icon="post_add" no-caps size="sm" @click="openWizard()" />
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

      <!-- Lifetime da Conta -->
      <div class="section-header q-mb-md" id="sec-lifetime">
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
      <div class="section-header q-mb-md" id="sec-evolucao">
        <h2 class="section-title">Evolução (desde o início da consultoria)</h2>
      </div>
      <SbCard :padded="false" class="q-mb-xl">
        <SbEmptyState v-if="!timeseries.length" message="Sem dados de vendas ainda." />
        <div ref="evolutionChartRef" class="evolution-chart q-pa-sm" v-show="timeseries.length" />
      </SbCard>

      <!-- Marcos -->
      <div class="section-header q-mb-md" id="sec-marcos">
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
      <div class="section-header q-mb-md" id="sec-cobrancas">
        <h2 class="section-title">Cobranças</h2>
        <div class="row q-gutter-xs">
          <q-btn flat dense no-caps size="sm" icon="add" label="Nova cobrança" color="primary" @click="openNewInvoice" />
          <q-btn flat dense no-caps size="sm" label="Ver todas" icon-right="chevron_right" color="primary" to="/krivus/cobrancas" />
        </div>
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
      <div class="section-header q-mb-md" id="sec-tarefas">
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
      <div class="section-header q-mb-md" id="sec-interacoes">
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
        <q-card-section class="q-gutter-sm edit-client-body" v-if="editForm">
          <q-input v-model="editForm.nome" label="Nome" outlined dense />
          <div class="row q-gutter-sm">
            <q-input v-model="editForm.data_inicio" label="Início do contrato" type="date" outlined dense style="flex:1" />
            <q-input v-model.number="editForm.mensalidade" label="Mensalidade" prefix="R$" type="number" outlined dense style="flex:1" />
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

          <q-expansion-item dense label="Contato e dados fiscais" icon="badge" header-class="text-grey-7">
            <div class="q-gutter-sm q-pt-sm">
              <div class="row q-gutter-sm">
                <q-input v-model="editForm.contato_nome" label="Nome do contato" outlined dense style="flex:1" />
                <q-input v-model="editForm.contato_telefone" label="Telefone" outlined dense style="flex:1" />
              </div>
              <q-input v-model="editForm.contato_email" label="E-mail" type="email" outlined dense />
              <q-input v-model="editForm.razao_social" label="Razão social" outlined dense />
              <q-input v-model="editForm.cnpj" label="CNPJ" outlined dense placeholder="00.000.000/0000-00" />
              <q-input v-model="editForm.endereco" label="Endereço" outlined dense />
            </div>
          </q-expansion-item>

          <q-expansion-item dense label="Faixas de cobrança (gestão contínua)" icon="stacked_bar_chart" header-class="text-grey-7">
            <div class="q-pt-sm">
              <div class="text-caption text-grey-6 q-mb-sm">
                Copiadas do contrato assinado. O cron mensal aplica a faixa correspondente ao faturamento do mês.
              </div>
              <div v-for="(tier, idx) in editForm.billing_tiers" :key="idx" class="tier-row row items-center q-gutter-xs q-mb-xs">
                <q-input v-model.number="tier.faturamento_min" label="De" prefix="R$" type="number" outlined dense style="flex:1" />
                <q-input
                  :model-value="tier.faturamento_max"
                  label="Até" prefix="R$" type="number" outlined dense style="flex:1"
                  :placeholder="idx === editForm.billing_tiers.length - 1 ? 'aberto' : ''"
                  @update:model-value="(v) => tier.faturamento_max = (v === '' || v === null) ? null : Number(v)"
                />
                <q-select
                  v-model="tier.tipo"
                  :options="[{label:'Fixo (R$)',value:'fixo'},{label:'% do faturamento',value:'percentual'}]"
                  emit-value map-options outlined dense style="flex:1.1"
                />
                <q-input v-model.number="tier.valor" :label="tier.tipo === 'percentual' ? '%' : 'R$'" type="number" outlined dense style="flex:0.8" />
                <q-btn flat round dense icon="close" size="xs" color="grey-5" @click="removeTier(idx)" />
              </div>
              <q-btn flat size="sm" icon="add" label="Adicionar faixa" color="primary" no-caps @click="addTier" />
              <div v-if="tierError" class="text-negative text-caption q-mt-xs">{{ tierError }}</div>
            </div>
          </q-expansion-item>

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
          <q-btn unelevated label="Salvar" color="primary" :loading="savingClient" :disable="!!tierError" @click="saveClient" />
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
            <q-btn flat size="sm" icon="file_copy" label="Do template" color="grey-7" no-caps @click="openWizard(null, activeMilestone?.id)" />
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

    <!-- Wizard de documentos: form derivado das {{variáveis}} do template -->
    <KrivusDocWizard
      ref="wizardRef"
      v-model="wizardOpen"
      :client="client"
      :templates="templates"
      :milestone-id="wizardMilestoneId"
      :preset-tipo="wizardPresetTipo"
      @created="onWizardDocCreated"
      @client-updated="(c) => { client = c }"
    />

    <!-- Dialog: nova cobrança manual (ex: fatura de setup) -->
    <q-dialog v-model="newInvoiceDialog">
      <q-card style="min-width: 420px">
        <q-card-section><div class="text-h6">Nova cobrança</div></q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-select
            v-model="newInvoice.tipo"
            :options="[{label:'Setup/Implementação',value:'setup'},{label:'Mensalidade Gestão Contínua',value:'mensalidade'}]"
            emit-value map-options label="Tipo" outlined dense
          />
          <div class="row q-gutter-sm">
            <q-input v-model="newInvoice.competencia" label="Competência" type="date" outlined dense style="flex:1" hint="Mês faturado" />
            <q-input v-model="newInvoice.data_vencimento" label="Vencimento" type="date" outlined dense style="flex:1" />
          </div>
          <q-input v-model.number="newInvoice.valor" label="Valor" prefix="R$" type="number" outlined dense autofocus />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn
            unelevated color="primary" label="Criar"
            :loading="savingInvoice"
            :disable="!newInvoice.valor || !newInvoice.competencia || !newInvoice.data_vencimento"
            @click="saveInvoice"
          />
        </q-card-actions>
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import KrivusService from 'src/services/KrivusService'
import { api } from 'src/boot/axios'
import TipTapEditor from 'src/components/krivus/TipTapEditor.vue'
import KrivusDocWizard from 'src/components/krivus/KrivusDocWizard.vue'
import { STAGE_TEMPLATE_MAP } from 'src/utils/krivusVariables'
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
    cnpj: client.value.cnpj || '',
    razao_social: client.value.razao_social || '',
    endereco: client.value.endereco || '',
    contato_nome: client.value.contato_nome || '',
    contato_email: client.value.contato_email || '',
    contato_telefone: client.value.contato_telefone || '',
    billing_tiers: JSON.parse(JSON.stringify(client.value.billing_tiers || [])),
    ml_accounts: (client.value.ml_accounts_detail || []).map((a) => a.id),
    shopee_accounts: (client.value.shopee_accounts_detail || []).map((a) => a.id),
  }
  editClientDialog.value = true
  if (!mlAccounts.value.length && !shopeeAccounts.value.length) loadAccounts()
}

// Editor de faixas de cobrança — validação espelha validate_billing_tiers do backend
function addTier() {
  const tiers = editForm.value.billing_tiers
  const lastMax = tiers.length ? tiers[tiers.length - 1].faturamento_max : null
  tiers.push({ faturamento_min: lastMax ?? 0, faturamento_max: null, tipo: 'percentual', valor: null })
}
function removeTier(idx) { editForm.value.billing_tiers.splice(idx, 1) }

const tierError = computed(() => {
  const tiers = editForm.value?.billing_tiers || []
  if (!tiers.length) return ''
  const sorted = [...tiers].sort((a, b) => (a.faturamento_min || 0) - (b.faturamento_min || 0))
  if ((sorted[0].faturamento_min || 0) !== 0) return 'A primeira faixa precisa começar em R$ 0.'
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].valor === null || sorted[i].valor === '' || sorted[i].valor === undefined) {
      return 'Toda faixa precisa de um valor.'
    }
    if (i < sorted.length - 1) {
      if (sorted[i].faturamento_max === null) return 'Só a última faixa pode ficar sem limite superior.'
      if (sorted[i + 1].faturamento_min !== sorted[i].faturamento_max) {
        return 'Cada faixa precisa começar exatamente onde a anterior termina.'
      }
    }
  }
  return ''
})

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
    const newStage = targetStage.value.value
    const res = await KrivusService.updateStage(client.value.slug, newStage)
    client.value = res.data
    moveStageDialog.value = false
    await loadAll()

    // Etapa com documento padrão? Oferece gerar na hora, sem obrigar.
    const templateTipo = STAGE_TEMPLATE_MAP[newStage]
    const template = templateTipo && templates.value.find((t) => t.tipo === templateTipo)
    if (template) {
      $q.notify({
        type: 'positive',
        message: 'Estágio atualizado!',
        timeout: 6000,
        actions: [{
          label: `Gerar ${template.nome}`,
          color: 'white',
          noCaps: true,
          handler: () => openWizard(templateTipo),
        }],
      })
    } else {
      $q.notify({ type: 'positive', message: 'Estágio atualizado!' })
    }
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

// DocWizard: gerar documento com form derivado das {{variáveis}} do template
const wizardRef = ref(null)
const wizardOpen = ref(false)
const wizardMilestoneId = ref(null)
const wizardPresetTipo = ref(null)

async function openWizard(presetTipo = null, milestoneId = null) {
  // Sem marco explícito, o wizard acha o marco "Estágio: <atual>" sozinho
  wizardMilestoneId.value = milestoneId
  wizardPresetTipo.value = presetTipo
  wizardOpen.value = true
  await nextTick()
  wizardRef.value?.start()
}

async function onWizardDocCreated() {
  const res = await KrivusService.getDocuments(client.value.slug)
  documents.value = res.data
  if (activeMilestone.value?.id) await loadMilestoneDrawerDocuments(activeMilestone.value.id)
}

// Cobranças
const newInvoiceDialog = ref(false)
const savingInvoice = ref(false)
const newInvoice = ref({})

function openNewInvoice() {
  const today = new Date()
  const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
  newInvoice.value = {
    tipo: 'setup',
    competencia: firstOfMonth,
    data_vencimento: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    valor: null,
  }
  newInvoiceDialog.value = true
}

async function saveInvoice() {
  savingInvoice.value = true
  try {
    await KrivusService.createInvoice(client.value.slug, newInvoice.value)
    const res = await KrivusService.getInvoices(client.value.slug)
    invoices.value = res.data
    newInvoiceDialog.value = false
    $q.notify({ type: 'positive', message: 'Cobrança criada!' })
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao criar cobrança.' })
  } finally {
    savingInvoice.value = false
  }
}

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

// Sub-navegação com scrollspy
const sectionNav = [
  { id: 'sec-roadmap', label: 'Roadmap' },
  { id: 'sec-lifetime', label: 'Lifetime' },
  { id: 'sec-evolucao', label: 'Evolução' },
  { id: 'sec-marcos', label: 'Marcos' },
  { id: 'sec-cobrancas', label: 'Cobranças' },
  { id: 'sec-tarefas', label: 'Tarefas' },
  { id: 'sec-interacoes', label: 'Interações' },
]
const activeSection = ref('sec-roadmap')

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onScrollSpy() {
  // Seção ativa = última cujo topo já passou do terço superior da viewport
  let current = sectionNav[0].id
  for (const s of sectionNav) {
    const el = document.getElementById(s.id)
    if (el && el.getBoundingClientRect().top < window.innerHeight / 3) current = s.id
  }
  activeSection.value = current
}

watch(() => route.params.slug, () => {
  selectedSlug.value = route.params.slug
  loadAll()
})

onMounted(() => {
  loadAll()
  loadClientOptions()
  window.addEventListener('scroll', onScrollSpy, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScrollSpy)
})
</script>

<style lang="scss" scoped>
@import 'src/css/tokens.scss';

.krivus-page { background: #f8fafc; }
.krivus-container { max-width: 1100px; margin: 0 auto; padding: $space-6 $space-6 $space-12; }

.meta-row { margin-top: -$space-2; }
.meta-item { font-size: $text-small-size; color: $text-muted; display: flex; align-items: center; gap: 4px; }
.section-title { font-size: $text-h3-size; font-weight: $font-semibold; color: $text-primary; margin: 0; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-top: $space-8; scroll-margin-top: 64px; }

/* Sub-navegação sticky */
.section-nav {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  gap: $space-1;
  background: rgba(248, 250, 252, 0.94);
  backdrop-filter: blur(4px);
  padding: $space-2 0;
  border-bottom: 1px solid #e2e8f0;
  overflow-x: auto;
}
.section-nav-link {
  font-size: $text-xs-size;
  font-weight: $font-semibold;
  color: $text-muted;
  padding: 4px 12px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: background $transition-fast, color $transition-fast;
}
.section-nav-link:hover { background: #e2e8f0; }
.section-nav-link--active { background: #0f766e; color: #fff; }

/* Editor de faixas de cobrança */
.edit-client-body { max-height: 70vh; overflow-y: auto; }
.tier-row { flex-wrap: nowrap; }

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
