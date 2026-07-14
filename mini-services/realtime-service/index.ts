import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()

const io = new Server(httpServer, {
  // Path MUST be "/" so Caddy forwards based on XTransformPort query.
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// --- Internal broadcast endpoint ---
// The Next.js API routes call this to fan-out a ticket change to all
// connected dashboard clients. Only reachable from localhost.
// IMPORTANT: Socket.IO also listens on this httpServer, so we must ONLY
// respond to our own /internal/broadcast path and ignore everything else
// (Socket.IO will handle its own handshake/polling requests).
httpServer.on('request', (req, res) => {
  if (req.method === 'POST' && req.url === '/internal/broadcast') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        const payload = JSON.parse(body)
        io.emit('ticket:changed', payload)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, listeners: io.engine.clientsCount }))
      } catch {
        if (!res.headersSent) { res.writeHead(400) }
        res.end('bad request')
      }
    })
    return
  }
  // Do NOT respond — let Socket.IO handle its own requests.
  // If somehow neither handler claims it, the request will time out on the client,
  // but that only happens for truly unknown paths which we don't issue.
})

io.on('connection', (socket) => {
  console.log(`[realtime] client connected (${socket.id}) — total: ${io.engine.clientsCount}`)
  socket.on('disconnect', () => {
    console.log(`[realtime] client disconnected — total: ${io.engine.clientsCount}`)
  })
})

const PORT = 3031
httpServer.listen(PORT, '127.0.0.1', () => {
  console.log(`[APTix] Realtime service listening on 127.0.0.1:${PORT}`)
})

process.on('SIGTERM', () => httpServer.close(() => process.exit(0)))
process.on('SIGINT', () => httpServer.close(() => process.exit(0)))
