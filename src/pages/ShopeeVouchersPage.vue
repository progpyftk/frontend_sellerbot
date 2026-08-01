<template>
  <q-page class="sv-page">

    <!-- ══ HEADER ══════════════════════════════════════════════════════════ -->
    <div class="sv-header">
      <div class="sv-header-left">
        <q-icon name="confirmation_number" size="20px" class="q-mr-sm" style="color:#f57c00" />
        <span class="sv-title">Cupons</span>
        <span class="sv-badge">Shopee</span>
      </div>

      <div class="sv-header-right">
        <!-- Conta -->
        <div class="sv-pills">
          <button :class="['sv-pill', selectedAccountId === null && 'sv-pill--on']"
            @click="selectAccount(null)">Todas</button>
          <button v-for="a in accounts" :key="a.id"
            :class="['sv-pill', selectedAccountId === a.id && 'sv-pill--on']"
            @click="selectAccount(a.id)">{{ a.shop_name }}</button>
        </div>

        <!-- Status -->
        <div class="sv-pills sv-pills--status">
          <button v-for="s in STATUS_OPTIONS" :key="s.value"
            :class="['sv-pill', statusFilter === s.value && 'sv-pill--on']"
            @click="selectStatus(s.value)">{{ s.label }}</button>
        </div>

        <!-- Chip-resumo do filtro ativo -->
        <div v-if="statusFilter !== 'all'" class="sv-filter-chip">
          <q-icon name="filter_alt" size="14px" class="q-mr-xs" />
          Filtrando: <strong>{{ activeStatusLabel }}</strong>
          <q-btn dense flat round icon="close" size="xs" class="q-ml-xs"
            @click="selectStatus('all')" aria-label="Limpar filtro" />
        </div>

        <q-btn flat color="grey-7" icon="autorenew" label="Renovações automáticas" size="sm"
          @click="openAutoRenewList()" />

        <q-btn unelevated color="orange-8" text-color="white" icon="add" label="Novo Cupom"
          size="sm" class="q-ml-md" @click="openCreate()" />
      </div>
    </div>

    <!-- ══ STATS BAR ════════════════════════════════════════════════════════ -->
    <div v-if="stats.total" class="sv-stats">
      <div class="sv-stat">
        <span class="sv-stat-n">{{ stats.total }}</span>
        <span class="sv-stat-l">Total</span>
      </div>
      <div class="sv-stat">
        <span class="sv-stat-n sv-stat-n--green">{{ stats.ongoing }}</span>
        <span class="sv-stat-l">Em andamento</span>
      </div>
      <div class="sv-stat">
        <span class="sv-stat-n sv-stat-n--amber">{{ stats.upcoming }}</span>
        <span class="sv-stat-l">Agendados</span>
      </div>
      <div class="sv-stat">
        <span class="sv-stat-n sv-stat-n--blue">{{ stats.totalUsage }}</span>
        <span class="sv-stat-l">Usos totais</span>
      </div>
    </div>

    <!-- ══ LOADING ══════════════════════════════════════════════════════════ -->
    <div v-if="loading" class="sv-center">
      <q-spinner-dots color="orange-7" size="36px" />
    </div>

    <!-- ══ EMPTY ════════════════════════════════════════════════════════════ -->
    <div v-else-if="!vouchers.length" class="sv-center sv-empty">
      <q-icon name="confirmation_number" size="56px" color="grey-3" />
      <div class="text-grey-6 text-subtitle2 q-mt-md">Nenhum cupom encontrado</div>
      <div class="text-caption text-grey-4 q-mt-xs">Crie cupons para atrair compradores com descontos exclusivos</div>
      <q-btn unelevated color="orange-8" icon="add" label="Criar primeiro cupom"
        class="q-mt-lg" size="sm" @click="openCreate()" />
    </div>

    <!-- ══ TABELA (feedback #10: lista em vez de cards) ═══════════════════════ -->
    <div v-else class="sv-table-wrap">
      <table class="sv-table">
        <thead>
          <tr>
            <th>Cupom</th>
            <th>Tipo</th>
            <th class="right">Desconto</th>
            <th>Uso</th>
            <th>Vigência</th>
            <th>Status</th>
            <th class="right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in vouchers" :key="`${v.voucher_id}-${v.account_id}`"
            class="sv-tr" @click="openDetail(v)">
            <td class="sv-td-name">
              <div class="sv-td-name-main">{{ v.voucher_name }}</div>
              <div class="sv-td-name-sub">
                <span class="sv-code">{{ v.voucher_code }}</span>
                <q-btn flat round icon="content_copy" size="xs" color="grey-5"
                  @click.stop="copyCode(v.voucher_code)" title="Copiar código" />
                <span v-if="!selectedAccountId" class="sv-td-shop">· {{ v.shop_name }}</span>
              </div>
            </td>
            <td>
              <span class="sv-type-badge">
                <q-icon :name="v.voucher_type === 2 ? 'inventory_2' : 'storefront'" size="11px" class="q-mr-xs" />
                {{ v.voucher_type_label }}
              </span>
            </td>
            <td class="right sv-td-value">{{ v.reward_summary }}</td>
            <td style="min-width:110px">
              <div class="sv-usage-label">
                <span>{{ v.current_usage || 0 }}</span>
                <span class="text-grey-5">/ {{ v.usage_quantity }}</span>
              </div>
              <q-linear-progress
                :value="(v.current_usage || 0) / (v.usage_quantity || 1)"
                :color="usageColor(v.usage_pct)"
                track-color="grey-2" rounded size="5px" />
            </td>
            <td class="sv-td-date">{{ fmtDate(v.start_time) }} – {{ fmtDate(v.end_time) }}</td>
            <td>
              <div v-if="v.status_label" :class="['sv-status', `sv-status--${v.status}`]">
                <span class="sv-status-dot"></span>
                {{ v.status_label }}
              </div>
            </td>
            <td class="right" @click.stop>
              <q-btn v-if="v.status === 'ongoing'" flat round icon="stop_circle"
                color="red-6" size="xs" title="Encerrar" @click.stop="askEnd(v)" />
              <q-btn v-if="v.status === 'upcoming'" flat round icon="delete_outline"
                color="grey-5" size="xs" title="Deletar" @click.stop="askDelete(v)" />
              <q-btn flat round icon="chevron_right" color="grey-4" size="xs" @click.stop="openDetail(v)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ══ CRIAR CUPOM ══════════════════════════════════════════════════════ -->
    <q-dialog v-model="createOpen" persistent>
      <q-card class="sv-create-card column">
        <!-- Header -->
        <q-card-section class="sv-dialog-header">
          <q-icon name="confirmation_number" size="sm" class="q-mr-sm" />
          <span class="text-subtitle1 text-weight-bold">Novo Cupom</span>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <!-- Body 2 colunas -->
        <div class="sv-create-body">

          <!-- COL ESQUERDA: formulário -->
          <div class="sv-form">

            <!-- Conta -->
            <div class="sv-form-section">
              <div class="sv-form-label">Conta Shopee</div>
              <div class="sv-pills sv-pills--form">
                <button v-for="a in accounts" :key="a.id"
                  :class="['sv-pill', form.account_id === a.id && 'sv-pill--on']"
                  @click="form.account_id = a.id">{{ a.shop_name }}</button>
              </div>
            </div>

            <!-- Nome e código -->
            <div class="sv-form-row">
              <div class="sv-form-field sv-form-field--grow">
                <div class="sv-form-label">Nome do cupom *</div>
                <q-input v-model="form.voucher_name" outlined dense
                  placeholder="Ex: Cupom 10% Julho" />
              </div>
              <div class="sv-form-field" style="min-width:130px">
                <div class="sv-form-label">{{ form.auto_renew ? 'Prefixo do código *' : 'Código *' }}</div>
                <q-input v-model="form.voucher_code" outlined dense
                  :placeholder="form.auto_renew ? 'SP' : 'SP10'" :maxlength="5"
                  :error="form.voucher_code.length > 0 && !/^[A-Za-z0-9]{1,5}$/.test(form.voucher_code)"
                  error-message="1 a 5 letras/números, sem espaços"
                  @update:model-value="v => form.voucher_code = v.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0, 5)" />
                <div v-if="form.auto_renew" class="text-caption text-grey-5">
                  Cada ciclo reusa o mesmo código — limite da Shopee é 5 caracteres (FB-28). A Shopee
                  adiciona um prefixo da loja ao salvar (ex: SP → MGPSP).
                </div>
                <div v-else class="text-caption text-grey-5">
                  Máx 5 caracteres — a Shopee adiciona um prefixo da loja ao salvar (ex: SP10 → MGPSP10).
                </div>
              </div>
            </div>

            <!-- Tipo do cupom -->
            <div class="sv-form-section">
              <div class="sv-form-label">Tipo de cupom</div>
              <div class="sv-type-select">
                <div :class="['sv-type-opt', form.voucher_type === 1 && 'sv-type-opt--on']"
                  @click="form.voucher_type = 1">
                  <q-icon name="storefront" size="20px" />
                  <div class="sv-type-opt-title">Loja</div>
                  <div class="sv-type-opt-desc">Válido para qualquer produto</div>
                </div>
                <div class="sv-type-opt sv-type-opt--disabled" title="Em breve — seleção de produtos ainda não implementada">
                  <q-icon name="inventory_2" size="20px" />
                  <div class="sv-type-opt-title">Produto</div>
                  <div class="sv-type-opt-desc">Em breve</div>
                </div>
              </div>
            </div>

            <!-- Tipo de recompensa -->
            <div class="sv-form-section">
              <div class="sv-form-label">Tipo de desconto</div>
              <div class="sv-type-select">
                <div :class="['sv-type-opt', form.reward_type === 1 && 'sv-type-opt--on']"
                  @click="form.reward_type = 1; form.percentage = null; form.max_price = null">
                  <q-icon name="attach_money" size="20px" />
                  <div class="sv-type-opt-title">Valor fixo</div>
                  <div class="sv-type-opt-desc">Ex: R$ 5 off</div>
                </div>
                <div :class="['sv-type-opt', form.reward_type === 2 && 'sv-type-opt--on']"
                  @click="form.reward_type = 2; form.discount_amount = null">
                  <q-icon name="percent" size="20px" />
                  <div class="sv-type-opt-title">Percentual</div>
                  <div class="sv-type-opt-desc">Ex: 10% off</div>
                </div>
                <div :class="['sv-type-opt', form.reward_type === 3 && 'sv-type-opt--on']"
                  @click="form.reward_type = 3; form.discount_amount = null">
                  <q-icon name="generating_tokens" size="20px" />
                  <div class="sv-type-opt-title">Coins</div>
                  <div class="sv-type-opt-desc">Cashback em coins</div>
                </div>
              </div>
            </div>

            <!-- Campos condicionais de desconto -->
            <div class="sv-form-row">
              <div v-if="form.reward_type === 1" class="sv-form-field sv-form-field--grow">
                <div class="sv-form-label">Valor do desconto (R$) *</div>
                <q-input v-model.number="form.discount_amount" type="number" outlined dense
                  min="0.01" step="0.01" prefix="R$" placeholder="5.00" />
              </div>
              <div v-if="form.reward_type >= 2" class="sv-form-field sv-form-field--grow">
                <div class="sv-form-label">{{ form.reward_type === 3 ? 'Cashback %' : 'Desconto %' }} *</div>
                <q-input v-model.number="form.percentage" type="number" outlined dense
                  min="1" max="100" step="1" suffix="%" placeholder="10" />
              </div>
              <div v-if="form.reward_type >= 2" class="sv-form-field sv-form-field--grow">
                <div class="sv-form-label">Desconto máx (R$)</div>
                <q-input v-model.number="form.max_price" type="number" outlined dense
                  min="0" step="1" prefix="R$" placeholder="0 = sem limite" />
              </div>
            </div>

            <!-- Compra mínima + quantidade -->
            <div class="sv-form-row">
              <div class="sv-form-field sv-form-field--grow">
                <div class="sv-form-label">Compra mínima (R$)</div>
                <q-input v-model.number="form.min_basket_price" type="number" outlined dense
                  min="0" step="0.01" prefix="R$" placeholder="0 = sem mínimo" />
              </div>
              <div class="sv-form-field sv-form-field--grow">
                <div class="sv-form-label">Qtd de usos *</div>
                <q-input v-model.number="form.usage_quantity" type="number" outlined dense
                  min="1" step="1" placeholder="100" />
              </div>
            </div>

            <!-- Renovação automática (FB-27) -->
            <div class="sv-form-section">
              <label class="sv-autorenew-check">
                <q-checkbox v-model="form.auto_renew" dense color="teal" />
                <div>
                  <div class="sv-form-label" style="margin:0">Renovar automaticamente</div>
                  <div class="text-caption text-grey-5">Cria um novo ciclo sozinho quando o anterior vence — sem precisar voltar aqui.</div>
                </div>
              </label>
            </div>

            <!-- Período de validade (manual) ou duração do ciclo (auto-renovação) -->
            <div v-if="!form.auto_renew" class="sv-form-row">
              <div class="sv-form-field sv-form-field--grow">
                <div class="sv-form-label">Início *</div>
                <q-input v-model="form.start_date" type="datetime-local" outlined dense />
              </div>
              <div class="sv-form-field sv-form-field--grow">
                <div class="sv-form-label">Fim *</div>
                <q-input v-model="form.end_date" type="datetime-local" outlined dense />
              </div>
            </div>
            <div v-else class="sv-form-row">
              <div class="sv-form-field sv-form-field--grow">
                <div class="sv-form-label">Duração de cada ciclo (dias) *</div>
                <q-input v-model.number="form.duration_days" type="number" outlined dense min="1" max="90" />
                <div class="text-caption text-grey-5 q-mt-xs">O 1º cupom é criado na hora, válido a partir de agora.</div>
              </div>
            </div>

            <!-- Onde exibir -->
            <div class="sv-form-section">
              <div class="sv-form-label">Visibilidade do cupom</div>
              <div class="sv-pills sv-pills--form">
                <button :class="['sv-pill', form.display_all && 'sv-pill--on']"
                  @click="form.display_all = true; form.display_hidden = false">
                  Todas as páginas
                </button>
                <button :class="['sv-pill', !form.display_all && !form.display_hidden && 'sv-pill--on']"
                  @click="form.display_all = false; form.display_hidden = false">
                  Padrão
                </button>
                <button :class="['sv-pill', form.display_hidden && 'sv-pill--on']"
                  @click="form.display_hidden = true; form.display_all = false">
                  Oculto
                </button>
              </div>
              <div class="text-caption text-grey-5">
                <span v-if="form.display_all">Exibido em todas as páginas da loja.</span>
                <span v-else-if="form.display_hidden">Só disponível via link direto — não aparece na loja.</span>
                <span v-else>Exibição padrão da Shopee.</span>
              </div>
            </div>

            <!-- Data de exibição -->
            <div v-if="!form.display_hidden" class="sv-form-field">
              <div class="sv-form-label">Resgate disponível a partir de</div>
              <q-input v-model="form.display_start_date" type="datetime-local" outlined dense />
              <div class="text-caption text-grey-5 q-mt-xs">Em branco = mesmo início da validade.</div>
            </div>
          </div>

          <!-- COL DIREITA: checklist + regras -->
          <div class="sv-rules-panel">
            <!-- Checklist de preenchimento -->
            <div class="sv-rules-section">
              <div class="sv-rules-title">
                <q-icon name="checklist" size="14px" class="q-mr-xs" />
                Pronto para criar?
              </div>
              <div v-for="item in validationChecklist" :key="item.label"
                :class="['sv-check-item', item.ok && 'sv-check-item--ok']">
                <q-icon :name="item.ok ? 'check_circle' : 'radio_button_unchecked'"
                  :color="item.ok ? 'positive' : 'grey-4'" size="14px" class="q-mr-xs flex-shrink-0" />
                <span>{{ item.label }}</span>
              </div>
            </div>

            <!-- Aviso de qualidade -->
            <div v-if="createWarning" class="sv-warn q-mt-sm">
              <q-icon name="warning" size="14px" class="q-mr-xs flex-shrink-0" />
              {{ createWarning }}
            </div>

            <!-- Regras da Shopee -->
            <div class="sv-rules-section q-mt-md">
              <div class="sv-rules-title">
                <q-icon name="info_outline" size="14px" class="q-mr-xs" />
                Regras da Shopee
              </div>
              <ul class="sv-rules-list">
                <li>Código: <b>1 a 5 letras/números</b> (A-Z, 0-9), sem espaços — a Shopee coloca um prefixo da loja ao salvar (FB-28)</li>
                <li>Validade: fim deve ser no mínimo 1 hora após o início</li>
                <li>Validade máxima: 3 meses</li>
                <li v-if="form.reward_type === 1">Compra mínima deve ser maior que o valor fixo (se definida)</li>
                <li v-if="form.reward_type === 2">Percentual mínimo aceito pela Shopee: ≥ 5%</li>
                <li v-if="form.reward_type >= 2 && form.max_price > 0">
                  Teto (R$ {{ form.max_price }}) deve permitir que o comprador aprove o desconto com a compra mínima
                </li>
                <li>Máx 1.000 cupons ativos + agendados simultâneos</li>
                <li>Para cupom tipo Produto, escolha os itens pelo painel da Shopee após criar</li>
              </ul>
            </div>
          </div>
        </div>

        <q-card-section class="sv-dialog-footer">
          <div class="text-caption text-grey-5">* campos obrigatórios</div>
          <q-space />
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="orange-8" label="Criar Cupom"
            :loading="createLoading" :disable="!createValid"
            @click="submitCreate()" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ══ DETALHE ══════════════════════════════════════════════════════════ -->
    <q-dialog v-model="detailOpen" position="right" full-height>
      <q-card style="width:460px;max-width:98vw" class="column">
        <!-- Header -->
        <q-card-section class="row items-center bg-orange-8 text-white col-auto q-py-sm">
          <q-icon name="confirmation_number" size="sm" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-bold ellipsis" style="max-width:300px">
            {{ activeVoucher?.voucher_name }}
          </div>
          <q-space />
          <div :class="['sv-status sv-status--sm', `sv-status--${activeVoucher?.status}`]" style="margin-right:8px">
            <span class="sv-status-dot"></span>{{ activeVoucher?.status_label }}
          </div>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <!-- Big value -->
        <div class="sv-detail-value">{{ activeVoucher?.reward_summary }}</div>

        <!-- Code copy block -->
        <div class="sv-detail-code-block">
          <div class="sv-detail-code">{{ activeVoucher?.voucher_code }}</div>
          <q-btn flat round icon="content_copy" size="sm" color="grey-5"
            @click="copyCode(activeVoucher?.voucher_code)" />
        </div>

        <!-- Detalhes -->
        <q-card-section class="col scroll q-pa-none">
          <table class="sv-detail-table">
            <tbody>
              <tr>
                <td class="sv-dt-lbl">Tipo</td>
                <td>{{ activeVoucher?.voucher_type_label }}</td>
              </tr>
              <tr>
                <td class="sv-dt-lbl">Desconto</td>
                <td>{{ activeVoucher?.reward_label }}</td>
              </tr>
              <tr v-if="activeVoucher?.discount_amount">
                <td class="sv-dt-lbl">Valor fixo</td>
                <td>{{ fmtBRL(activeVoucher.discount_amount) }}</td>
              </tr>
              <tr v-if="activeVoucher?.percentage">
                <td class="sv-dt-lbl">Percentual</td>
                <td>{{ activeVoucher.percentage }}%</td>
              </tr>
              <tr v-if="activeVoucher?.max_price">
                <td class="sv-dt-lbl">Desconto máx</td>
                <td>{{ fmtBRL(activeVoucher.max_price) }}</td>
              </tr>
              <tr>
                <td class="sv-dt-lbl">Compra mínima</td>
                <td>{{ activeVoucher?.min_basket_price ? fmtBRL(activeVoucher.min_basket_price) : 'Sem mínimo' }}</td>
              </tr>
              <tr>
                <td class="sv-dt-lbl">Início</td>
                <td>{{ fmtDateTime(activeVoucher?.start_time) }}</td>
              </tr>
              <tr>
                <td class="sv-dt-lbl">Fim</td>
                <td>{{ fmtDateTime(activeVoucher?.end_time) }}</td>
              </tr>
              <tr>
                <td class="sv-dt-lbl">Conta</td>
                <td>{{ activeVoucher?.shop_name }}</td>
              </tr>
              <tr>
                <td class="sv-dt-lbl">Criado por</td>
                <td>{{ activeVoucher?.is_admin ? 'Shopee' : 'Você' }}</td>
              </tr>
            </tbody>
          </table>

          <!-- Uso -->
          <div class="q-px-md q-pb-md">
            <div class="sv-form-label q-mb-xs">Uso do cupom</div>
            <div class="sv-usage-label q-mb-xs">
              <span class="text-weight-bold">{{ activeVoucher?.current_usage || 0 }}</span>
              <span class="text-grey-5"> de {{ activeVoucher?.usage_quantity }} usos</span>
            </div>
            <q-linear-progress
              :value="(activeVoucher?.current_usage || 0) / (activeVoucher?.usage_quantity || 1)"
              :color="usageColor(activeVoucher?.usage_pct)"
              track-color="grey-2" rounded size="8px" />
            <div class="text-caption text-grey-5 q-mt-xs">
              {{ activeVoucher?.usage_pct || 0 }}% utilizado
            </div>
          </div>
        </q-card-section>

        <!-- Footer ações -->
        <q-card-section class="col-auto q-py-sm q-px-md row justify-end bg-grey-1 items-center" style="border-top:1px solid #eee;gap:8px">
          <q-btn v-if="activeVoucher?.status === 'ongoing'" unelevated color="red-7"
            icon="stop_circle" label="Encerrar cupom" size="sm" @click="askEnd(activeVoucher)" />
          <q-btn v-if="activeVoucher?.status === 'upcoming'" unelevated color="grey-7"
            icon="delete" label="Deletar cupom" size="sm" @click="askDelete(activeVoucher)" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- ══ CONFIRM END ══════════════════════════════════════════════════════ -->
    <q-dialog v-model="confirmEndOpen">
      <q-card style="width:360px">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="warning" color="red-7" size="md" class="q-mr-sm" />
          <span class="text-subtitle2 text-weight-bold">Encerrar cupom?</span>
        </q-card-section>
        <q-card-section class="text-grey-8 text-body2">
          O cupom <strong>{{ confirmTarget?.voucher_code }}</strong> será encerrado imediatamente.
          Compradores não poderão mais utilizá-lo.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="red-7" label="Encerrar" :loading="actionLoading" @click="doEnd()" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ══ CONFIRM DELETE ═══════════════════════════════════════════════════ -->
    <q-dialog v-model="confirmDeleteOpen">
      <q-card style="width:360px">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="delete_forever" color="red-7" size="md" class="q-mr-sm" />
          <span class="text-subtitle2 text-weight-bold">Deletar cupom?</span>
        </q-card-section>
        <q-card-section class="text-grey-8 text-body2">
          O cupom <strong>{{ confirmTarget?.voucher_code }}</strong> será deletado permanentemente.
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="red-7" label="Deletar" :loading="actionLoading" @click="doDelete()" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ══ RENOVAÇÕES AUTOMÁTICAS (FB-27) ══════════════════════════════════════ -->
    <q-dialog v-model="autoRenewOpen">
      <q-card style="width:520px;max-width:96vw">
        <q-card-section class="row items-center q-pb-sm">
          <q-icon name="autorenew" size="sm" class="q-mr-sm" style="color:#0d9488" />
          <span class="text-subtitle1 text-weight-bold">Renovações automáticas</span>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-none" style="max-height:60vh;overflow-y:auto">
          <div v-if="autoRenewLoading" class="sv-center" style="padding:30px">
            <q-spinner-dots color="teal" size="30px" />
          </div>
          <div v-else-if="!autoRenewTemplates.length" class="text-center text-grey-5 q-pa-lg">
            Nenhuma renovação automática ativa. Crie um cupom marcando "Renovar automaticamente".
          </div>
          <div v-else v-for="t in autoRenewTemplates" :key="t.id" class="sv-ar-row">
            <div class="sv-ar-info">
              <div class="sv-ar-name">{{ t.voucher_name }}</div>
              <div class="text-caption text-grey-5">
                {{ t.shop_name }} · a cada {{ t.duration_days }}d · último: {{ t.last_voucher_id ? fmtDateTime(t.last_renewed_at) : 'aguardando 1º ciclo' }}
              </div>
              <div v-if="t.last_error" class="sv-ar-error">⚠ {{ t.last_error }}</div>
            </div>
            <q-toggle v-model="t.active" color="teal" @update:model-value="v => toggleAutoRenew(t, v)" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Toast de cópia -->
    <transition name="sv-toast-anim">
      <div v-if="copiedToast" class="sv-toast">
        <q-icon name="check_circle" size="16px" class="q-mr-xs" /> Código copiado!
      </div>
    </transition>

  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import ShopeeService from 'src/services/ShopeeService'

const $q = useQuasar()

// ── Constantes ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'all',      label: 'Todos'        },
  { value: 'ongoing',  label: 'Em andamento' },
  { value: 'upcoming', label: 'Agendados'    },
  { value: 'expired',  label: 'Encerrados'   },
]

