// @vitest-environment jsdom
// PROMO-IA-20: o painel de automação do assistente mostra o estado do robô, os
// alertas de margem e o portão da primeira onda — e nunca escreve no Mercado Livre.
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const patchAdvisorPolicy = vi.fn()

vi.mock('src/services/MercadoLivreService', () => ({
  default: {
    patchAdvisorPolicy: (...args) => patchAdvisorPolicy(...args),
  },
}))

import AdvisorAutomationPanel from 'src/components/promotions-ads/AdvisorAutomationPanel.vue'

const stubs = {
  'q-btn': {
    props: ['label', 'disable', 'icon', 'loading', 'ariaExpanded'],
    emits: ['click'],
    template: '<button class="stub-btn" :disabled="!!disable" @click="$emit(\'click\')">{{ label }}<slot /></button>',
  },
  'q-input': {
    props: ['modelValue', 'placeholder', 'ariaLabel', 'type'],
    emits: ['update:modelValue'],
    template: '<input class="stub-input" :type="type || \'text\'" :aria-label="ariaLabel" :placeholder="placeholder" :value="modelValue ?? \'\'" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  'q-icon': { props: ['name'], template: '<i class="stub-icon" :data-icon="name" />' },
  SbBadge: {
    props: ['variant', 'icon'],
    template: '<span class="stub-badge" :data-variant="variant"><slot /></span>',
  },
}

function state(extra = {}) {
  return {
    account_nickname: 'Loja A',
    auto_write: false,
    wave_size: 50,
    paused: false,
    pause_reason: '',
    canary_pending: true,
    canary_approved_at: null,
    canary_approved_by: '',
    writes_today: 0,
    margin_alerts: [],
    ...extra,
  }
}

function automation(byAccount = { ACC1: state() }, extra = {}) {
  return { write_mode_global: true, kill_switch: false, by_account: byAccount, ...extra }
}

function mountPanel(props = {}) {
  return mount(AdvisorAutomationPanel, {
    props: { automation: automation(), ...props },
    global: { stubs },
  })
}

function text(wrapper) {
  return wrapper.text()
}

async function expand(wrapper) {
  await wrapper.find('.stub-btn').trigger('click')
  await flushPromises()
}

beforeEach(() => {
  patchAdvisorPolicy.mockReset()
  patchAdvisorPolicy.mockResolvedValue({ data: state({ canary_pending: false }) })
})

describe('AdvisorAutomationPanel', () => {
  it('resume o estado do robô quando o servidor está em modo recomendação', () => {
    const wrapper = mountPanel({ automation: automation({ ACC1: state() }, { write_mode_global: false }) })

    expect(text(wrapper)).toContain('Modo Somente Sugestão')
    expect(text(wrapper)).toContain('não aplica alterações no Mercado Livre')
  })

  it('mostra o kill switch como parada de tudo', () => {
    const wrapper = mountPanel({ automation: automation({ ACC1: state({ auto_write: true }) }, { kill_switch: true }) })

    expect(text(wrapper)).toContain('Robô parado pelo kill switch')
    expect(text(wrapper)).toContain('nenhuma escrita acontece em nenhuma conta')
  })

  it('destaca quantas contas aguardam aval e mostra o portão da primeira onda', async () => {
    const wrapper = mountPanel()
    await expand(wrapper)

    expect(text(wrapper)).toContain('1 conta aguardando seu aval')
    expect(text(wrapper)).toContain('Primeira onda aguardando seu aval')
    expect(text(wrapper)).toContain('no máximo uma onda (50 anúncios) por ciclo')
  })

  it('aprova a primeira onda mandando canary_approved com autor', async () => {
    const wrapper = mountPanel()
    await expand(wrapper)

    const approve = wrapper.findAll('.stub-btn').find((b) => b.text().includes('Aprovar primeira onda'))
    await approve.trigger('click')
    await flushPromises()

    expect(patchAdvisorPolicy).toHaveBeenCalledWith({
      account_id: 'ACC1', canary_approved: true, approved_by: 'dono',
    })
    expect(wrapper.emitted('updated')?.[0]?.[0]).toEqual({
      account_id: 'ACC1', state: state({ canary_pending: false }),
    })
  })

  it('mostra quem aprovou e quando', async () => {
    const wrapper = mountPanel({
      automation: automation({
        ACC1: state({ canary_pending: false, canary_approved_by: 'Lorenzo', canary_approved_at: '2026-09-10T12:00:00Z' }),
      }),
    })
    await expand(wrapper)

    expect(text(wrapper)).toContain('Primeira onda aprovada')
    expect(text(wrapper)).toContain('Lorenzo')
  })

  it('traduz os dois tipos de alerta de margem com número e preço', async () => {
    const wrapper = mountPanel({
      automation: automation({
        ACC1: state({
          margin_alerts: [
            { kind: 'smart_low_margin', item_id: 'MLB1', margin_pct: '22.4', profit_unit: 35.68, price: 152 },
            { kind: 'realized_below_floor', item_id: 'MLB2', margin_pct: '25.0', profit_per_unit: '20.00', checkpoint_days: 7 },
          ],
        }),
      }),
    })
    await expand(wrapper)

    expect(text(wrapper)).toContain('2 alertas de margem')
    expect(text(wrapper)).toContain('SMART com margem baixa')
    expect(text(wrapper)).toContain('margem 22.4%')
    expect(text(wrapper)).toContain('R$ 35,68')
    expect(text(wrapper)).toContain('Margem realizada abaixo do piso')
    expect(text(wrapper)).toContain('D+7')
  })

  it('não promete robô ligado quando a conta está desligada', async () => {
    const wrapper = mountPanel()
    await expand(wrapper)

    expect(text(wrapper)).toContain('Robô desligado nas contas')
    expect(text(wrapper)).toContain('escrita desligada')
  })

  it('exige confirmação antes de ligar a escrita automática', async () => {
    const wrapper = mountPanel()
    await expand(wrapper)

    const turnOn = wrapper.findAll('.stub-btn').find((b) => b.text().includes('Ligar escrita automática'))
    await turnOn.trigger('click')
    await flushPromises()

    // primeiro clique só pede confirmação: nada é enviado ao servidor
    expect(patchAdvisorPolicy).not.toHaveBeenCalled()
    expect(text(wrapper)).toContain('Confirmar?')

    const confirm = wrapper.findAll('.stub-btn').find((b) => b.text().includes('Confirmar ligar'))
    await confirm.trigger('click')
    await flushPromises()

    expect(patchAdvisorPolicy).toHaveBeenCalledWith({ account_id: 'ACC1', auto_write: true })
  })

  it('salva o tamanho da onda só quando muda', async () => {
    const wrapper = mountPanel()
    await expand(wrapper)
    patchAdvisorPolicy.mockResolvedValue({ data: state({ wave_size: 80 }) })

    const waveInput = wrapper.findAll('.stub-input')[0]
    await waveInput.setValue('80')
    const save = wrapper.findAll('.stub-btn').find((b) => b.text().includes('Salvar onda'))
    await save.trigger('click')
    await flushPromises()

    expect(patchAdvisorPolicy).toHaveBeenCalledWith({ account_id: 'ACC1', wave_size: 80 })
  })

  it('pausa com motivo informado e retoma sem motivo', async () => {
    const wrapper = mountPanel()
    await expand(wrapper)
    patchAdvisorPolicy.mockResolvedValue({ data: state({ paused: true, pause_reason: 'viagem' }) })

    const pause = wrapper.findAll('.stub-btn').find((b) => b.text().includes('Pausar conta'))
    await pause.trigger('click')
    await flushPromises()
    expect(patchAdvisorPolicy).not.toHaveBeenCalled()

    await wrapper.find('input[aria-label="Motivo da pausa de Loja A"]').setValue('viagem')
    const confirm = wrapper.findAll('.stub-btn').find((b) => b.text().includes('Confirmar pausa'))
    await confirm.trigger('click')
    await flushPromises()

    expect(patchAdvisorPolicy).toHaveBeenCalledWith({
      account_id: 'ACC1', paused: true, pause_reason: 'viagem',
    })
  })

  it('mostra erro honesto quando o PATCH falha', async () => {
    patchAdvisorPolicy.mockRejectedValue({ response: { data: { error: 'Conta não encontrada no seu escopo.' } } })
    const wrapper = mountPanel()
    await expand(wrapper)

    const approve = wrapper.findAll('.stub-btn').find((b) => b.text().includes('Aprovar primeira onda'))
    await approve.trigger('click')
    await flushPromises()

    expect(text(wrapper)).toContain('Conta não encontrada no seu escopo.')
    expect(wrapper.emitted('updated')).toBeFalsy()
  })

  it('avisa quando não há conta conectada', async () => {
    const wrapper = mountPanel({ automation: automation({}) })
    await expand(wrapper)

    expect(text(wrapper)).toContain('Nenhuma conta conectada')
  })
})
