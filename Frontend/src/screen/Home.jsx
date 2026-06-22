import React, { useContext, useState, useEffect } from 'react'
import { UserContext } from '../context/user.context'
import axios from "../config/axios"
import { useNavigate } from 'react-router-dom'

const Home = () => {

    const { user } = useContext(UserContext)
    const [ isModalOpen, setIsModalOpen ] = useState(false)
    const [ projectName, setProjectName ] = useState(null)
    const [ project, setProject ] = useState([])
    const [ hoveredProject, setHoveredProject ] = useState(null)
    const [ modalInputFocused, setModalInputFocused ] = useState(false)

    const navigate = useNavigate()

    function createProject(e) {
        e.preventDefault()
        console.log({ projectName })

        axios.post('/projects/create', {
            name: projectName,
        })
            .then((res) => {
                console.log(res)
                setIsModalOpen(false)
                setProjectName('')
                axios.get('/projects/all').then((res) => {
                    setProject(res.data.projects)
                }).catch(err => {
                    console.log(err)
                })
            })
            .catch((error) => {
                console.log(error)
            })
    }

    useEffect(() => {
        axios.get('/projects/all').then((res) => {
            setProject(res.data.projects)
        }).catch(err => {
            console.log(err)
        })
    }, [])

    const colors = [
        { from: '#8b5cf6', to: '#06b6d4', glow: 'rgba(139,92,246,0.35)' },
        { from: '#10b981', to: '#06b6d4', glow: 'rgba(16,185,129,0.35)' },
        { from: '#f59e0b', to: '#ef4444', glow: 'rgba(245,158,11,0.35)' },
        { from: '#ec4899', to: '#8b5cf6', glow: 'rgba(236,72,153,0.35)' },
        { from: '#06b6d4', to: '#3b82f6', glow: 'rgba(6,182,212,0.35)' },
    ]

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0a1f 40%, #0a0f1f 100%)',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            color: '#e2e8f0',
        }}>
            {/* Navbar */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 32px',
                height: 64,
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(139,92,246,0.15)',
                position: 'sticky', top: 0, zIndex: 100,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(139,92,246,0.4)'
                    }}>
                        <i className="ri-code-s-slash-line" style={{ color: '#fff', fontSize: 18 }} />
                    </div>
                    <span style={{
                        fontWeight: 800, fontSize: 18, letterSpacing: '-0.3px',
                        background: 'linear-gradient(135deg, #e0d7ff, #a78bfa)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>SOEZ</span>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(139,92,246,0.1)',
                    border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: 50, padding: '6px 14px'
                }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <i className="ri-user-fill" style={{ fontSize: 13, color: '#fff' }} />
                    </div>
                    <span style={{ fontSize: 13, color: '#a78bfa', fontWeight: 500 }}>
                        {user?.email?.split('@')[0] || 'User'}
                    </span>
                </div>
            </header>

            {/* Hero Section */}
            <div style={{ padding: '48px 32px 32px' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ marginBottom: 12 }}>
                        <span style={{
                            display: 'inline-block', padding: '4px 12px', borderRadius: 50,
                            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                            color: '#a78bfa', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em',
                            textTransform: 'uppercase'
                        }}>
                            <i className="ri-flashlight-line" style={{ marginRight: 4 }} />
                            AI-Powered Workspace
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900,
                        letterSpacing: '-1px', lineHeight: 1.1, margin: '0 0 12px',
                        background: 'linear-gradient(135deg, #f0e8ff 0%, #a78bfa 50%, #06b6d4 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>Your Projects</h1>
                    <p style={{ color: 'rgba(167,139,250,0.6)', fontSize: 15, marginBottom: 0 }}>
                        Build, collaborate, and ship with AI — all in one place
                    </p>
                </div>
            </div>

            {/* Projects Grid */}
            <main style={{ padding: '0 32px 48px' }}>
                <div style={{
                    maxWidth: 1200, margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: 20,
                }}>
                    {/* New Project Card */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{
                            background: 'rgba(139,92,246,0.06)',
                            border: '2px dashed rgba(139,92,246,0.35)',
                            borderRadius: 20,
                            padding: '32px 24px',
                            cursor: 'pointer',
                            transition: 'all 0.25s',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: 12, minHeight: 160,
                            color: 'inherit',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(139,92,246,0.12)'
                            e.currentTarget.style.borderColor = 'rgba(139,92,246,0.6)'
                            e.currentTarget.style.boxShadow = '0 0 30px rgba(139,92,246,0.15)'
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(139,92,246,0.06)'
                            e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)'
                            e.currentTarget.style.boxShadow = 'none'
                        }}
                    >
                        <div style={{
                            width: 52, height: 52, borderRadius: 14,
                            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(139,92,246,0.4)'
                        }}>
                            <i className="ri-add-line" style={{ fontSize: 24, color: '#fff' }} />
                        </div>
                        <div>
                            <p style={{ fontWeight: 700, fontSize: 15, color: '#a78bfa', margin: '0 0 4px' }}>New Project</p>
                            <p style={{ fontSize: 12, color: 'rgba(167,139,250,0.45)', margin: 0 }}>Start something awesome</p>
                        </div>
                    </button>

                    {/* Project Cards */}
                    {project.map((proj, idx) => {
                        const palette = colors[idx % colors.length]
                        return (
                            <div
                                key={proj._id}
                                onClick={() => navigate('/project', { state: { project: proj } })}
                                onMouseEnter={() => setHoveredProject(proj._id)}
                                onMouseLeave={() => setHoveredProject(null)}
                                style={{
                                    background: hoveredProject === proj._id
                                        ? 'rgba(255,255,255,0.07)'
                                        : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${hoveredProject === proj._id ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: 20,
                                    padding: '28px 24px',
                                    cursor: 'pointer',
                                    transition: 'all 0.25s',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    minHeight: 160,
                                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                    boxShadow: hoveredProject === proj._id ? `0 0 30px ${palette.glow}` : 'none',
                                    backdropFilter: 'blur(10px)',
                                    transform: hoveredProject === proj._id ? 'translateY(-3px)' : 'none'
                                }}
                            >
                                {/* Gradient accent */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                                    background: `linear-gradient(90deg, ${palette.from}, ${palette.to})`,
                                    borderRadius: '20px 20px 0 0',
                                    opacity: hoveredProject === proj._id ? 1 : 0.4,
                                    transition: 'opacity 0.25s'
                                }} />
                                <div>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12,
                                        background: `linear-gradient(135deg, ${palette.from}33, ${palette.to}33)`,
                                        border: `1px solid ${palette.from}44`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginBottom: 16
                                    }}>
                                        <i className="ri-folder-3-line" style={{ fontSize: 20, color: palette.from }} />
                                    </div>
                                    <h2 style={{
                                        fontWeight: 700, fontSize: 16, margin: '0 0 6px',
                                        color: '#f0e8ff', letterSpacing: '-0.2px'
                                    }}>{proj.name}</h2>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 50, padding: '4px 10px'
                                    }}>
                                        <i className="ri-user-line" style={{ fontSize: 12, color: '#a78bfa' }} />
                                        <span style={{ fontSize: 12, color: 'rgba(167,139,250,0.7)', fontWeight: 500 }}>
                                            {proj.users.length} {proj.users.length === 1 ? 'member' : 'members'}
                                        </span>
                                    </div>
                                    <i className="ri-arrow-right-line" style={{
                                        fontSize: 16, color: 'rgba(167,139,250,0.4)',
                                        transition: 'all 0.2s',
                                        transform: hoveredProject === proj._id ? 'translateX(3px)' : 'none',
                                        color: hoveredProject === proj._id ? '#a78bfa' : 'rgba(167,139,250,0.4)',
                                    }} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(15,10,31,0.98), rgba(10,15,31,0.98))',
                        border: '1px solid rgba(139,92,246,0.3)',
                        borderRadius: 24,
                        padding: '40px 36px',
                        width: '100%', maxWidth: 420,
                        boxShadow: '0 0 80px rgba(139,92,246,0.2), 0 30px 60px rgba(0,0,0,0.6)',
                        animation: 'slideUp 0.25s ease',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                            <div>
                                <h2 style={{
                                    margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px',
                                    background: 'linear-gradient(135deg, #e0d7ff, #a78bfa)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                                }}>New Project</h2>
                                <p style={{ margin: '4px 0 0', color: 'rgba(167,139,250,0.5)', fontSize: 13 }}>Give your project a name to get started</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 10, width: 36, height: 36,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: '#a78bfa', fontSize: 18, transition: 'all 0.2s'
                            }}>
                                <i className="ri-close-line" />
                            </button>
                        </div>
                        <form onSubmit={createProject}>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{
                                    display: 'block', color: 'rgba(167,139,250,0.7)', fontSize: 12,
                                    fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10
                                }}>Project Name</label>
                                <div style={{ position: 'relative' }}>
                                    <i className="ri-folder-add-line" style={{
                                        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                                        color: modalInputFocused ? '#a78bfa' : 'rgba(167,139,250,0.4)', fontSize: 16
                                    }} />
                                    <input
                                        onChange={(e) => setProjectName(e.target.value)}
                                        value={projectName || ''}
                                        onFocus={() => setModalInputFocused(true)}
                                        onBlur={() => setModalInputFocused(false)}
                                        type="text"
                                        placeholder="e.g. My Awesome App"
                                        required
                                        style={{
                                            width: '100%', padding: '13px 14px 13px 42px',
                                            background: modalInputFocused ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.04)',
                                            border: `1px solid ${modalInputFocused ? 'rgba(139,92,246,0.6)' : 'rgba(139,92,246,0.2)'}`,
                                            borderRadius: 12, color: '#e0d7ff', fontSize: 14,
                                            outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box',
                                            boxShadow: modalInputFocused ? '0 0 0 3px rgba(139,92,246,0.12)' : 'none'
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{
                                    flex: 1, padding: '13px',
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 12, color: '#a78bfa', fontSize: 14, fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}>Cancel</button>
                                <button type="submit" style={{
                                    flex: 1, padding: '13px',
                                    background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                                    border: 'none', borderRadius: 12, color: '#fff',
                                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                    boxShadow: '0 0 20px rgba(139,92,246,0.35)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                }}>
                                    <i className="ri-rocket-line" />
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
                input::placeholder { color: rgba(167,139,250,0.3) !important; }
            `}</style>
        </div>
    )
}

export default Home