// ── Estado principal ───────────────────────────────────────────────────────
const accounts          = ref([])
const vouchers          = ref([])
const loading           = ref(false)
const selectedAccountId = ref(null)
const statusFilter      = ref('all')
const activeStatusLabel = computed(() =>
  STATUS_OPTIONS.find(o => o.value === statusFilter.value)?.label || '')

// ── Detalhe ────────────────────────────────────────────────────────────────
const detailOpen    = ref(false)
const activeVoucher = ref(null)

// ── Criação ────────────────────────────────────────────────────────────────
const createOpen    = ref(false)
const createLoading = ref(false)
const form = ref(defaultForm())

function defaultForm() {
  return {
    account_id:        null,
    voucher_name:      '',
    voucher_code:      '',
    voucher_type:      1,   // 1=loja, 2=produto
    reward_type:       1,   // 1=fixo, 2=%, 3=coins
    discount_amount:   null,
    percentage:        null,
    max_price:         null,
    min_basket_price:  0,
    usage_quantity:    100,
    start_date:        '',
    end_date:          '',
    display_start_date:'',
    display_all:       false,
    display_hidden:    false,
    auto_renew:        false,   // FB-27
    duration_days:     30,
  }
}

const createWarning = computed(() => {
  const f = form.value
  if (f.reward_type === 2 && f.percentage && f.min_basket_price > 0) {
    const cap      = f.max_price || 0
    const minEnjoy = f.min_basket_price * f.percentage / 100
    if (cap > 0 && cap < minEnjoy)
      return `Teto muito baixo: comprador que gasta R$ ${f.min_basket_price} ganhou R$ ${minEnjoy.toFixed(2)} de desconto mas o máximo é R$ ${cap}. Aumente o teto ou reduza a compra mínima.`
  }
  if (f.reward_type === 1 && f.discount_amount > 0 && f.min_basket_price > 0 && f.min_basket_price <= f.discount_amount)
    return `Compra mínima (R$ ${f.min_basket_price}) deve ser maior que o valor do desconto (R$ ${f.discount_amount}).`
  return null
})

