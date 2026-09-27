import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

const API_HOST = /^(?:[a-z0-9-]+\.)*(?:green-api\.com|greenapi\.com)$/i

function allowedOrigin(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || !API_HOST.test(url.hostname)) return null
    return url.origin
  } catch {
    return null
  }
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function greenApiProxy(): Plugin {
  return {
    name: 'green-api-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/green-proxy/')) {
          next()
          return
        }
        void forwardGreenApi(req, res).catch((error: unknown) => {
          if (res.writableEnded) return
          res.statusCode = 502
          res.end(error instanceof Error ? error.message : 'Proxy error')
        })
      })
    },
  }
}

async function forwardGreenApi(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const origin = allowedOrigin(req.headers['x-green-api-base'])
  if (!origin) {
    res.statusCode = 400
    res.end('Недопустимый хост GREEN-API')
    return
  }

  const targetPath = (req.url ?? '').replace(/^\/green-proxy/, '')
  const target = new URL(targetPath, `${origin}/`)
  if (target.origin !== origin || !/^\/(?:v3\/)?waInstance\d+\//.test(target.pathname)) {
    res.statusCode = 400
    res.end('Недопустимый путь запроса')
    return
  }

  const method = (req.method ?? 'GET').toUpperCase()
  const body = await readBody(req)
  const hasBody = body.length > 0 && method !== 'GET' && method !== 'HEAD'
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 75_000)
  res.on('close', () => controller.abort())

  try {
    const upstream = await fetch(target, {
      method,
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? body : undefined,
      signal: controller.signal,
    })
    if (res.writableEnded) return
    res.statusCode = upstream.status
    const contentType = upstream.headers.get('content-type')
    if (contentType) res.setHeader('Content-Type', contentType)
    res.end(Buffer.from(await upstream.arrayBuffer()))
  } catch (error) {
    if (res.writableEnded) return
    if (error instanceof Error && error.name === 'AbortError') {
      res.statusCode = 504
      res.end('Таймаут запроса к GREEN-API')
      return
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export default defineConfig({
  plugins: [greenApiProxy(), react()],
  server: {
    port: 5173,
  },
})
