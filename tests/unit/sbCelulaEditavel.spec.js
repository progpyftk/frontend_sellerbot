// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import SbCelulaEditavel from 'src/components/common/SbCelulaEditavel.vue'

const stubs = { QIcon: { template: '<i />' } }

function montar(props = {}) {
  return mount(SbCelulaEditavel, {
    props: { valor: '10', ...props },
    global: { stubs },
  })
}

/** Entra em edição pelo botão da célula e devolve o campo aberto. */
async function abrirEdicao(wrapper) {
  await wrapper.find('button.is-editavel').trigger('click')
  return wrapper.find('input, select')
}

describe('SbCelulaEditavel — leitura', () => {
  it('sem permissão mostra o valor formatado e não abre campo', () => {
    const wrapper = montar({ editavel: false, formatar: (v) => `R$ ${v}` })
    expect(wrapper.find('button.is-editavel').exists()).toBe(false)
    expect(wrapper.find('.is-somente-leitura').exists()).toBe(true)
    expect(wrapper.text()).toContain('R$ 10')
  })

  it('sem valor mostra — (ausência não é zero)', () => {
    const wrapper = montar({ valor: null, editavel: false })
    expect(wrapper.text()).toContain('—')
  })

  it('origem derivada: cadeado e motivo', () => {
    const wrapper = montar({ editavel: false, motivo: 'Vem de NF-e: entra por importação.' })
    expect(wrapper.find('.is-somente-leitura').attributes('title')).toContain('NF-e')
  })
})

describe('SbCelulaEditavel — edição', () => {
  it('abre com o valor atual', async () => {
    const wrapper = montar({ editavel: true, salvar: vi.fn() })
    const campo = await abrirEdicao(wrapper)
    expect(campo.element.value).toBe('10')
  })

  it('salva no Enter, converte moeda pt-BR e emite o valor novo', async () => {
    const salvar = vi.fn().mockResolvedValue({})
    const wrapper = montar({ editavel: true, tipo: 'moeda', salvar, formatar: (v) => `R$ ${v}` })

    const campo = await abrirEdicao(wrapper)
    await campo.setValue('1.234,56')
    await campo.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(salvar).toHaveBeenCalledWith(1234.56)
    expect(wrapper.emitted('salvo')[0]).toEqual([1234.56])
    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.text()).toContain('R$ 1234.56')
  })

  it('salva no blur', async () => {
    const salvar = vi.fn().mockResolvedValue({})
    const wrapper = montar({ editavel: true, salvar })

    const campo = await abrirEdicao(wrapper)
    await campo.setValue('20')
    await campo.trigger('blur')
    await flushPromises()

    expect(salvar).toHaveBeenCalledWith('20')
  })

  it('cancela no Esc sem chamar a API', async () => {
    const salvar = vi.fn()
    const wrapper = montar({ editavel: true, salvar })

    const campo = await abrirEdicao(wrapper)
    await campo.setValue('99')
    await campo.trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(salvar).not.toHaveBeenCalled()
    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.text()).toContain('10')
  })

  it('sem mudança não dispara requisição', async () => {
    const salvar = vi.fn()
    const wrapper = montar({ editavel: true, salvar })

    const campo = await abrirEdicao(wrapper)
    await campo.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(salvar).not.toHaveBeenCalled()
    expect(wrapper.find('input').exists()).toBe(false)
  })

  it('valor inválido não sai da edição', async () => {
    const salvar = vi.fn()
    const wrapper = montar({ editavel: true, tipo: 'moeda', salvar })

    const campo = await abrirEdicao(wrapper)
    await campo.setValue('abc')
    await campo.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(salvar).not.toHaveBeenCalled()
    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.text()).toContain('Informe um número')
  })

  it('respeita o validador da coluna', async () => {
    const salvar = vi.fn()
    const wrapper = montar({
      editavel: true,
      salvar,
      validar: (valor) => (Number(valor) < 5 ? 'Mínimo 5' : true),
    })

    const campo = await abrirEdicao(wrapper)
    await campo.setValue('3')
    await campo.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(salvar).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Mínimo 5')
  })

  it('quando a API recusa, volta o valor antigo e mostra o motivo', async () => {
    const salvar = vi.fn().mockRejectedValue(new Error('Sem permissão'))
    const wrapper = montar({ editavel: true, salvar, formatar: (v) => `R$ ${v}` })

    const campo = await abrirEdicao(wrapper)
    await campo.setValue('99')
    await campo.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(wrapper.emitted('falha')).toHaveLength(1)
    expect(wrapper.text()).toContain('Sem permissão')
    expect(wrapper.text()).toContain('R$ 10')
  })

  it('tipo seleção usa select com as opções', async () => {
    const salvar = vi.fn().mockResolvedValue({})
    const wrapper = montar({
      valor: 'manual',
      tipo: 'selecao',
      editavel: true,
      salvar,
      opcoes: [
        { label: 'Manual', value: 'manual' },
        { label: 'NF-e', value: 'nfe' },
      ],
    })

    const campo = await abrirEdicao(wrapper)
    expect(campo.element.tagName).toBe('SELECT')
    await campo.setValue('nfe')
    await campo.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(salvar).toHaveBeenCalledWith('nfe')
  })

  it('não abre edição sem a função de salvar', async () => {
    const wrapper = montar({ editavel: true, salvar: null })
    expect(wrapper.find('button.is-editavel').exists()).toBe(false)
  })
})
