// A criação de conexão bancária pela tela (ticket `FIN-35`).
//
// O que este teste protege: o **par do Inter** (`.crt` + `.key`) precisa sair daqui inteiro. O
// certificado sozinho chega ao backend e a conexão falha na hora de usar — foi o que aconteceu com a
// Casa dos Suportes em 26/09, quando o dono refez o aplicativo e tentou cadastrar o par novo.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.fn(() => Promise.resolve({ data: {} }))
const patch = vi.fn(() => Promise.resolve({ data: {} }))
const formDataEnviados = []

vi.mock('src/boot/axios', () => ({
  api: {
    post: (...args) => {
      formDataEnviados.push(args[1])
      return post(...args)
    },
    patch: (...args) => patch(...args),
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

describe('FinanceiroService.atualizarConexao', () => {
  it('atualiza por PATCH e manda só o que mudou (o resto é mantido)', async () => {
    patch.mockClear()
    await FinanceiroService.atualizarConexao(7, {
      certificado: new File(['cert'], 'inter-casa.crt'),
      chave: new File(['key'], 'inter-casa.key'),
    })
    const [url, form] = patch.mock.calls[0]
    expect(url).toBe('/api/financeiro/conexoes/7/')
    expect(form.get('certificado').name).toBe('inter-casa.crt')
    expect(form.get('chave').name).toBe('inter-casa.key')
    // o que não foi enviado **não** vai — e por isso não apaga o que já está guardado
    expect(form.get('credenciais')).toBeNull()
    expect(form.get('senha_certificado')).toBeNull()
  })

  it('troca só a credencial quando é isso que mudou', async () => {
    patch.mockClear()
    await FinanceiroService.atualizarConexao(7, {
      credenciais: { client_id: 'novo', client_secret: 'novo-segredo' },
    })
    const [, form] = patch.mock.calls[0]
    expect(JSON.parse(form.get('credenciais'))).toEqual({ client_id: 'novo', client_secret: 'novo-segredo' })
    expect(form.get('certificado')).toBeNull()
  })
})
