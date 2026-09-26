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
            icon="edit"
            @click="emit('editar', conexao)"
          >
            <q-tooltip>Editar credencial ou renovar o certificado (não perde o extrato)</q-tooltip>
          </q-btn>
          <q-btn
            flat
            dense
            round
            color="grey-7"
            icon="delete_outline"
            @click="emit('remover', conexao)"
          >
            <q-tooltip>Remover conexão (apaga o extrato importado por ela)</q-tooltip>
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

        <SbTabela
          :colunas="contaColumns"
          :linhas="conexao.contas || []"
          chave-linha="id"
          rotulo="Contas vinculadas à conexão"
          densidade="compacta"
          :vazio="{
            titulo: 'Nenhuma conta retornada por esta conexão',
            mensagem: 'Teste a conexão ou sincronize para buscar as contas.',
          }"
        >
          <template #celula-apelido="{ linha }">
            <div class="text-weight-medium text-grey-9">{{ linha.apelido || 'Conta' }}</div>
            <div class="text-caption text-grey-6 font-mono">
              Ag {{ linha.agencia || '—' }} / C {{ linha.numero || '—' }}{{ linha.digito ? '-' + linha.digito : '' }}
            </div>
          </template>

          <template #celula-saldo="{ linha }">
            <span class="text-weight-bold" :class="Number(linha.saldo) < 0 ? 'text-red-9' : 'text-teal-9'">
              {{ formatCurrency(linha.saldo) }}
            </span>
            <div v-if="linha.saldo_em" class="text-caption text-grey-6">
              em {{ formatDate(linha.saldo_em) }}
            </div>
          </template>

          <template #celula-actions="{ linha }">
            <div class="text-center" data-sem-clique>
              <q-btn
                flat
                dense
                no-caps
                color="teal-8"
                icon="sync"
                label="Sincronizar"
                @click="emit('sincronizar', conexao, linha)"
              />
              <q-btn
                flat
                dense
                no-caps
                color="grey-7"
                icon="table_view"
                label="Ver extrato"
                @click="emit('ver-extrato', conexao, linha)"
              />
            </div>
          </template>
        </SbTabela>
      </SbCard>
    </template>
  </div>
</template>

<script setup>
// Aba "Conexões" do módulo de bancos/extratos (tickets FIN-23 e FINT-6).
//
// Apresentação: o estado (`conexoes`, `testes`, `loading`) e as ações continuam no
// `BancosExtratosPage`; aqui só entram os dados e saem os eventos. Os formatadores vêm de
// `utils/formato.js`, que é onde os quatro passaram a morar quando as abas viraram componentes.
//
// A grade de contas é a `SbTabela` (FINT-6), como as demais tabelas do módulo — a `q-table` saiu
// daqui também, para o módulo não ficar com duas gramáticas.
import SbCard from 'src/components/common/SbCard.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbTabela from 'src/components/common/SbTabela.vue'
import { formatCnpj, formatCurrency, formatDate, formatDateTime } from 'src/utils/formato'

defineProps({
  loadingConexoes: { type: Boolean, default: false },
  conexoes: { type: Array, default: () => [] },
  testes: { type: Object, default: () => ({}) },
  testandoId: { type: [Number, String], default: null },
  contaColumns: { type: Array, default: () => [] },
})
const emit = defineEmits(['nova', 'editar', 'testar', 'remover', 'sincronizar', 'ver-extrato'])
</script>
