import { describe, expect, it } from 'vitest'

import { classeDivergente, classeInfo, iconeDaClasse, varianteDaClasse } from 'src/utils/classes'

describe('varianteDaClasse', () => {
  it('usa a cor do significado: verde fecha, âmbar explica, vermelho não explica', () => {
    expect(varianteDaClasse('confere')).toBe('green')
    expect(varianteDaClasse('redistribuicao')).toBe('amber')
    expect(varianteDaClasse('nao_explicado')).toBe('red')
  })

  it('cobre as classes da conciliação', () => {
    expect(varianteDaClasse('de_base')).toBe('sky')
    expect(varianteDaClasse('de_dado')).toBe('amber')
  })

  it('classe desconhecida cai no neutro, sem quebrar a tela', () => {
    expect(varianteDaClasse('sei_la')).toBe('slate')
    expect(varianteDaClasse('')).toBe('slate')
    expect(varianteDaClasse(null)).toBe('slate')
  })
})

describe('iconeDaClasse', () => {
  it('dá ícone próprio a cada classe conhecida', () => {
    expect(iconeDaClasse('confere')).toBe('check')
    expect(iconeDaClasse('sem_declaracao')).toBe('help_outline')
    expect(iconeDaClasse('sem_tabela')).toBe('rule')
    expect(iconeDaClasse('de_base')).toBe('info')
    expect(iconeDaClasse('de_dado')).toBe('build')
  })

  it('classe desconhecida vira aviso', () => {
    expect(iconeDaClasse('sei_la')).toBe('warning')
  })
})

describe('classeInfo', () => {
  it('devolve as duas informações juntas', () => {
    expect(classeInfo('confere')).toEqual({ variante: 'green', icone: 'check' })
  })
})

describe('classeDivergente', () => {
  it('separa o que exige ação do dono do que já fecha', () => {
    expect(classeDivergente('nao_explicado')).toBe(true)
    expect(classeDivergente('redistribuicao')).toBe(true)
    expect(classeDivergente('de_dado')).toBe(true)
    expect(classeDivergente('confere')).toBe(false)
    expect(classeDivergente('de_base')).toBe(false)
    expect(classeDivergente('sei_la')).toBe(false)
  })
})
