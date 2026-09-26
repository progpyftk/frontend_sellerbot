// A criação de conexão bancária pela tela (ticket `FIN-35`).
//
// O que este teste protege: o **par do Inter** (`.crt` + `.key`) precisa sair daqui inteiro. O
// certificado sozinho chega ao backend e a conexão falha na hora de usar — foi o que aconteceu com a
// Casa dos Suportes em 26/09, quando o dono refez o aplicativo e tentou cadastrar o par novo.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.fn(() => Promise.resolve({ data: {} }))
const formDataEnviados = []

vi.mock('src/boot/axios', () => ({
  api: {
    post: (...args) => {
      formDataEnviados.push(args[1])
      return post(...args)
    },
  },
}))

import FinanceiroService from 'src/services/FinanceiroService'

describe('FinanceiroService.criarConexao', () => {
  beforeEach(() => {
    formDataEnviados.length = 0
    post.mockClear()
  })

  it('envia certificado E chave quando o banco entrega o par separado', async () => {
    await FinanceiroService.criarConexao({
      fiscal_account: 1,
      banco: 'inter',
      ambiente: 'producao',
      credenciais: { client_id: 'abc', client_secret: 'xyz' },
      certificado: new File(['cert'], 'inter-casa.crt'),
      chave: new File(['key'], 'inter-casa.key'),
    })
    const form = formDataEnviados[0]
    expect(form.get('certificado').name).toBe('inter-casa.crt')
    expect(form.get('chave').name).toBe('inter-casa.key')
    expect(JSON.parse(form.get('credenciais'))).toEqual({ client_id: 'abc', client_secret: 'xyz' })
  })

  it('com .pfx a chave fica de fora e a senha vai', async () => {
    await FinanceiroService.criarConexao({
      fiscal_account: 1,
      banco: 'inter',
      ambiente: 'producao',
      certificado: new File(['pfx'], 'cert.pfx'),
      senha_certificado: 'segredo',
    })
    const form = formDataEnviados[0]
    expect(form.get('certificado').name).toBe('cert.pfx')
    expect(form.get('chave')).toBeNull()
    expect(form.get('senha_certificado')).toBe('segredo')
  })
})
