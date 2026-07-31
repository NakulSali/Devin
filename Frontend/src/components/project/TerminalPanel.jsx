import React from 'react'

/**
 * TerminalPanel — collapsible interactive terminal with:
 *  - Scrollable log output (color-coded by type)
 *  - Interactive input bar backed by jsh shell
 *  - Shell status badge
 */
function TerminalPanel({
    isOpen,
    onClose,
    terminalLog,
    setTerminalLog,
    terminalInput,
    setTerminalInput,
    terminalRef,
    terminalInputRef,
    shellWriterRef,
    sendTerminalCommand,
}) {
    return (
        <div style={{
            flexShrink: 0,
            borderTop: '1px solid rgba(139,92,246,0.2)',
            background: 'rgba(5,5,12,0.95)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            transition: 'height 0.28s cubic-bezier(0.4,0,0.2,1)',
            height: isOpen ? 280 : 0,
        }}>
            {/* Terminal header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 14px',
                borderBottom: '1px solid rgba(139,92,246,0.12)',
                background: 'rgba(139,92,246,0.05)',
                flexShrink: 0,
            }}>
                {/* Traffic lights */}
                <div style={{ display: 'flex', gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                </div>

                <span style={{ fontSize: 11, color: 'rgba(167,139,250,0.5)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    <i className="ri-terminal-box-line" style={{ marginRight: 5 }} />
                    Terminal
                </span>

                {/* Shell status badge */}
                <span style={{
                    fontSize: 10, padding: '1px 7px', borderRadius: 10,
                    background: shellWriterRef.current ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.12)',
                    border: `1px solid ${shellWriterRef.current ? 'rgba(16,185,129,0.3)' : 'rgba(139,92,246,0.2)'}`,
                    color: shellWriterRef.current ? '#10b981' : 'rgba(167,139,250,0.5)',
                    fontWeight: 600,
                }}>
                    {shellWriterRef.current ? '● jsh' : '○ idle'}
                </span>

                {/* Clear button */}
                <button
                    onClick={() => { setTerminalLog([{ type: 'system', text: 'Terminal cleared.' }]); setTerminalInput('') }}
                    title="Clear"
                    style={{
                        marginLeft: 'auto', border: 'none', background: 'transparent',
                        color: 'rgba(167,139,250,0.3)', fontSize: 12, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px',
                        borderRadius: 4, transition: 'all 0.13s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#a78bfa'; e.currentTarget.style.background = 'rgba(139,92,246,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(167,139,250,0.3)'; e.currentTarget.style.background = 'transparent' }}
                >
                    <i className="ri-delete-bin-6-line" /> Clear
                </button>

                {/* Close button */}
                <button
                    onClick={onClose}
                    title="Close terminal"
                    style={{
                        border: 'none', background: 'transparent',
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

            {/* Log output */}
            <div
                ref={terminalRef}
                onClick={() => terminalInputRef.current?.focus()}
                style={{
                    flex: 1, overflowY: 'auto',
                    padding: '8px 14px 4px',
                    fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                    fontSize: 12, lineHeight: 1.65,
                    scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.2) transparent',
                    cursor: 'text',
                }}
            >
                {terminalLog.map((entry, i) => {
                    const colors = {
                        system: 'rgba(167,139,250,0.45)',
                        info: '#c9d1d9',
                        success: '#10b981',
                        error: '#ef4444',
                        warning: '#f59e0b',
                        input: '#a78bfa',
                    }
                    const icons = { system: '●', info: ' ', success: '✓', error: '✗', warning: '⚠', input: '$' }
                    return (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', minHeight: '1.65em' }}>
                            <span style={{ color: colors[entry.type] || '#a78bfa', flexShrink: 0, userSelect: 'none' }}>
                                {icons[entry.type] || ' '}
                            </span>
                            <span style={{
                                color: colors[entry.type] || '#c9d1d9',
                                wordBreak: 'break-all', whiteSpace: 'pre-wrap',
                                fontWeight: entry.type === 'input' ? 600 : 400,
                            }}>
                                {entry.text}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Interactive input row */}
            <div style={{
                display: 'flex', alignItems: 'center',
                borderTop: '1px solid rgba(139,92,246,0.12)',
                background: 'rgba(0,0,0,0.4)',
                flexShrink: 0, padding: '0 0 0 14px',
            }}>
                <span style={{
                    color: '#10b981', fontSize: 13, fontFamily: "'Fira Code', monospace",
                    fontWeight: 700, flexShrink: 0, paddingRight: 6, userSelect: 'none',
                }}>❯</span>
                <input
                    ref={terminalInputRef}
                    value={terminalInput}
                    onChange={e => setTerminalInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            sendTerminalCommand(terminalInput)
                        }
                    }}
                    placeholder="type a command and press Enter..."
                    spellCheck={false}
                    autoComplete="off"
                    style={{
                        flex: 1, padding: '8px 4px',
                        background: 'transparent', border: 'none',
                        outline: 'none', color: '#a78bfa',
                        fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                        fontSize: 12, caretColor: '#10b981',
                    }}
                />
                <button
                    onClick={() => sendTerminalCommand(terminalInput)}
                    disabled={!terminalInput.trim()}
                    style={{
                        padding: '8px 14px', border: 'none',
                        background: terminalInput.trim() ? 'rgba(16,185,129,0.15)' : 'transparent',
                        color: terminalInput.trim() ? '#10b981' : 'rgba(167,139,250,0.2)',
                        cursor: terminalInput.trim() ? 'pointer' : 'default',
                        fontSize: 13, transition: 'all 0.15s',
                        borderLeft: '1px solid rgba(139,92,246,0.1)',
                    }}
                >
                    <i className="ri-corner-down-left-line" />
                </button>
            </div>
        </div>
    )
}

export default TerminalPanel
