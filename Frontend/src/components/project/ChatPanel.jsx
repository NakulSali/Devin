import React from 'react'
import { WriteAiMessage } from '../../utils/project/aiHelpers'

function ChatPanel({
    project,
    messages,
    message,
    setMessage,
    send,
    messageBox,
    user,
    inputFocused,
    setInputFocused,
    isSidePanelOpen,
    setIsSidePanelOpen,
    setIsModalOpen,
}) {
    return (
        <section style={{
            position: 'relative', display: 'flex', flexDirection: 'column',
            height: '100%', minWidth: 320, maxWidth: 380, width: 355,
            background: 'rgba(255,255,255,0.02)',
            borderRight: '1px solid rgba(139,92,246,0.2)',
            backdropFilter: 'blur(20px)', flexShrink: 0,
        }}>
            {/* Header */}
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0 16px', height: 52,
                background: 'rgba(139,92,246,0.06)',
                borderBottom: '1px solid rgba(139,92,246,0.15)',
                flexShrink: 0,
            }}>
                <button
                    onClick={() => setIsModalOpen(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                        border: 'none', borderRadius: 8, padding: '6px 12px',
                        color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        boxShadow: '0 0 15px rgba(139,92,246,0.35)', transition: 'all 0.2s'
                    }}
                >
                    <i className="ri-user-add-line" style={{ fontSize: 13 }} />
                    Add Collaborator
                </button>
                <button
                    onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                    style={{
                        width: 34, height: 34,
                        background: 'rgba(139,92,246,0.15)',
                        border: '1px solid rgba(139,92,246,0.3)',
                        borderRadius: 8, cursor: 'pointer', color: '#a78bfa',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, transition: 'all 0.2s'
                    }}
                >
                    <i className="ri-group-fill" />
                </button>
            </header>

            {/* Project name */}
            <div style={{
                padding: '8px 16px',
                borderBottom: '1px solid rgba(139,92,246,0.1)',
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa' }}>{project.name}</span>
            </div>

            {/* Messages + input */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div
                    ref={messageBox}
                    style={{
                        flex: 1, overflowY: 'auto', padding: '12px 12px 0',
                        display: 'flex', flexDirection: 'column', gap: 8,
                        scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.3) transparent'
                    }}
                >
                    {messages.length === 0 && (
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            padding: '40px 20px', opacity: 0.5
                        }}>
                            <i className="ri-chat-3-line" style={{ fontSize: 36, color: '#a78bfa', marginBottom: 12 }} />
                            <p style={{ fontSize: 13, color: 'rgba(167,139,250,0.6)', textAlign: 'center', margin: 0 }}>
                                Start chatting or mention <strong>@ai</strong> for intelligent assistance
                            </p>
                        </div>
                    )}

                    {messages.map((msg, index) => (
                        <div key={index} style={{
                            maxWidth: msg.sender._id === 'ai' ? '90%' : '80%',
                            marginLeft: msg.sender._id === user?._id?.toString() ? 'auto' : 0,
                            display: 'flex', flexDirection: 'column', gap: 3,
                            animation: 'fadeSlideIn 0.2s ease',
                        }}>
                            <small style={{
                                fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                                color: msg.sender._id === 'ai' ? '#a78bfa'
                                    : msg.sender._id === user?._id?.toString() ? '#06b6d4'
                                        : 'rgba(167,139,250,0.6)',
                                paddingLeft: 2
                            }}>
                                {msg.sender._id === 'ai' ? '✦ AI' : msg.sender.email}
                            </small>
                            <div style={{
                                padding: '8px 12px',
                                background: msg.sender._id === 'ai'
                                    ? 'rgba(139,92,246,0.1)'
                                    : msg.sender._id === user?._id?.toString()
                                        ? 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(6,182,212,0.3))'
                                        : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${msg.sender._id === 'ai' ? 'rgba(139,92,246,0.3)'
                                    : msg.sender._id === user?._id?.toString() ? 'rgba(139,92,246,0.4)'
                                        : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: msg.sender._id === user?._id?.toString() ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                fontSize: 13, color: '#e0d7ff', lineHeight: 1.5,
                            }}>
                                {msg.sender._id === 'ai'
                                    ? WriteAiMessage(msg.message)
                                    : <p style={{ margin: 0 }}>{msg.message}</p>
                                }
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{
                    padding: '10px 12px',
                    borderTop: '1px solid rgba(139,92,246,0.15)',
                    display: 'flex', gap: 8, alignItems: 'center',
                    background: 'rgba(139,92,246,0.04)', flexShrink: 0,
                }}>
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center',
                        background: inputFocused ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${inputFocused ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.2)'}`,
                        borderRadius: 10, padding: '0 12px', transition: 'all 0.2s',
                        boxShadow: inputFocused ? '0 0 0 2px rgba(139,92,246,0.12)' : 'none'
                    }}>
                        <input
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            onFocus={() => setInputFocused(true)}
                            onBlur={() => setInputFocused(false)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                            placeholder="Message or @ai ..."
                            style={{
                                flex: 1, padding: '10px 0',
                                background: 'transparent', border: 'none',
                                outline: 'none', color: '#e0d7ff', fontSize: 13,
                            }}
                        />
                    </div>
                    <button
                        onClick={send}
                        style={{
                            width: 38, height: 38, borderRadius: 10,
                            background: message.trim() ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)' : 'rgba(139,92,246,0.2)',
                            border: 'none', cursor: 'pointer', color: '#fff', fontSize: 16,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                            boxShadow: message.trim() ? '0 0 15px rgba(139,92,246,0.4)' : 'none',
                            flexShrink: 0,
                        }}
                    >
                        <i className="ri-send-plane-fill" />
                    </button>
                </div>
            </div>

            {/* Collaborators slide-over */}
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(10,10,20,0.97)', backdropFilter: 'blur(20px)',
                borderRight: '1px solid rgba(139,92,246,0.2)',
                transform: isSidePanelOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
                zIndex: 10, display: 'flex', flexDirection: 'column',
            }}>
                <header style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0 16px', height: 52,
                    borderBottom: '1px solid rgba(139,92,246,0.15)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <i className="ri-group-fill" style={{ color: '#a78bfa', fontSize: 16 }} />
                        <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e0d7ff' }}>Collaborators</h1>
                        <span style={{
                            background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.3)',
                            borderRadius: 50, padding: '1px 8px', fontSize: 11, color: '#a78bfa', fontWeight: 600
                        }}>{project.users?.length || 0}</span>
                    </div>
                    <button onClick={() => setIsSidePanelOpen(false)} style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer', color: '#a78bfa', fontSize: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <i className="ri-close-line" />
                    </button>
                </header>
                <div style={{ padding: 12, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {project.users && project.users.map((u, idx) => (
                        <div key={idx} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px',
                            background: 'rgba(139,92,246,0.06)',
                            border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12,
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                background: `linear-gradient(135deg, hsl(${(idx * 67) % 360},70%,55%), hsl(${(idx * 67 + 120) % 360},70%,55%))`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <i className="ri-user-fill" style={{ fontSize: 14, color: '#fff' }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e0d7ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {u.email?.split('@')[0] || 'User'}
                                </p>
                                <p style={{ margin: 0, fontSize: 11, color: 'rgba(167,139,250,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {u.email || 'No email'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default ChatPanel