const validationChecklist = computed(() => {
  const f = form.value
  const hasDiscount = f.reward_type === 1
    ? (f.discount_amount > 0)
    : (f.percentage > 0)
  const startTs = f.start_date ? new Date(f.start_date).getTime() : 0
  const endTs   = f.end_date   ? new Date(f.end_date).getTime()   : 0
  const diffH   = (endTs - startTs) / 3600000
  const diffM   = (endTs - startTs) / (1000 * 60 * 60 * 24 * 30)

  return [
    { ok: !!f.account_id,              label: 'Conta selecionada' },
    { ok: !!f.voucher_name.trim(),     label: 'Nome preenchido' },
    { ok: !!f.voucher_code.trim(),     label: 'Código preenchido' },
    // FB-28: Shopee só aceita voucher_code de 1-5 alfanuméricos — antes o usuário
    // podia digitar até 20 chars e o erro só vinha da API ("Up to 5 characters."), ilegível.
    { ok: /^[A-Za-z0-9]{1,5}$/.test(f.voucher_code.trim()), label: 'Código de 1 a 5 letras/números' },
    { ok: hasDiscount,                 label: f.reward_type === 1 ? 'Valor do desconto > R$ 0' : 'Percentual definido' },
    { ok: (f.usage_quantity || 0) >= 1,label: 'Quantidade de usos ≥ 1' },
    ...(f.auto_renew ? [
      { ok: (f.duration_days || 0) >= 1 && (f.duration_days || 0) <= 90, label: 'Duração do ciclo entre 1 e 90 dias' },
    ] : [
      { ok: !!f.start_date,              label: 'Data de início' },
      { ok: !!f.end_date,                label: 'Data de fim' },
      ...(f.start_date && f.end_date ? [
        { ok: diffH >= 1, label: 'Fim ≥ 1h após início' },
        { ok: diffM <= 3, label: 'Validade ≤ 3 meses'   },
      ] : []),
    ]),
    ...(createWarning.value ? [{ ok: false, label: 'Corrigir conflito de valores' }] : []),
  ]
})

