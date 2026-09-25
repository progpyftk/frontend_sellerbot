<template>
  <div>
    <SbEmptyState
      v-if="loadingConexoes && conexoes.length === 0"
      variant="loading"
      title="Carregando conexões bancárias"
    />

    <SbEmptyState
      v-else-if="conexoes.length === 0"
      title="Nenhuma conexão bancária cadastrada"
      message="Conecte um banco para importar o extrato automaticamente via API."
    >
      <template #action>
        <q-btn
          unelevated
          color="teal-8"
          text-color="white"
          icon="add"
          label="Nova conexão"
          no-caps
          @click="emit('nova')"
        />
      </template>
    </SbEmptyState>

    <template v-else>
      <SbCard v-for="conexao in conexoes" :key="conexao.id" class="q-mb-md">
        <template #header>
          <div class="row items-center no-wrap">
            <q-icon name="account_balance" size="sm" color="teal-8" class="q-mr-sm" />
            <div>
              <div class="text-subtitle1 text-weight-bold text-grey-9">
                {{ conexao.banco_nome || conexao.banco }}
              </div>
              <div class="text-caption text-grey-6">
                {{ conexao.razao_social || 'Razão social não informada' }}
                <span class="font-mono">· {{ formatCnpj(conexao.cnpj) }}</span>
              </div>
            </div>
            <q-badge
              class="q-ml-md text-bold"
              :color="conexao.status === 'ativa' ? 'green-2' : 'grey-3'"
              :text-color="conexao.status === 'ativa' ? 'green-10' : 'grey-9'"
            >
              {{ conexao.status || '—' }}
            </q-badge>
            <q-badge class="q-ml-xs text-bold" color="blue-grey-1" text-color="blue-grey-9">
              {{ conexao.ambiente }}
            </q-badge>
          </div>
        </template>

        <template #actions>
          <q-btn
            flat
            dense
            no-caps
            color="teal-8"
            icon="network_check"
            label="Testar conexão"
            :loading="testandoId === conexao.id"
            @click="emit('testar', conexao)"
          />
          <q-btn
            flat
            dense
            round
            color="grey-7"
            icon="delete_outline"
            @click="emit('remover', conexao)"
          >
            <q-tooltip>Remover conexão</q-tooltip>
          </q-btn>
        </template>

        <div class="row q-col-gutter-md q-mb-sm">
          <div class="col-12 col-sm-6 col-md-4">
            <div class="text-caption text-grey-6">Última sincronização</div>
            <div class="text-weight-medium text-grey-9">
              {{ formatDateTime(conexao.ultima_sincronizacao) }}
            </div>
          </div>
          <div class="col-12 col-sm-6 col-md-4">
            <div class="text-caption text-grey-6">Contas vinculadas</div>
            <div class="text-weight-medium text-grey-9">
              {{ (conexao.contas || []).length }}
            </div>
          </div>
        </div>

        <q-banner
          v-if="conexao.ultimo_erro"
          dense
          rounded
          class="bg-red-1 text-red-10 q-mb-sm"
        >
          <template #avatar><q-icon name="error_outline" /></template>
          {{ conexao.ultimo_erro }}
        </q-banner>

        <q-banner
          v-if="testes[conexao.id]"
          dense
          rounded
          class="q-mb-sm"
          :class="testes[conexao.id].ok ? 'bg-green-1 text-green-10' : 'bg-amber-1 text-amber-10'"
        >
          <template #avatar>
            <q-icon :name="testes[conexao.id].ok ? 'check_circle' : 'warning'" />
          </template>
          {{ testes[conexao.id].mensagem }}
          <span v-if="testes[conexao.id].saldo !== null && testes[conexao.id].saldo !== undefined">
            — saldo informado: <strong>{{ formatCurrency(testes[conexao.id].saldo) }}</strong>
          </span>
        </q-banner>

        <q-table
          :rows="conexao.contas || []"
          :columns="contaColumns"
          row-key="id"
          dense
          flat
          bordered
          :pagination="{ rowsPerPage: 10 }"
          :no-data-label="'Nenhuma conta retornada por esta conexão.'"
        >
          <template #body-cell-apelido="props">
            <q-td :props="props">
              <div class="text-weight-medium text-grey-9">
                {{ props.row.apelido || 'Conta' }}
              </div>
              <div class="text-caption text-grey-6 font-mono">
                Ag {{ props.row.agencia || '—' }} / C {{ props.row.numero || '—' }}{{ props.row.digito ? '-' + props.row.digito : '' }}
              </div>
            </q-td>
          </template>

          <template #body-cell-saldo="props">
            <q-td :props="props">
              <span class="text-weight-bold" :class="Number(props.row.saldo) < 0 ? 'text-red-9' : 'text-teal-9'">
                {{ formatCurrency(props.row.saldo) }}
              </span>
              <div v-if="props.row.saldo_em" class="text-caption text-grey-6">
                em {{ formatDate(props.row.saldo_em) }}
              </div>
            </q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn
                flat
                dense
                no-caps
                color="teal-8"
                icon="sync"
                label="Sincronizar"
                @click="emit('sincronizar', conexao, props.row)"
              />
              <q-btn
                flat
                dense
                no-caps
                color="grey-7"
                icon="table_view"
                label="Ver extrato"
                @click="emit('ver-extrato', conexao, props.row)"
              />
            </q-td>
          </template>
        </q-table>
      </SbCard>
    </template>
  </div>
</template>

<script setup>
// Aba "Conexões" do módulo de bancos/extratos (ticket FIN-23).
//
// Apresentação: o estado (`conexoes`, `testes`, `loading`) e as ações continuam no
// `BancosExtratosPage`; aqui só entram os dados e saem os eventos. Os formatadores vêm de
// `utils/formato.js`, que é onde os quatro passaram a morar quando as abas viraram componentes.
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import { formatCnpj, formatCurrency, formatDate, formatDateTime } from 'src/utils/formato'

defineProps({
  loadingConexoes: { type: Boolean, default: false },
  conexoes: { type: Array, default: () => [] },
  testes: { type: Object, default: () => ({}) },
  testandoId: { type: [Number, String], default: null },
  contaColumns: { type: Array, default: () => [] },
})
const emit = defineEmits(['nova', 'testar', 'remover', 'sincronizar', 'ver-extrato'])
</script>
