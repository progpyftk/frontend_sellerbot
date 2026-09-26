<template>
  <div>

      <!-- ══════════════════════════════════════════ DIÁLOGO: NOVA CONEXÃO -->
      <q-dialog v-model="ctx.showNovaConexao" persistent>
<q-card style="width: 640px; max-width: 95vw;" class="rounded-borders">
  <q-card-section class="row items-center justify-between border-bottom bg-grey-1">
    <div class="text-h6 text-weight-bold text-grey-9">
      {{ ctx.conexaoEmEdicao ? 'Editar conexão bancária' : 'Nova conexão bancária' }}
    </div>
    <q-btn icon="close" flat round dense v-close-popup />
  </q-card-section>

  <q-card-section class="q-pa-md">
    <q-banner v-if="ctx.erroNovaConexao" dense rounded class="bg-red-1 text-red-10 q-mb-md">
      <template #avatar><q-icon name="error_outline" /></template>
      {{ ctx.erroNovaConexao }}
    </q-banner>

    <q-banner v-if="ctx.conexaoEmEdicao" dense rounded class="bg-blue-1 text-blue-10 q-mb-md">
      <template #avatar><q-icon name="info" /></template>
      A conta, as importações e as transações classificadas desta conexão <strong>não</strong> são
      tocadas. Deixe um campo vazio para <strong>manter</strong> o que já está guardado.
    </q-banner>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-sm-6">
        <SbSeletorEmpresa
          v-model="ctx.novaConexao.fiscal_account"
          :options="ctx.cnpjOptions"
          label="CNPJ fiscal *"
          :disable="!!ctx.conexaoEmEdicao"
          :rules="[(v) => !!v || 'Selecione o CNPJ']"
        />
      </div>
      <div class="col-12 col-sm-6">
        <q-select
          v-model="ctx.novaConexao.banco"
          :options="ctx.bancoOptions"
          emit-value
          map-options
          dense
          outlined
          label="Banco *"
          bg-color="white"
          :disable="!!ctx.conexaoEmEdicao"
          :rules="[(v) => !!v || 'Selecione o banco']"
          @update:model-value="ctx.onBancoChange"
        />
      </div>
      <div class="col-12 col-sm-6">
        <q-select
          v-model="ctx.novaConexao.ambiente"
          :options="ctx.ambienteOptions"
          emit-value
          map-options
          dense
          outlined
          label="Ambiente"
          bg-color="white"
        />
      </div>
    </div>

    <!-- Campos de credencial montados dinamicamente a partir da API -->
    <div v-if="ctx.bancoSelecionado" class="q-mt-md">
      <div class="text-subtitle2 text-weight-bold text-grey-9 q-mb-sm">
        Credenciais
        <q-badge
          v-if="!ctx.bancoSelecionado.aceita_api"
          color="amber-2"
          text-color="amber-10"
          class="q-ml-xs text-bold"
        >
          Somente arquivo
        </q-badge>
      </div>

      <div v-if="ctx.bancoSelecionado.campos_credencial && ctx.bancoSelecionado.campos_credencial.length" class="row q-col-gutter-md">
        <div
          v-for="campo in ctx.bancoSelecionado.campos_credencial"
          :key="campo.nome"
          class="col-12 col-sm-6"
        >
          <q-input
            v-model="ctx.novaConexao.credenciais[campo.nome]"
            dense
            outlined
            bg-color="white"
            autocomplete="new-password"
            :type="campo.secreto ? 'password' : 'text'"
            :label="campo.rotulo || campo.nome"
            :hint="
              ctx.conexaoEmEdicao
                ? 'Vazio mantém o valor atual (a API nunca devolve o segredo)'
                : campo.secreto
                  ? 'Armazenado com segurança (write-only)'
                  : ''
            "
            :rules="[(v) => !campo.obrigatorio || (v !== null && v !== undefined && String(v).length > 0) || 'Campo obrigatório']"
          />
        </div>
      </div>
      <div v-else class="text-caption text-grey-6">
        Este banco não exige credenciais de API.
      </div>

      <div v-if="ctx.bancoSelecionado.exige_certificado" class="q-mt-sm">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-7">
            <q-file
              v-model="ctx.novaConexao.certificado"
              dense
              outlined
              clearable
              bg-color="white"
              accept=".pfx,.p12,.crt,.pem"
              label="Certificado digital (.pfx/.p12 ou .crt/.pem)"
            >
              <template #prepend><q-icon name="badge" /></template>
            </q-file>
          </div>
          <div class="col-12 col-sm-5">
            <q-input
              v-model="ctx.novaConexao.senha_certificado"
              dense
              outlined
              type="password"
              autocomplete="new-password"
              bg-color="white"
              :label="ctx.conexaoEmEdicao ? 'Senha do certificado (.pfx) — vazio mantém' : 'Senha do certificado (.pfx)'"
            />
          </div>
        </div>

        <!-- O Inter entrega o par **`.crt` + `.key`** (não um `.pfx`): a chave é um arquivo à parte e
             sem ela a conexão autentica nunca. Com `.pfx`, este campo fica vazio. -->
        <div class="row q-col-gutter-md q-mt-sm">
          <div class="col-12 col-sm-7">
            <q-file
              v-model="ctx.novaConexao.chave"
              dense
              outlined
              clearable
              bg-color="white"
              accept=".key,.pem"
              label="Chave privada (.key) — só quando o banco entrega o par separado"
            >
              <template #prepend><q-icon name="vpn_key" /></template>
            </q-file>
          </div>
          <div class="col-12 col-sm-5 text-caption text-grey-7 self-center">
            Envie o certificado <strong>e</strong> a chave uma única vez: os dois ficam guardados
            cifrados e sobrevivem ao deploy.
          </div>
        </div>
      </div>
    </div>
  </q-card-section>

  <q-card-actions align="right" class="q-pa-md border-top">
    <q-btn flat no-caps label="Cancelar" color="grey-8" v-close-popup />
    <q-btn
      unelevated
      no-caps
      color="teal-8"
      text-color="white"
      icon="save"
      :label="ctx.conexaoEmEdicao ? 'Salvar alterações' : 'Criar conexão'"
      :loading="ctx.salvandoConexao"
      @click="ctx.salvarConexao"
    />
  </q-card-actions>