const createValid = computed(() => validationChecklist.value.every(i => i.ok))

// ── Confirmações ───────────────────────────────────────────────────────────
const confirmEndOpen    = ref(false)
const confirmDeleteOpen = ref(false)
const confirmTarget     = ref(null)
const actionLoading     = ref(false)

// ── Toast de cópia ─────────────────────────────────────────────────────────
const copiedToast = ref(false)

// ── Stats computados ───────────────────────────────────────────────────────
const stats = computed(() => {
  const all = vouchers.value
  return {
    total:      all.length,
    ongoing:    all.filter(v => v.status === 'ongoing').length,
    upcoming:   all.filter(v => v.status === 'upcoming').length,
    totalUsage: all.reduce((s, v) => s + (v.current_usage || 0), 0),
  }
})

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(async () => {
  await loadAccounts()
  await loadVouchers()
})

// ── Loaders ────────────────────────────────────────────────────────────────
async function loadAccounts() {
  try {
    const res = await ShopeeService.listAccounts()
    accounts.value = res.data || []
    if (accounts.value.length) form.value.account_id = accounts.value[0].id
  } catch { accounts.value = [] }
}

async function loadVouchers() {
  loading.value = true
  vouchers.value = []
  try {
    const params = { status: statusFilter.value }
    if (selectedAccountId.value) params.account_id = selectedAccountId.value
    const res = await ShopeeService.getVouchers(params)
    vouchers.value = res.data?.vouchers || []
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar cupons: ' + (e?.response?.data?.error || e.message) })
  } finally {
    loading.value = false
  }
}

