import { describe, expect, it } from 'vitest'
import {
  sprintContagemLabel,
  sprintTicketEstado,
} from 'src/utils/sprintProgress'

describe('sprint progress helpers (ROT-6)', () => {
  it('resume feitos e a fazer da contagem', () => {
    expect(sprintContagemLabel({ done: 9, todo: 1 })).toBe('9 feitos · 1 a fazer')
  })

  it('rotula wip como andando e blocked como travado', () => {
    expect(sprintTicketEstado('wip')).toBe('Andando')
    expect(sprintTicketEstado('blocked')).toBe('Travado')
  })

  it('cai para o estado cru em valor desconhecido', () => {
    expect(sprintTicketEstado('todo')).toBe('todo')
  })
})
