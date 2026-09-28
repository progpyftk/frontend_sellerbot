import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
const post = vi.fn()

vi.mock('src/boot/axios', () => ({
  api: {
    get: (...args) => get(...args),
    post: (...args) => post(...args),
  },
}))

import ShopeeService from 'src/services/ShopeeService'

describe('reconexão Shopee', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('pede a URL pelo ID da conta sem enviar credenciais', async () => {
    post.mockResolvedValue({ data: { auth_url: 'https://shopee.test/authorize' } })

    await ShopeeService.getReconnectAuthUrl(7)

    expect(post).toHaveBeenCalledWith('/shopee/accounts/7/reconnect-auth-url/')
    expect(post.mock.calls[0]).toHaveLength(1)
  })

  it('envia ao callback somente o identificador da conta no fluxo de reconexão', async () => {
    const payload = { account_id: '7', code: 'oauth-code', shop_id: '353294652' }
    post.mockResolvedValue({ data: { success: true } })

    await ShopeeService.callback(payload)

    expect(post).toHaveBeenCalledWith('/shopee/accounts/callback/', payload)
    expect(JSON.stringify(post.mock.calls)).not.toContain('partner_key')
  })
})
