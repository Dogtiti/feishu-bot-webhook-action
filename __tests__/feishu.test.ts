import { EventEmitter } from 'events'
import * as https from 'https'
import { sign_with_timestamp, PostToFeishu } from '../src/feishu'

jest.mock('https')

function transport(status = 200, parts = ['{"code":0}'], hang = false): any {
  const req = new EventEmitter() as any
  req.write = jest.fn()
  req.setTimeout = jest.fn()
  req.destroy = jest.fn((error: Error) => req.emit('error', error))
  req.end = jest.fn()
  jest.mocked(https.request).mockImplementation(((
    _options: unknown,
    callback: (res: any) => void
  ) => {
    req.end.mockImplementation(() => {
      if (hang) return
      const res = new EventEmitter() as any
      res.statusCode = status
      callback(res)
      for (const part of parts) res.emit('data', Buffer.from(part))
      res.emit('end')
    })
    return req
  }) as typeof https.request)
  return req
}

describe('Feishu delivery acknowledgement', () => {
  it('preserves webhook signing', () => {
    expect(sign_with_timestamp(1716283459, 'dGhpcyBpcyBhIGtleQ==')).toBe(
      '8EyY+xxfJvzWjZQpdc2mgvQFaG7lF5nbxl7RITyMkJU='
    )
  })
  it('accepts a chunked success response only after the complete body', async () => {
    transport(200, ['{"co', 'de":0,"msg":"ok"}'])
    await expect(PostToFeishu('test-only', '{}')).resolves.toBe(200)
  })
  it('supports the legacy success envelope', async () => {
    transport(200, ['{"StatusCode":0,"StatusMessage":"success"}'])
    await expect(PostToFeishu('test-only', '{}')).resolves.toBe(200)
  })
  it('rejects the actual 11246 card error even with HTTP 200', async () => {
    transport(200, [
      '{"code":11246,"msg":"ErrCode: 200410; ErrMsg: action components are not allowed in the column; "}'
    ])
    await expect(PostToFeishu('test-only', '{}')).rejects.toThrow('11246')
  })
  it.each([400, 429, 500])(
    'rejects HTTP %s despite a success-shaped body',
    async status => {
      transport(status)
      await expect(PostToFeishu('test-only', '{}')).rejects.toThrow(
        `(${status})`
      )
    }
  )
  it.each(['{}', 'null', '[]', '{"code":"0"}', '{"code":19021}', 'not JSON'])(
    'rejects invalid or failed acknowledgement %s',
    async body => {
      transport(200, [body])
      await expect(PostToFeishu('test-only', '{}')).rejects.toThrow()
    }
  )
  it('fails on timeout without retrying a potentially delivered message', async () => {
    const req = transport(200, [], true)
    req.setTimeout.mockImplementation((_ms: number, callback: () => void) => {
      queueMicrotask(callback)
    })
    req.end = jest.fn()
    await expect(PostToFeishu('test-only', '{}')).rejects.toThrow('timed out')
    expect(req.setTimeout).toHaveBeenCalledWith(15000, expect.any(Function))
    expect(https.request).toHaveBeenCalledTimes(1)
  })
})
