import React, { useState, useContext, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from '../config/axios'
import { UserContext } from '../context/user.context'

const Register = () => {
    const [ email, setEmail ] = useState('')
    const [ password, setPassword ] = useState('')
    const [ error, setError ] = useState('')
    const { setUser } = useContext(UserContext)
    const [ loading, setLoading ] = useState(false)
    const [ focused, setFocused ] = useState(null)
    const canvasRef = useRef(null)
    const navigate = useNavigate()

    function submitHandler(e) {
        e.preventDefault()
        setLoading(true)
        setError('')

        axios.post('/users/register', {
            email,
            password
        }).then((res) => {
            console.log(res.data)
            localStorage.setItem('token', res.data.token)
            setUser(res.data.user)
            setLoading(false)
            navigate('/')
        }).catch((err) => {
            setLoading(false)
            setError(err.response?.data?.message || 'Registration failed')
            console.log(err.response.data)
        })
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight

        const particles = Array.from({ length: 80 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            r: Math.random() * 1.5 + 0.5,
            alpha: Math.random() * 0.6 + 0.2,
        }))

        let animId
        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy
                if (p.x < 0) p.x = canvas.width
                if (p.x > canvas.width) p.x = 0
                if (p.y < 0) p.y = canvas.height
                if (p.y > canvas.height) p.y = 0
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
                ctx.fillStyle = `rgba(16,185,129,${p.alpha})`
                ctx.fill()
            })
            particles.forEach((p, i) => {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = p.x - particles[j].x, dy = p.y - particles[j].y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    if (dist < 100) {
                        ctx.beginPath()
                        ctx.strokeStyle = `rgba(16,185,129,${0.12 * (1 - dist / 100)})`
                        ctx.lineWidth = 0.5
                        ctx.moveTo(p.x, p.y)
                        ctx.lineTo(particles[j].x, particles[j].y)
                        ctx.stroke()
                    }
                }
            })
            animId = requestAnimationFrame(draw)
        }
        draw()
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
        window.addEventListener('resize', resize)
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
    }, [])

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0f0a 0%, #0a1a0f 40%, #0f1a0a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: "'Inter', 'Segoe UI', sans-serif"
        }}>
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

            <div style={{
                position: 'absolute', width: 400, height: 400, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
                top: '-10%', right: '-5%', filter: 'blur(40px)', zIndex: 0
            }} />
            <div style={{
                position: 'absolute', width: 300, height: 300, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
                bottom: '5%', left: '5%', filter: 'blur(40px)', zIndex: 0
            }} />

            <div style={{
                position: 'relative', zIndex: 1,
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 24,
                padding: '48px 40px',
                width: '100%',
                maxWidth: 440,
                boxShadow: '0 0 60px rgba(16,185,129,0.1), 0 25px 50px rgba(0,0,0,0.5)',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 64, height: 64, borderRadius: 16,
                        background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                        marginBottom: 16,
                        boxShadow: '0 0 30px rgba(16,185,129,0.5)',
                    }}>
                        <i className="ri-user-add-line" style={{ fontSize: 28, color: '#fff' }} />
                    </div>
                    <h1 style={{
                        fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px',
                        background: 'linear-gradient(135deg, #d1fae5 0%, #6ee7b7 50%, #06b6d4 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        margin: 0
                    }}>Create Account</h1>
                    <p style={{ color: 'rgba(110,231,183,0.6)', fontSize: 13, marginTop: 6 }}>Join and start building amazing things</p>
                </div>

                {error && (
                    <div style={{
                        marginBottom: 20, padding: '12px 16px',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.35)',
                        borderRadius: 10,
                        color: '#fca5a5', fontSize: 13,
                        display: 'flex', alignItems: 'center', gap: 8
                    }}>
                        <i className="ri-error-warning-line" style={{ flexShrink: 0 }} />
                        {error}
                    </div>
                )}

                <form onSubmit={submitHandler}>
                    <div style={{ marginBottom: 18 }}>
                        <label style={{ display: 'block', color: 'rgba(110,231,183,0.7)', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                            Email Address
                        </label>
                        <div style={{ position: 'relative' }}>
                            <i className="ri-mail-line" style={{
                                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                                color: focused === 'email' ? '#10b981' : 'rgba(110,231,183,0.4)',
                                fontSize: 16, transition: 'color 0.2s'
                            }} />
                            <input
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setFocused('email')}
                                onBlur={() => setFocused(null)}
                                type="email"
                                id="email"
                                placeholder="you@example.com"
                                style={{
                                    width: '100%', padding: '13px 14px 13px 42px',
                                    background: focused === 'email' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${focused === 'email' ? 'rgba(16,185,129,0.6)' : 'rgba(16,185,129,0.2)'}`,
                                    borderRadius: 12, color: '#d1fae5', fontSize: 14,
                                    outline: 'none', transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                    boxShadow: focused === 'email' ? '0 0 0 3px rgba(16,185,129,0.12)' : 'none'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: 28 }}>
                        <label style={{ display: 'block', color: 'rgba(110,231,183,0.7)', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <i className="ri-lock-line" style={{
                                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                                color: focused === 'password' ? '#10b981' : 'rgba(110,231,183,0.4)',
                                fontSize: 16, transition: 'color 0.2s'
                            }} />
                            <input
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setFocused('password')}
                                onBlur={() => setFocused(null)}
                                type="password"
                                id="password"
                                placeholder="••••••••"
                                style={{
                                    width: '100%', padding: '13px 14px 13px 42px',
                                    background: focused === 'password' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${focused === 'password' ? 'rgba(16,185,129,0.6)' : 'rgba(16,185,129,0.2)'}`,
                                    borderRadius: 12, color: '#d1fae5', fontSize: 14,
                                    outline: 'none', transition: 'all 0.2s',
                                    boxSizing: 'border-box',
                                    boxShadow: focused === 'password' ? '0 0 0 3px rgba(16,185,129,0.12)' : 'none'
                                }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '14px',
                            background: loading ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
                            border: 'none', borderRadius: 12, color: '#fff',
                            fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                            letterSpacing: '0.03em', transition: 'all 0.2s',
                            boxShadow: loading ? 'none' : '0 0 30px rgba(16,185,129,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}
                    >
                        {loading ? (
                            <>
                                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                Creating Account...
                            </>
                        ) : (
                            <>
                                <i className="ri-rocket-line" />
                                Register
                            </>
                        )}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: 24, color: 'rgba(110,231,183,0.5)', fontSize: 13 }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{
                        color: '#6ee7b7', textDecoration: 'none', fontWeight: 600,
                        borderBottom: '1px solid rgba(110,231,183,0.3)',
                        paddingBottom: 1, transition: 'color 0.2s'
                    }}>Login</Link>
                </p>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                input::placeholder { color: rgba(110,231,183,0.3); }
            `}</style>
        </div>
    )
}

export default Register