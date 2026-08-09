import socket from 'socket.io-client'

let socketInstance = null

export const initializeSocket = (projectId) => {
  // Disconnect existing socket before creating a new one  fix
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }

  socketInstance = socket('https://devin-qjj4.onrender.com', {
    auth: {
      token: localStorage.getItem('token')
    },
    query: { projectId }
  })

  // Debug logs — remove in production  new
  socketInstance.on('connect', () => {
    console.log('✅ Socket connected:', socketInstance.id)
  })

  socketInstance.on('connect_error', (err) => {
    console.log('❌ Socket error:', err.message)
  })

  return socketInstance // ← return instance  fix
}

export const getSocket = () => socketInstance // ← helper  new

export const receiveMessage = (eventName, cb) => {
  socketInstance.off(eventName) // Remove old listeners first to prevent duplicates
  socketInstance.on(eventName, cb)
}

export const sendMessage = (eventName, data) => {
  socketInstance.emit(eventName, data)
}