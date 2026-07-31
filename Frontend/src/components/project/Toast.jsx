import React from 'react'

export const TOAST_COLORS = {
    success: { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)', icon: 'ri-checkbox-circle-fill', color: '#10b981' },
    error:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',  icon: 'ri-error-warning-fill',   color: '#ef4444' },
    warning: { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)', icon: 'ri-alert-fill',           color: '#f59e0b' },
    info:    { bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.35)', icon: 'ri-information-fill',     color: '#a78bfa' },
}

function Toast({ toast, onDismiss }) {
    const cfg = TOAST_COLORS[toast.type] || TOAST_COLORS.info
    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            borderRadius: 12, padding: '10px 14px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            animation: 'slideInRight 0.25s ease',
            minWidth: 260, maxWidth: 340,
        }}>
            <i className={cfg.icon} style={{ fontSize: 16, color: cfg.color, flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                {toast.title && (
                    <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: '#e0d7ff' }}>{toast.title}</p>
                )}
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(167,139,250,0.85)', lineHeight: 1.4 }}>{toast.message}</p>
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                style={{
                    flexShrink: 0, width: 18, height: 18,
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: 'rgba(167,139,250,0.4)', fontSize: 14, padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                <i className="ri-close-line" />
            </button>
        </div>
    )
}

export default Toast