// ── Filtros ────────────────────────────────────────────────────────────────
function selectAccount(id) { selectedAccountId.value = id; loadVouchers() }
function selectStatus(s)   { statusFilter.value = s; loadVouchers() }

// ── Detalhe ────────────────────────────────────────────────────────────────
function openDetail(v) {
  activeVoucher.value = v
  detailOpen.value    = true
}

// ── Renovação automática (FB-27) ──────────────────────────────────────────
const autoRenewOpen      = ref(false)
const autoRenewLoading   = ref(false)
const autoRenewTemplates = ref([])

async function openAutoRenewList() {
  autoRenewOpen.value = true
  autoRenewLoading.value = true
  try {
    const res = await ShopeeService.getVoucherAutoRenews()
    autoRenewTemplates.value = res.data?.templates || []
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro ao carregar renovações automáticas: ' + (e?.response?.data?.error || e.message) })
  } finally {
    autoRenewLoading.value = false
  }
}

async function toggleAutoRenew(template, active) {
  try {
    await ShopeeService.toggleVoucherAutoRenew(template.id, active)
    $q.notify({ type: 'positive', message: active ? 'Renovação reativada.' : 'Renovação desativada — o cupom atual continua válido até o fim, só não cria o próximo ciclo.' })
  } catch (e) {
    template.active = !active  // reverte o toggle visual
    $q.notify({ type: 'negative', message: 'Erro: ' + (e?.response?.data?.error || e.message) })
  }
}

