import { io } from 'socket.io-client'
import { useDroneStore } from './store'

const URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:9013'

let socket

export function startSocket() {
  if (socket) return socket
  socket = io(URL, { transports: ['polling'] }) // server is configured for polling
  const upsert = useDroneStore.getState().upsertFromFeatureCollection

  socket.on('connect', () => {
    // eslint-disable-next-line no-console
    console.log('[socket] connected', socket.id)
  })

  socket.on('message', (data) => {
    try {
      const fc = typeof data === 'string' ? JSON.parse(data) : data
      upsert(fc)
    } catch (e) {
      console.error('Failed to process incoming data', e)
    }
  })

  socket.on('disconnect', () => {
    // eslint-disable-next-line no-console
    console.log('[socket] disconnected')
  })

  return socket
}