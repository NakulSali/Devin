import React from 'react'

function CollaboratorModal({ users, selectedUserId, onUserClick, onAdd, onClose }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(15,10,31,0.99), rgba(10,15,31,0.99))',
                border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: 24, padding: '32px 28px',
                width: '100%', maxWidth: 420,
                boxShadow: '0 0 80px rgba(139,92,246,0.2), 0 30px 60px rgba(0,0,0,0.6)',
                display: 'flex', flexDirection: 'column',
                animation: 'fadeSlideIn 0.2s ease',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <h2 style={{
                            margin: 0, fontSize: 20, fontWeight: 800,
                            background: 'linear-gradient(135deg, #e0d7ff, #a78bfa)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>Add Collaborators</h2>
                        <p style={{ margin: '4px 0 0', color: 'rgba(167,139,250,0.5)', fontSize: 13 }}>Select team members to invite</p>
                    </div>
                    <button onClick={onClose} style={{
                        width: 34, height: 34, borderRadius: 9,
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer', color: '#a78bfa', fontSize: 18,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <i className="ri-close-line" />
                    </button>
                </div>

                <div style={{
                    maxHeight: 300, overflowY: 'auto',
                    marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 6,
                    paddingRight: 4,
                    scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.3) transparent'
                }}>
                    {users.map((u, idx) => {
                        const isSelected = selectedUserId.has(u._id)
                        return (
                            <div
                                key={u._id || idx}
                                onClick={() => onUserClick(u._id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                                    background: isSelected ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${isSelected ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                    transition: 'all 0.15s',
                                    boxShadow: isSelected ? '0 0 15px rgba(139,92,246,0.15)' : 'none',
                                }}
                            >
                                <div style={{
                                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                                    background: `linear-gradient(135deg, hsl(${(idx * 67) % 360},70%,55%), hsl(${(idx * 67 + 120) % 360},70%,55%))`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <i className="ri-user-fill" style={{ fontSize: 16, color: '#fff' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e0d7ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {u.email?.split('@')[0] || 'User'}
                                    </p>
                                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(167,139,250,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {u.email || 'No email'}
                                    </p>
                                </div>
                                <div style={{
                                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                                    background: isSelected ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)' : 'rgba(255,255,255,0.08)',
                                    border: `1px solid ${isSelected ? 'transparent' : 'rgba(255,255,255,0.15)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.15s',
                                    boxShadow: isSelected ? '0 0 10px rgba(139,92,246,0.4)' : 'none',
                                }}>
                                    {isSelected && <i className="ri-check-line" style={{ fontSize: 12, color: '#fff' }} />}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <button
                    onClick={onAdd}
                    style={{
                        width: '100%', padding: '14px',
                        background: selectedUserId.size > 0 ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)' : 'rgba(139,92,246,0.2)',
                        border: 'none', borderRadius: 12, color: '#fff',
                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                        boxShadow: selectedUserId.size > 0 ? '0 0 25px rgba(139,92,246,0.4)' : 'none',
                        transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                >
                    <i className="ri-user-add-line" />
                    Add {selectedUserId.size > 0 ? `(${selectedUserId.size})` : ''} Collaborators
                </button>
            </div>
        </div>
    )
}

export default CollaboratorModal