// ── Criação ────────────────────────────────────────────────────────────────
function openCreate() {
  if (!accounts.value.length) {
    $q.notify({
      type: 'warning',
      message: 'Nenhuma conta Shopee conectada ou compartilhada com você. Conecte uma conta em Contas Shopee para criar cupons.',
    })
    return
  }
  form.value = defaultForm()
  form.value.account_id = accounts.value[0].id
  createOpen.value = true
}

async function submitCreate() {
  createLoading.value = true
  try {
    const f = form.value

    // FB-28: defesa em profundidade — maxlength + sanitizer podem ser burlados via DevTools/clipboard
    if (f.voucher_code.trim().length > 5 || f.voucher_code.trim().length < 1) {
      $q.notify({ type: 'negative', message: 'Código do cupom deve ter no máximo 5 caracteres' })
      return
    }

    // FB-27: renovação automática usa endpoint e payload próprios (sem datas manuais,
    // o backend controla o agendamento local)
    if (f.auto_renew) {
      const payload = {
        account_id:          f.account_id,
        voucher_name:        f.voucher_name.trim(),
        voucher_code_prefix: f.voucher_code.trim().toUpperCase(),
        reward_type:         f.reward_type,
        usage_quantity:      f.usage_quantity,
        min_basket_price:    f.min_basket_price || 0,
        duration_days:       f.duration_days,
      }
      if (f.reward_type === 1) {
        payload.discount_amount = parseFloat(f.discount_amount)
      } else {
        payload.percentage = parseInt(f.percentage)
        if (f.max_price) payload.max_price = parseFloat(f.max_price)
      }

      const res = await ShopeeService.createVoucherAutoRenew(payload)
      if (res.data?.first_cycle_ok) {
        $q.notify({ type: 'positive', message: 'Renovação automática criada — 1º cupom já está ativo!' })
      } else {
        $q.notify({ type: 'warning', message: 'Renovação automática criada, mas o 1º ciclo falhou: ' + (res.data?.error || 'erro desconhecido') + '. Tenta de novo amanhã.' })
      }
      createOpen.value = false
      await loadVouchers()
      return
    }

    const payload = {
      account_id:       f.account_id,
      voucher_name:     f.voucher_name.trim(),
      voucher_code:     f.voucher_code.trim().toUpperCase(),
      voucher_type:     f.voucher_type,
      reward_type:      f.reward_type,
      usage_quantity:   f.usage_quantity,
      min_basket_price: f.min_basket_price || 0,
      start_time:       toTimestamp(f.start_date),
      end_time:         toTimestamp(f.end_date),
    }

    if (f.reward_type === 1) {
      payload.discount_amount = parseFloat(f.discount_amount)
    } else {
      payload.percentage = parseInt(f.percentage)
      if (f.max_price) payload.max_price = parseFloat(f.max_price)
    }

    // Canais de exibição
    if (f.display_hidden) {
      payload.display_channel_list = []
      // display_start_time não pode ser enviado quando oculto
    } else if (f.display_all) {
      payload.display_channel_list = [1]
      if (f.display_start_date) payload.display_start_time = toTimestamp(f.display_start_date)
    } else {
      // "Padrão": não envia display_channel_list (Shopee usa padrão da plataforma)
      // mas display_start_date requer display_channel_list, então incluímos apenas se necessário
      if (f.display_start_date) {
        payload.display_channel_list = [1]
        payload.display_start_time   = toTimestamp(f.display_start_date)
      }
    }

    await ShopeeService.createVoucher(payload)
    $q.notify({ type: 'positive', message: `Cupom ${payload.voucher_code} criado!` })
    createOpen.value = false
    await loadVouchers()
  } catch (e) {
    const msg = e?.response?.data?.error || e.message
    $q.notify({ type: 'negative', message: 'Erro ao criar cupom: ' + msg })
  } finally {
    createLoading.value = false
  }
}