</q-card>
      </q-dialog>

      <!-- ══════════════════════════════════════════ DIÁLOGO: PENDENTES POR CONTRAPARTE -->
      <q-dialog v-model="ctx.showContrapartes">
<q-card style="width: 860px; max-width: 96vw;" class="rounded-borders">
  <q-card-section class="row items-center justify-between border-bottom bg-grey-1">
    <div>
      <div class="text-h6 text-weight-bold text-grey-9">Resolver pendentes por contraparte</div>
      <div class="text-caption text-grey-7">
        Classificar uma linha ensina o sistema: as iguais do mesmo CNPJ entram
        classificadas sozinhas na próxima importação.
      </div>
    </div>
    <q-btn icon="close" flat round dense v-close-popup />
  </q-card-section>

  <q-card-section class="q-pa-md contrapartes-corpo">
    <div v-if="ctx.carregandoContrapartes" class="column items-center q-pa-lg">
      <q-spinner color="teal-8" size="32px" />
      <div class="text-caption text-grey-7 q-mt-sm">Carregando contrapartes pendentes…</div>
    </div>

    <SbEmptyState
      v-else-if="ctx.gruposPendentes.length === 0"
      title="Nenhuma contraparte pendente"
      message="Tudo que chegou neste período já está classificado."
    />

    <div v-else class="column q-gutter-sm">
      <div
        v-for="grupo in ctx.gruposPendentes"
        :key="grupo.contraparte_chave"
        class="contraparte-item q-pa-sm rounded-borders"
      >
        <div class="row items-center q-col-gutter-md">
          <div class="col-12 col-md-5">
            <div class="text-weight-medium text-grey-9">
              {{ grupo.contraparte_nome || '(sem contraparte identificada)' }}
            </div>
            <div class="text-caption text-grey-6 font-mono">
              {{ grupo.contraparte_cnpj ? formatCnpj(grupo.contraparte_cnpj) : grupo.contraparte_chave }}
            </div>
            <div class="text-caption text-grey-6">
              {{ grupo.linhas }} lançamento(s) · {{ ctx.descreverTipos(grupo.tipos) }} ·
              {{ formatDate(grupo.primeira_data) }} a {{ formatDate(grupo.ultima_data) }}
            </div>
          </div>
          <div class="col-6 col-md-2 text-right">
            <div
              class="text-weight-bold"
              :class="(grupo.tipos || []).includes('D') ? 'text-red-9' : 'text-green-9'"
            >
              {{ formatCurrency(grupo.valor) }}
            </div>
          </div>
          <div class="col-12 col-md-5">
            <div class="row items-center q-gutter-sm no-wrap">
              <SbCategoriaSelect
                v-model="ctx.categoriasContraparte[grupo.contraparte_chave]"
                :grupos="ctx.gruposCategorias"
                :loading="ctx.loadingCategorias"
                dense
                outlined
                bg-color="white"
                label="Classificar como"
                class="col"
              />
              <q-btn
                unelevated
                no-caps
                color="teal-8"
                text-color="white"
                icon="done_all"
                label="Aplicar"
                :disable="!ctx.categoriasContraparte[grupo.contraparte_chave]"
                :loading="ctx.classificandoGrupo === grupo.contraparte_chave"
                @click="ctx.classificarGrupo(grupo)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </q-card-section>

  <q-card-actions align="right" class="q-pa-md border-top">
    <q-btn flat no-caps label="Fechar" color="grey-8" v-close-popup />
  </q-card-actions>
