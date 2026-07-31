import React, { useRef } from 'react'

/**
 * PreviewPanel — iframe preview for both:
 *  - Blob URL previews  (frontend-only HTML/CSS/JS — instant, no server)
 *  - Server URL previews (WebContainer Node/React apps)
 */
function PreviewPanel({ previewUrl, onClose, onRefresh }) {
    const isBlobUrl = previewUrl?.startsWith('blob:')
    const iframeRef = useRef(null)

    if (!previewUrl) return null

    const displayLabel = isBlobUrl
        ? 'blob: (frontend preview)'
        : previewUrl

    return (
        <div style={{
            flexShrink: 0,
            borderTop: '1px solid rgba(16,185,129,0.25)',
            background: 'rgba(5,5,12,0.95)',
            display: 'flex', flexDirection: 'column',
            animation: 'fadeSlideIn 0.3s ease',
            height: 420,
        }}>
            {/* ── Header ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 14px',
                borderBottom: '1px solid rgba(16,185,129,0.15)',
                background: 'rgba(16,185,129,0.05)',
                flexShrink: 0,
            }}>
                {/* Traffic lights */}
                <div style={{ display: 'flex', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                </div>

                <i className={isBlobUrl ? 'ri-file-code-line' : 'ri-global-line'}
                   style={{ fontSize: 12, color: '#10b981' }} />

                <span style={{ fontSize: 11, color: 'rgba(16,185,129,0.8)', fontWeight: 600,
                               letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {isBlobUrl ? 'Live Preview' : 'Preview'}
                </span>

                <code style={{
                    marginLeft: 4, fontSize: 11,
                    color: 'rgba(16,185,129,0.6)',
                    fontFamily: "'Fira Code', monospace",
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 4, padding: '1px 7px',
                    maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {displayLabel}
                </code>

                {/* Refresh button */}
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        title="Re-run and refresh preview"
                        style={{
                            marginLeft: 4, border: '1px solid rgba(16,185,129,0.25)',
                            background: 'rgba(16,185,129,0.08)',
                            color: 'rgba(16,185,129,0.7)', fontSize: 12, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '2px 8px', borderRadius: 5, transition: 'all 0.13s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.18)'; e.currentTarget.style.color = '#10b981' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.color = 'rgba(16,185,129,0.7)' }}
                    >
                        <i className="ri-refresh-line" />
                        <span style={{ fontSize: 11, fontWeight: 600 }}>Refresh</span>
                    </button>
                )}

                {/* Open in new tab — only for server URLs (blob: is ephemeral) */}
                {!isBlobUrl && (
                    <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open in new tab"
                        style={{
                            marginLeft: 2,
                            color: 'rgba(16,185,129,0.5)', fontSize: 13,
                            textDecoration: 'none', lineHeight: 1, transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#10b981' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(16,185,129,0.5)' }}
                    >
                        <i className="ri-external-link-line" />
                    </a>
                )}

                {/* Close */}
                <button
                    onClick={onClose}
                    title="Close preview"
                    style={{
                        marginLeft: 'auto', border: 'none', background: 'transparent',
                        color: 'rgba(167,139,250,0.3)', fontSize: 14, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', padding: '2px 4px',
                        borderRadius: 4, transition: 'all 0.13s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(167,139,250,0.3)'; e.currentTarget.style.background = 'transparent' }}
                >
                    <i className="ri-close-line" />
                </button>
            </div>

            {/* ── iframe ── */}
            <iframe
                ref={iframeRef}
                src={previewUrl}
                title="App Preview"
                {...(isBlobUrl
                    // blob: needs sandbox with scripts + same-origin + popups for full JS support
                    ? { sandbox: 'allow-scripts allow-same-origin allow-modals allow-forms allow-popups allow-top-navigation-by-user-activation' }
                    // WebContainer server URLs use cross-origin isolation
                    : { allow: 'cross-origin-isolated' }
                )}
                style={{ flex: 1, border: 'none', background: '#fff', width: '100%' }}
            />
        </div>
    )
}

export default PreviewPanel