// ── Encerrar / Deletar ─────────────────────────────────────────────────────
function askEnd(v)    { confirmTarget.value = v; confirmEndOpen.value = true }
function askDelete(v) { confirmTarget.value = v; confirmDeleteOpen.value = true }

async function doEnd() {
  actionLoading.value = true
  try {
    await ShopeeService.endVoucher(confirmTarget.value.voucher_id, {
      account_id: confirmTarget.value.account_id,
    })
    $q.notify({ type: 'positive', message: 'Cupom encerrado.' })
    confirmEndOpen.value = false
    detailOpen.value     = false
    await loadVouchers()
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro: ' + (e?.response?.data?.error || e.message) })
  } finally { actionLoading.value = false }
}

async function doDelete() {
  actionLoading.value = true
  try {
    await ShopeeService.deleteVoucher(confirmTarget.value.voucher_id, {
      account_id: confirmTarget.value.account_id,
    })
    $q.notify({ type: 'positive', message: 'Cupom deletado.' })
    confirmDeleteOpen.value = false
    detailOpen.value        = false
    await loadVouchers()
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Erro: ' + (e?.response?.data?.error || e.message) })
  } finally { actionLoading.value = false }
}

// ── Copy ───────────────────────────────────────────────────────────────────
async function copyCode(code) {
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
    copiedToast.value = true
    setTimeout(() => copiedToast.value = false, 2000)
  } catch {
    $q.notify({ message: 'Código: ' + code })
  }
}

// ── Formatadores ───────────────────────────────────────────────────────────
function fmtBRL(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}
function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function fmtDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function toTimestamp(dtLocal) {
  return Math.floor(new Date(dtLocal).getTime() / 1000)
}
function usageColor(pct) {
  if (pct >= 80) return 'red-6'
  if (pct >= 50) return 'orange-6'
  return 'green-6'
}
</script>

<style scoped>
/* ── Page ── */
.sv-page { padding: 16px; max-width: 1200px; margin: 0 auto; }