</q-card>
      </q-dialog>

      <!-- ══════════════════════════════════════════ DIÁLOGO: SINCRONIZAR -->
      <q-dialog v-model="ctx.showSincronizar">
<q-card style="width: 460px; max-width: 95vw;" class="rounded-borders">
  <q-card-section class="row items-center justify-between border-bottom bg-grey-1">
    <div class="text-h6 text-weight-bold text-grey-9">Sincronizar extrato</div>
    <q-btn icon="close" flat round dense v-close-popup />
  </q-card-section>

  <q-card-section class="q-pa-md">
    <div class="text-body2 text-grey-8 q-mb-md">
      {{ ctx.sincronizarAlvo?.conexao?.banco_nome }} —
      {{ ctx.sincronizarAlvo?.conta?.apelido || ctx.sincronizarAlvo?.conta?.numero }}
    </div>
    <div class="row q-col-gutter-md">
      <div class="col-6">
        <q-input v-model="ctx.sincronizarPeriodo.data_inicio" type="date" dense outlined label="Data início" bg-color="white" />
      </div>
      <div class="col-6">
        <q-input v-model="ctx.sincronizarPeriodo.data_fim" type="date" dense outlined label="Data fim" bg-color="white" />
      </div>
    </div>
    <q-banner v-if="ctx.resultadoSincronizacao" dense rounded class="q-mt-md"
      :class="ctx.resultadoSincronizacao.ok ? 'bg-green-1 text-green-10' : 'bg-red-1 text-red-10'">
      <template #avatar>
        <q-icon :name="ctx.resultadoSincronizacao.ok ? 'check_circle' : 'error_outline'" />
      </template>
      {{ ctx.resultadoSincronizacao.mensagem }}
    </q-banner>
  </q-card-section>

  <q-card-actions align="right" class="q-pa-md border-top">
    <q-btn flat no-caps label="Fechar" color="grey-8" v-close-popup />
    <q-btn
      unelevated
      no-caps
      color="teal-8"
      text-color="white"
      icon="sync"
      label="Sincronizar"
      :loading="ctx.sincronizando"
      :disable="!ctx.sincronizarPeriodo.data_inicio || !ctx.sincronizarPeriodo.data_fim"
      @click="ctx.sincronizar"
    />
  </q-card-actions>
</q-card>
      </q-dialog>

  </div>
</template>

<script setup>
// Diálogos do módulo de bancos/extratos (ticket FIN-23): nova conexão, pendentes por contraparte e
// sincronizar. O estado e as ações continuam no `BancosExtratosPage`, que os entrega no objeto reativo
// `ctx` (refs desembrulham no acesso). Os formatadores vêm de `utils/formato.js`.
import SbCategoriaSelect from 'src/components/common/SbCategoriaSelect.vue'
import SbEmptyState from 'src/components/common/SbEmptyState.vue'
import SbSeletorEmpresa from 'src/components/common/SbSeletorEmpresa.vue'
import { formatCnpj, formatCurrency, formatDate } from 'src/utils/formato'

defineProps({
  ctx: { type: Object, required: true },
})
</script>
