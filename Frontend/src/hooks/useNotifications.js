import { useState, useRef, useCallback } from 'react'

/**
 * useNotifications — manages a queue of toast notifications (max 4 visible).
 * Each notification auto-dismisses after 4 seconds.
 */
export function useNotifications() {
    const [notifications, setNotifications] = useState([])
    const counter = useRef(0)

    const pushNotification = useCallback((message, type = 'info', title = '') => {
        const id = ++counter.current
        setNotifications(prev => [...prev.slice(-3), { id, message, type, title }])
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id))
        }, 4000)
    }, [])

    const dismissNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }, [])

    return { notifications, pushNotification, dismissNotification }
}