/* ── Header ── */
.sv-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
.sv-header-left { display: flex; align-items: center; }
.sv-title { font-size: 17px; font-weight: 700; color: #1a1a2e; }
.sv-badge { font-size: 10px; font-weight: 700; background: #fff3e0; color: #e65100; padding: 2px 8px; border-radius: 10px; margin-left: 8px; letter-spacing: .3px; }
.sv-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* ── Pills ── */
.sv-pills { display: flex; gap: 4px; flex-wrap: wrap; }
.sv-pills--status { border-left: 1px solid #eee; padding-left: 10px; }
.sv-pills--form { gap: 6px; }
.sv-pill { font-size: 12px; padding: 4px 12px; border-radius: 16px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; color: #64748b; transition: all .15s; white-space: nowrap; }
.sv-pill--on { background: #0d9488; color: #fff; border-color: #0d9488; }

/* ── Stats bar ── */
.sv-stats { display: flex; gap: 20px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 20px; margin-bottom: 14px; }
.sv-stat { display: flex; flex-direction: column; align-items: center; }
.sv-stat-n { font-size: 18px; font-weight: 700; color: #0f172a; }
.sv-stat-n--green { color: #16a34a; }
.sv-stat-n--amber { color: #0f172a; }
.sv-stat-n--blue  { color: #0f172a; }
.sv-stat-l { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: .4px; }

/* ── Center / Empty ── */
.sv-center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; }
.sv-empty  { text-align: center; }

/* ── Grid ── */
.sv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }

/* ── Card ── */
.sv-card { background: #fff; border: 1px solid #f0f0f0; border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: box-shadow .15s, border-color .15s; position: relative; display: flex; flex-direction: column; gap: 6px; }
.sv-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.09); border-color: #f57c00; }

.sv-card-top { display: flex; align-items: center; justify-content: space-between; }

/* Status */
.sv-status { display: inline-flex; align-items: center; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; padding: 2px 8px; border-radius: 10px; gap: 4px; }
.sv-status--sm { font-size: 10px; padding: 2px 7px; }
.sv-status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.sv-status--ongoing  { background: #e8f5e9; color: #2e7d32; }
.sv-status--ongoing  .sv-status-dot  { background: #2e7d32; }
.sv-status--upcoming { background: #fff8e1; color: #f57f17; }
.sv-status--upcoming .sv-status-dot  { background: #f57f17; }
.sv-status--expired  { background: #f5f5f5; color: #9e9e9e; }
.sv-status--expired  .sv-status-dot  { background: #bdbdbd; }

.sv-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #0d9488;
  background: #f0fdf9;
  border: 1px solid #99f6e4;
  border-radius: 14px;
  padding: 3px 6px 3px 10px;
  margin-left: 8px;
}
.sv-filter-chip strong { font-weight: 700; }

.sv-type-badge { font-size: 10px; color: #aaa; display: flex; align-items: center; background: #fafafa; padding: 2px 8px; border-radius: 8px; }

/* Valor destaque */
.sv-value { font-size: 22px; font-weight: 800; color: #e65100; line-height: 1.1; }

.sv-name { font-size: 13px; color: #444; font-weight: 500; }

.sv-code-row { display: flex; align-items: center; gap: 4px; }
.sv-code { font-family: monospace; font-size: 11.5px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 1px 7px; border-radius: 5px; letter-spacing: .5px; }

.sv-min { font-size: 11px; color: #888; }

.sv-usage-block { display: flex; flex-direction: column; gap: 3px; margin-top: 2px; }
.sv-usage-label { display: flex; justify-content: space-between; font-size: 11px; color: #666; }

.sv-period { font-size: 11px; color: #bbb; display: flex; align-items: center; }
.sv-account { font-size: 11px; color: #bbb; display: flex; align-items: center; }

.sv-card-actions { position: absolute; top: 10px; right: 8px; display: flex; gap: 2px; }

/* ── Create dialog ── */
.sv-create-card { width: min(1040px, 96vw); max-height: 92vh; display: flex; flex-direction: column; }
.sv-dialog-header { display: flex; align-items: center; background: #e65100; color: #fff; padding: 10px 16px; flex-shrink: 0; }
.sv-dialog-footer { display: flex; align-items: center; border-top: 1px solid #eee; background: #fafafa; flex-shrink: 0; gap: 8px; padding: 10px 16px; }

/* Body 2 colunas — um único scroll para o corpo inteiro (evita scrollbars aninhados) */
.sv-create-body { display: flex; flex: 1; overflow-y: auto; overflow-x: hidden; min-height: 0; }

.sv-form { padding: 16px; display: flex; flex-direction: column; gap: 14px; flex: 1; min-width: 0; border-right: 1px solid #f0f0f0; }
.sv-form-section { display: flex; flex-direction: column; gap: 6px; }
.sv-form-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-start; }
.sv-form-field { display: flex; flex-direction: column; gap: 4px; }
.sv-form-field--grow { flex: 1; min-width: 120px; }
.sv-form-label { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: .5px; display: flex; align-items: center; }

/* Rules panel */
.sv-rules-panel { width: 260px; flex-shrink: 0; padding: 16px 14px; background: #fafafa; display: flex; flex-direction: column; }
.sv-rules-section { display: flex; flex-direction: column; gap: 6px; }
.sv-rules-title { font-size: 11px; font-weight: 700; color: #777; text-transform: uppercase; letter-spacing: .5px; display: flex; align-items: center; margin-bottom: 4px; }
.sv-check-item { display: flex; align-items: flex-start; font-size: 12px; color: #aaa; padding: 3px 0; transition: color .15s; }
.sv-check-item--ok { color: #2e7d32; }
.sv-rules-list { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 5px; }
.sv-rules-list li { font-size: 11px; color: #888; line-height: 1.4; }

/* Tipo select */
.sv-type-select { display: flex; gap: 8px; flex-wrap: wrap; }
.sv-type-opt { flex: 1; min-width: 120px; border: 2px solid #eee; border-radius: 10px; padding: 10px 12px; cursor: pointer; text-align: center; transition: all .15s; display: flex; flex-direction: column; align-items: center; gap: 4px; color: #999; }
.sv-type-opt:hover { border-color: #0d9488; color: #0d9488; }
.sv-type-opt--on { border-color: #0d9488; background: #f0fdf9; color: #0d9488; }
.sv-type-opt--disabled { cursor: not-allowed; opacity: .5; }
.sv-type-opt--disabled:hover { border-color: #eee; color: #999; }
.sv-type-opt-title { font-size: 13px; font-weight: 700; }
.sv-type-opt-desc  { font-size: 10px; color: #aaa; }

.sv-warn { font-size: 12px; color: #f57c00; background: #fff3e0; padding: 8px 12px; border-radius: 8px; display: flex; align-items: flex-start; }

/* Renovação automática (FB-27) */
.sv-autorenew-check { display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
.sv-ar-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 4px; border-bottom: 1px solid #f1f5f9; }
.sv-ar-row:last-child { border-bottom: none; }
.sv-ar-info { min-width: 0; }
.sv-ar-name { font-weight: 700; color: #0f172a; font-size: 13px; }
.sv-ar-error { font-size: 11px; color: #dc2626; margin-top: 2px; }

/* ── Detail ── */
.sv-detail-value { font-size: 32px; font-weight: 800; color: #e65100; text-align: center; padding: 16px 0 4px; }
.sv-detail-code-block { display: flex; align-items: center; justify-content: center; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0; }
.sv-detail-code { font-family: monospace; font-size: 20px; font-weight: 700; background: #f5f5f5; padding: 6px 18px; border-radius: 8px; letter-spacing: 2px; border: 2px dashed #ddd; color: #1a1a2e; }
.sv-detail-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.sv-detail-table td { padding: 9px 16px; border-bottom: 1px solid #f5f5f5; }
.sv-dt-lbl { color: #aaa; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; width: 130px; }

/* ── Toast ── */
.sv-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1a1a2e; color: #fff; padding: 8px 18px; border-radius: 20px; font-size: 13px; font-weight: 600; display: flex; align-items: center; box-shadow: 0 4px 20px rgba(0,0,0,.2); z-index: 9999; }
.sv-toast-anim-enter-active, .sv-toast-anim-leave-active { transition: opacity .2s, transform .2s; }
.sv-toast-anim-enter-from, .sv-toast-anim-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

/* ── Tabela de cupons (feedback #10 / FB-22 / FB-28) ── */
.sv-table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; }
.sv-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.sv-table th {
  text-align: left; font-size: 10px; font-weight: 700; letter-spacing: .5px;
  text-transform: uppercase; color: #94a3b8; padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0; background: #f8fafc; white-space: nowrap;
}
.sv-table th.right, .sv-table td.right { text-align: right; }
.sv-table td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.sv-tr { cursor: pointer; transition: background .12s; }
.sv-tr:hover { background: #f8fafc; }
.sv-td-name { max-width: 260px; }
.sv-td-name-main { font-weight: 700; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sv-td-name-sub { display: flex; align-items: center; gap: 2px; margin-top: 2px; }
.sv-td-value { font-weight: 700; color: #0d9488; white-space: nowrap; }
.sv-td-date { white-space: nowrap; color: #64748b; }
.sv-td-shop { color: #94a3b8; white-space: nowrap; font-size: 11.5px; margin-left: 2px; }

@media (max-width: 700px) {
  .sv-create-body { flex-direction: column; }
  .sv-form { border-right: none; border-bottom: 1px solid #f0f0f0; }
  .sv-rules-panel { width: 100%; flex-shrink: 1; }
}
@media (max-width: 600px) {
  .page-header { flex-wrap: wrap; gap: 8px; padding: 8px 12px; }
  .sv-pills--status { overflow-x: auto; display: flex; }
  .sv-table-wrap { overflow-x: auto; }
  .sv-td-name { max-width: 140px; }
}
</style>
