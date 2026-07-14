'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

/**
 * Subscribe to APTix realtime service (port 3031 via Caddy XTransformPort).
 * Returns connection status; invokes `onChange` whenever a ticket changes.
 */
export function useRealtimeTicketChanges(onChange?: (payload: unknown) => void) {
  const [connected, setConnected] = useState(false)
  const onChangeRef = useRef(onChange)

  // Keep the latest callback in a ref without touching it during render.
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const socket: Socket = io('/?XTransformPort=3031', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('ticket:changed', (payload: unknown) => onChangeRef.current?.(payload))

    return () => {
      socket.disconnect()
    }
  }, [])

  return { connected }
}
