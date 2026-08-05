import { describe, expect, it } from 'vitest'

import {
  createAssistantMessage,
  createSseParser,
  normalizeHistoricalMessage,
  reduceSellerbotEvent,
} from '../../src/services/sellerbotStream.js'

describe('sellerbotStream reducer', () => {
  it('appends textual tokens to content', () => {
    let message = createAssistantMessage()
    message = reduceSellerbotEvent(message, { type: 'token', text: 'Olá' })
    message = reduceSellerbotEvent(message, { type: 'token', text: ' mundo' })

    expect(message.content).toBe('Olá mundo')
  })

  it('keeps tool calls as safe labels without arguments', () => {
    const message = reduceSellerbotEvent(createAssistantMessage(), {
      type: 'tool_call',
      text: 'Consultando pedidos',
      args: '{"account_id":"private"}',
    })

    expect(message.logs[0]).toEqual({ type: 'tool_call', text: 'Consultando pedidos' })
    expect(JSON.stringify(message)).not.toContain('account_id')
  })

  it('does not store raw tool results', () => {
    const message = reduceSellerbotEvent(createAssistantMessage(), {
      type: 'tool_result',
      text: '{"orders":[1]}',
    })

    expect(message.logs[0].text).toBe('Dados recebidos')
    expect(message.logs[0].text).not.toContain('orders')
  })

  it('lets done replace a partial streamed response', () => {
    let message = reduceSellerbotEvent(createAssistantMessage(), { type: 'token', text: 'parcial' })
    message = reduceSellerbotEvent(message, { type: 'done', response: 'Resposta final em **Markdown**.' })

    expect(message.content).toBe('Resposta final em **Markdown**.')
    expect(message.loading).toBe(false)
  })

  it('keeps streamed content when the terminal event has no response', () => {
    let message = reduceSellerbotEvent(createAssistantMessage(), { type: 'token', text: 'Resposta completa' })
    message = reduceSellerbotEvent(message, { type: 'done', response: '' })

    expect(message.content).toBe('Resposta completa')
    expect(message.loading).toBe(false)
  })

  it('does not persist or render traceback on errors', () => {
    const message = reduceSellerbotEvent(createAssistantMessage(), {
      type: 'error',
      text: 'Traceback SECRET_KEY=abc',
      traceback: 'private stack',
    })

    expect(message.content).toBe('Não foi possível processar a mensagem. Tente novamente.')
    expect(JSON.stringify(message)).not.toContain('Traceback')
    expect(JSON.stringify(message)).not.toContain('SECRET_KEY')
  })

  it('sanitizes old logs without hiding legitimate final JSON content', () => {
    const message = normalizeHistoricalMessage({
      role: 'assistant',
      content: '{"legitimate": true}',
      logs: [
        { type: 'tool_call', text: '{"args":{"secret":"x"}}' },
        { type: 'thinking', text: 'Processando' },
      ],
    })

    expect(message.content).toBe('{"legitimate": true}')
    expect(message.logs).toEqual([{ type: 'thinking', text: 'Processando' }])
  })

  it('keeps drafts and images as bounded component data', () => {
    const message = reduceSellerbotEvent(createAssistantMessage(), {
      type: 'listing_draft_ready',
      draft: { draft_id: 12, title: 'Produto', pictures: ['secret'], price: 10 },
      instructions: 'Revise o rascunho',
    })
    const withImage = reduceSellerbotEvent(message, { type: 'image', url: 'https://img.test/a.jpg' })

    expect(withImage.pendingDraft.draft).toEqual({ draft_id: 12, title: 'Produto', price: 10 })
    expect(withImage.images).toEqual(['https://img.test/a.jpg'])
  })

  it('reduces approval, artifact validation and partial batch events safely', () => {
    let message = reduceSellerbotEvent(createAssistantMessage(), {
      type: 'approval_required',
      approval_id: 'approval-1',
      sku: 'SKU-1',
      status: 'pending',
      marketplace: 'tiny',
      action: 'upsert_tiny_product',
      payload: { secret: 'must-not-leak' },
    })
    message = reduceSellerbotEvent(message, {
      type: 'artifact_validation',
      artifact_id: 'artifact-1',
      valid: false,
      errors: [{ row: 2, message: 'Preço inválido' }],
      preview: { rows: [{ secret: 'private' }] },
    })
    message = reduceSellerbotEvent(message, {
      type: 'partial',
      run_id: 'run-1',
      status: 'partial',
      succeeded: 8,
      failed: 2,
      retryable: ['SKU-2'],
      skus: [{ sku: 'SKU-2', status: 'failed', selected: true }],
    })

    expect(message.pendingApproval).toEqual({
      approval_id: 'approval-1',
      sku: 'SKU-1',
      status: 'pending',
      marketplace: 'tiny',
      action: 'upsert_tiny_product',
    })
    expect(message.artifactValidation.errors).toEqual([{ row: 2, message: 'Preço inválido' }])
    expect(message.batchStatus).toEqual({
      run_id: 'run-1',
      status: 'partial',
      succeeded: 8,
      failed: 2,
      retryable: ['SKU-2'],
      skus: [{ sku: 'SKU-2', status: 'failed', selected: true }],
    })
    expect(JSON.stringify(message)).not.toContain('secret')
  })

  it('moves approval state without exposing an editable payload', () => {
    let message = reduceSellerbotEvent(createAssistantMessage(), {
      type: 'approval_required', approval_id: 'approval-1', status: 'pending',
    })
    message = reduceSellerbotEvent(message, {
      type: 'approval_state', approval_id: 'approval-1', status: 'expired', reason: 'ttl',
    })

    expect(message.pendingApproval.status).toBe('expired')
    expect(message.pendingApproval.reason).toBe('ttl')
  })

  it('keeps marketplace and action to distinguish Tiny and ML approvals', () => {
    const message = reduceSellerbotEvent(createAssistantMessage(), {
      type: 'approval_required',
      approval_id: 'tiny-1',
      sku: 'SKU-1',
      status: 'pending',
      marketplace: 'tiny',
      action: 'upsert_tiny_product',
    })

    expect(message.pendingApproval.marketplace).toBe('tiny')
    expect(message.pendingApproval.action).toBe('upsert_tiny_product')
  })
})

describe('sellerbot SSE parser', () => {
  it('emits a final data frame when the stream closes without a trailing newline', () => {
    const events = []
    const parser = createSseParser((event) => events.push(event))

    parser.push('data: {"type":"token","text":"Resposta parcial"}')
    parser.flush()

    expect(events).toEqual([{ type: 'token', text: 'Resposta parcial' }])
  })

  it('handles a JSON frame split across chunks and flushes its final event', () => {
    const events = []
    const parser = createSseParser((event) => events.push(event))

    parser.push('data: {"type":"done","response":"Resposta fi')
    parser.push('nal"}\n')
    parser.flush()

    expect(events).toEqual([{ type: 'done', response: 'Resposta final' }])
  })
})
