// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SbTabela from 'src/components/common/SbTabela.vue'

const iconStub = { template: '<i />' }
const stubs = { QIcon: iconStub, QSpinnerDots: iconStub }

const COLUNAS = [
  { chave: 'nome', rotulo: 'Nome', ordenavel: true },
  { chave: 'valor', rotulo: 'Valor', tipo: 'moeda', alinhamento: 'right', ordenavel: true },
  { chave: 'obs', rotulo: 'Observação' },
]

const LINHAS = [
  { id: 1, nome: 'Beta', valor: '10.00', obs: null },
  { id: 2, nome: 'Alfa', valor: '9.00', obs: 'nota' },
]

function montar(props = {}, extras = {}) {
  return mount(SbTabela, {
    props: { colunas: COLUNAS, linhas: LINHAS, ...props },
    global: { stubs },
    ...extras,
  })
}

describe('SbTabela — leitura', () => {
  it('desenha as linhas na ordem recebida', () => {
    const wrapper = montar()
    const linhas = wrapper.findAll('tbody tr')
    expect(linhas).toHaveLength(2)
    expect(linhas[0].text()).toContain('Beta')
    expect(linhas[1].text()).toContain('Alfa')
  })

  it('mostra — para ausência, e o slot da coluna tem a palavra final', () => {
    const semSlot = montar()
    expect(semSlot.findAll('tbody tr')[0].findAll('td')[2].text()).toBe('—')

    const comSlot = montar({}, { slots: { 'celula-valor': '<b class="moeda">R$ formatado</b>' } })
    expect(comSlot.findAll('tbody tr')[0].find('.moeda').text()).toBe('R$ formatado')
  })
})

describe('SbTabela — ordenação', () => {
  it('emite o ciclo asc → desc → origem ao clicar no cabeçalho', async () => {
    const wrapper = montar()
    const cabecalhoNome = wrapper.findAll('thead button')[0]

    // A ordenação é controlada pelo pai (`v-model:ordenacao`): o teste devolve o estado
    // emitido como prop, que é o que uma tela real faz.
    await cabecalhoNome.trigger('click')
    let estado = wrapper.emitted('ordenar').at(-1)[0]
    expect(estado).toEqual({ chave: 'nome', direcao: 'asc' })
    expect(wrapper.emitted('update:ordenacao').at(-1)[0]).toEqual(estado)

    await wrapper.setProps({ ordenacao: estado })
    await cabecalhoNome.trigger('click')
    estado = wrapper.emitted('ordenar').at(-1)[0]
    expect(estado).toEqual({ chave: 'nome', direcao: 'desc' })

    await wrapper.setProps({ ordenacao: estado })
    await cabecalhoNome.trigger('click')
    expect(wrapper.emitted('ordenar').at(-1)[0]).toEqual({ chave: '', direcao: '' })
  })

  it('ordena a lista pelo tipo da coluna e marca o aria-sort', () => {
    const wrapper = montar({ ordenacao: { chave: 'valor', direcao: 'asc' } })

    // 9.00 antes de 10.00: é número, não texto.
    expect(wrapper.findAll('tbody tr')[0].text()).toContain('Alfa')
    expect(wrapper.findAll('th')[1].attributes('aria-sort')).toBe('ascending')
    expect(wrapper.findAll('th')[0].attributes('aria-sort')).toBe('none')
  })

  it('coluna não ordenável não recebe aria-sort', () => {
    const wrapper = montar()
    expect(wrapper.findAll('th')[2].attributes('aria-sort')).toBeUndefined()
    expect(wrapper.findAll('thead button')).toHaveLength(2)
  })
})

describe('SbTabela — linha clicável', () => {
  it('emite a linha no clique e no teclado', async () => {
    const wrapper = montar()
    const primeira = wrapper.findAll('tbody tr')[0]

    await primeira.trigger('click')
    expect(wrapper.emitted('linha')[0]).toEqual([LINHAS[0]])

    await primeira.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('linha')[1]).toEqual([LINHAS[0]])

    await primeira.trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('linha')[2]).toEqual([LINHAS[0]])
  })

  it('clicar em um controle dentro da linha não abre o detalhe', async () => {
    const wrapper = montar({}, { slots: { 'celula-nome': '<button class="acao">abrir</button>' } })

    await wrapper.find('tbody button.acao').trigger('click')
    expect(wrapper.emitted('linha')).toBeUndefined()

    await wrapper.findAll('tbody tr')[0].trigger('click')
    expect(wrapper.emitted('linha')).toHaveLength(1)
  })
})

describe('SbTabela — estados', () => {
  it('vazio usa o texto do prop', () => {
    const wrapper = montar({ linhas: [], vazio: { titulo: 'Sem lançamentos', mensagem: 'Troque o recorte.' } })
    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.text()).toContain('Sem lançamentos')
  })

  it('carregando esconde a grade', () => {
    const wrapper = montar({ carregando: true })
    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.text()).toContain('Carregando')
  })

  it('erro mostra a mensagem', () => {
    const wrapper = montar({ erro: 'Falha ao ler o livro' })
    expect(wrapper.find('table').exists()).toBe(false)
    expect(wrapper.text()).toContain('Falha ao ler o livro')
  })
})
