import React, { useContext, useEffect, useState } from 'react'
import { UserContext } from '../context/user.context'
import { useNavigate } from 'react-router-dom'
import axios from '../config/axios'


const UserAuth = ({ children }) => {

    const { user, setUser } = useContext(UserContext)
    const [ loading, setLoading ] = useState(!user) // if user already exists, skip loading
    const navigate = useNavigate()

    useEffect(() => {
        // User already in context (navigated from another page in the same session)
        if (user) {
            setLoading(false)
            return
        }

        const token = localStorage.getItem('token')

        // No token at all → go to login
        if (!token) {
            navigate('/login')
            return
        }

        // Token exists but no user in context (e.g. page refresh)
        // → verify token by fetching profile
        axios.get('/users/profile')
            .then((res) => {
                setUser(res.data.user)
                setLoading(false)
            })
            .catch(() => {
                localStorage.removeItem('token')
                navigate('/login')
            })

    }, [user])


    if (loading) {
        return (
            <div style={{
                height: '100vh', width: '100vw',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0a1f 100%)',
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                flexDirection: 'column', gap: 16
            }}>
                <div style={{
                    width: 40, height: 40,
                    border: '3px solid rgba(139,92,246,0.2)',
                    borderTopColor: '#8b5cf6',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                }} />
                <p style={{ color: 'rgba(167,139,250,0.5)', fontSize: 14, margin: 0 }}>Verifying session...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    return <>{children}</>
}

export { UserAuth }