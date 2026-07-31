import React from 'react'
import FileTreeNode from './FileTreeNode'
import TerminalPanel from './TerminalPanel'
import PreviewPanel from './PreviewPanel'
import { getFileIcon, countLines } from '../../utils/project/treeHelpers'

/**
 * EditorPanel — right panel containing:
 *  - File tab bar with Terminal toggle + Run button
 *  - File explorer sidebar
 *  - Code editor (contentEditable)
 *  - Terminal panel (collapsible)
 *  - Preview panel (when server-ready)
 *  - Status bar
 */
function EditorPanel({
    project,
    fileTree,
    nestedTree,
    currentFile, setCurrentFile,
    openFiles, setOpenFiles,
    expandedFolders,
    toggleFolder,
    openFile,
    saveFileTree, setFileTree,
    isTerminalOpen, setIsTerminalOpen,
    isRunning,
    runMeta,
    runProject,
    terminalLog, setTerminalLog,
    terminalInput, setTerminalInput,
    terminalRef, terminalInputRef,
    shellWriterRef,
    sendTerminalCommand,
    previewUrl, setPreviewUrl,
}) {
    const currentFileContents = fileTree[currentFile]?.file?.contents || ''
    const currentFileLines    = countLines(currentFileContents)
    const currentFileExt      = currentFile ? (currentFile.split('.').pop() || '').toUpperCase() : ''

    function closeTab(e, filePath) {
        e.stopPropagation()
        setOpenFiles(prev => {
            const next = prev.filter(f => f !== filePath)
            if (currentFile === filePath) setCurrentFile(next[next.length - 1] || null)
            return next
        })
    }

    return (
        <section style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            height: '100%', overflow: 'hidden', background: 'rgba(0,0,0,0.3)', minWidth: 0,
        }}>
            {/* ── File tab bar ── */}
            <div style={{
                height: 42, display: 'flex', alignItems: 'stretch',
                borderBottom: '1px solid rgba(139,92,246,0.15)',
                background: 'rgba(5,5,15,0.7)', flexShrink: 0,
                overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none',
            }}>
                {openFiles.length === 0 && (
                    <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', color: 'rgba(167,139,250,0.3)', fontSize: 12, gap: 6 }}>
                        <i className="ri-file-code-line" /> No files open
                    </div>
                )}

                {openFiles.map(file => {
                    const isActive = currentFile === file
                    const { icon, color } = getFileIcon(file.split('/').pop())
                    return (
                        <div
                            key={file}
                            onClick={() => setCurrentFile(file)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '0 12px 0 10px', flexShrink: 0,
                                borderRight: '1px solid rgba(139,92,246,0.1)',
                                background: isActive ? 'rgba(139,92,246,0.14)' : 'transparent',
                                color: isActive ? '#e0d7ff' : 'rgba(167,139,250,0.5)',
                                fontSize: 12, fontWeight: isActive ? 600 : 400,
                                cursor: 'pointer', whiteSpace: 'nowrap',
                                borderBottom: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
                                boxSizing: 'border-box', transition: 'all 0.13s', alignSelf: 'stretch',
                            }}
                        >
                            <i className={icon} style={{ fontSize: 12, color, flexShrink: 0 }} />
                            <span>{file.split('/').pop()}</span>
                            <button
                                onClick={e => closeTab(e, file)}
                                style={{
                                    marginLeft: 3, width: 15, height: 15, borderRadius: 3,
                                    border: 'none', background: 'transparent', cursor: 'pointer',
                                    color: 'rgba(167,139,250,0.35)', fontSize: 11,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: 0, transition: 'all 0.13s', flexShrink: 0,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(167,139,250,0.35)'; e.currentTarget.style.background = 'transparent' }}
                            >
                                <i className="ri-close-line" />
                            </button>
                        </div>
                    )
                })}

                {/* Terminal toggle */}
                <button
                    onClick={() => setIsTerminalOpen(o => !o)}
                    title="Toggle Terminal"
                    style={{
                        marginLeft: 'auto', flexShrink: 0,
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '0 14px', height: '100%',
                        border: 'none', borderLeft: '1px solid rgba(139,92,246,0.1)',
                        background: isTerminalOpen ? 'rgba(139,92,246,0.14)' : 'transparent',
                        color: isTerminalOpen ? '#a78bfa' : 'rgba(167,139,250,0.4)',
                        fontSize: 12, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; e.currentTarget.style.color = '#a78bfa' }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = isTerminalOpen ? 'rgba(139,92,246,0.14)' : 'transparent'
                        e.currentTarget.style.color = isTerminalOpen ? '#a78bfa' : 'rgba(167,139,250,0.4)'
                    }}
                >
                    <i className="ri-terminal-box-line" style={{ fontSize: 14 }} />
                    Terminal
                    <i className={isTerminalOpen ? 'ri-arrow-down-s-line' : 'ri-arrow-up-s-line'} style={{ fontSize: 13, marginLeft: 2 }} />
                </button>

                {/* ▶ Run button */}
                {Object.keys(fileTree).length > 0 && (
                    <button
                        onClick={runProject}
                        disabled={isRunning}
                        title={runMeta?.startCommand
                            ? `Run: ${runMeta.startCommand.mainItem} ${runMeta.startCommand.commands.join(' ')}`
                            : 'Run project (auto-detect from package.json)'}
                        style={{
                            flexShrink: 0,
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '0 16px', height: '100%',
                            border: 'none', borderLeft: '1px solid rgba(16,185,129,0.2)',
                            background: isRunning
                                ? 'rgba(16,185,129,0.1)'
                                : 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(6,182,212,0.2))',
                            color: isRunning ? 'rgba(16,185,129,0.6)' : '#10b981',
                            fontSize: 12, fontWeight: 700,
                            cursor: isRunning ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s', letterSpacing: '0.03em',
                            boxShadow: isRunning ? 'none' : 'inset 0 0 20px rgba(16,185,129,0.08)',
                        }}
                    >
                        {isRunning
                            ? <><i className="ri-loader-4-line" style={{ fontSize: 13, animation: 'spin 1s linear infinite' }} /> Running...</>
                            : <><i className="ri-play-fill" style={{ fontSize: 14 }} /> Run</>
                        }
                    </button>
                )}
            </div>

            {/* ── Explorer + Code + Terminal ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

                {/* File Explorer */}
                <div style={{
                    width: 210, flexShrink: 0,
                    borderRight: '1px solid rgba(139,92,246,0.15)',
                    background: 'rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        padding: '8px 12px',
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
                        color: 'rgba(167,139,250,0.5)', textTransform: 'uppercase',
                        borderBottom: '1px solid rgba(139,92,246,0.1)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <i className="ri-folder-open-line" />
                        Explorer
                        {Object.keys(fileTree).length > 0 && (
                            <span style={{
                                marginLeft: 'auto', fontSize: 10,
                                background: 'rgba(139,92,246,0.15)',
                                border: '1px solid rgba(139,92,246,0.25)',
                                borderRadius: 10, padding: '1px 6px',
                                color: '#a78bfa', fontWeight: 600,
                            }}>{Object.keys(fileTree).length}</span>
                        )}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.2) transparent' }}>
                        {Object.keys(fileTree).length === 0 ? (
                            <div style={{ padding: '28px 12px', textAlign: 'center' }}>
                                <i className="ri-folder-line" style={{ fontSize: 28, color: 'rgba(167,139,250,0.2)', display: 'block', marginBottom: 8 }} />
                                <p style={{ fontSize: 11, color: 'rgba(167,139,250,0.3)', margin: 0 }}>No files yet</p>
                                <p style={{ fontSize: 10, color: 'rgba(167,139,250,0.2)', margin: '6px 0 0', lineHeight: 1.6 }}>
                                    Use <span style={{ color: 'rgba(139,92,246,0.7)', fontWeight: 700 }}>@ai</span> in chat to generate files
                                </p>
                            </div>
                        ) : (
                            <div style={{ paddingTop: 4, paddingBottom: 8 }}>
                                {Object.entries(nestedTree).map(([name, node]) => (
                                    <FileTreeNode
                                        key={name}
                                        name={name}
                                        node={node}
                                        depth={0}
                                        currentFile={currentFile}
                                        onFileClick={openFile}
                                        expandedFolders={expandedFolders}
                                        toggleFolder={toggleFolder}
                                        parentPath=""
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Code editor + terminal stack */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

                    {/* Code editor */}
                    <div style={{ flex: 1, overflow: 'auto', background: '#0d0d16', minHeight: 0 }}>
                        {fileTree[currentFile] ? (
                            <pre style={{
                                margin: 0,
                                fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
                                fontSize: 13, lineHeight: 1.75,
                            }}>
                                <code
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={e => {
                                        const updatedContent = e.target.innerText
                                        const ft = { ...fileTree, [currentFile]: { file: { contents: updatedContent } } }
                                        setFileTree(ft)
                                        saveFileTree(ft)
                                    }}
                                    style={{
                                        display: 'block', outline: 'none',
                                        padding: '20px 28px',
                                        color: '#c9d1d9', whiteSpace: 'pre-wrap',
                                        paddingBottom: '20rem', minHeight: '100%',
                                    }}
                                >
                                    {fileTree[currentFile].file.contents}
                                </code>
                            </pre>
                        ) : (
                            <div style={{
                                height: '100%', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                flexDirection: 'column', gap: 14
                            }}>
                                <div style={{
                                    width: 72, height: 72, borderRadius: 18,
                                    background: 'rgba(139,92,246,0.07)',
                                    border: '1px solid rgba(139,92,246,0.18)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <i className="ri-code-box-line" style={{ fontSize: 32, color: 'rgba(139,92,246,0.35)' }} />
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ color: 'rgba(167,139,250,0.4)', fontSize: 14, margin: '0 0 6px', fontWeight: 500 }}>
                                        Select a file to view
                                    </p>
                                    <p style={{ color: 'rgba(167,139,250,0.22)', fontSize: 12, margin: 0 }}>
                                        Pick a file from the explorer or use @ai to generate code
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Terminal panel */}
                    <TerminalPanel
                        isOpen={isTerminalOpen}
                        onClose={() => setIsTerminalOpen(false)}
                        terminalLog={terminalLog}
                        setTerminalLog={setTerminalLog}
                        terminalInput={terminalInput}
                        setTerminalInput={setTerminalInput}
                        terminalRef={terminalRef}
                        terminalInputRef={terminalInputRef}
                        shellWriterRef={shellWriterRef}
                        sendTerminalCommand={sendTerminalCommand}
                    />

                    {/* Preview panel */}
                    <PreviewPanel
                        previewUrl={previewUrl}
                        onClose={() => setPreviewUrl(null)}
                        onRefresh={runProject}
                    />
                </div>
            </div>

            {/* ── Status bar ── */}
            <div style={{
                flexShrink: 0, height: 24,
                display: 'flex', alignItems: 'center',
                borderTop: '1px solid rgba(139,92,246,0.12)',
                background: 'rgba(139,92,246,0.07)',
                fontSize: 11, color: 'rgba(167,139,250,0.5)',
                overflow: 'hidden',
            }}>
                <div style={{
                    padding: '0 12px', height: '100%',
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.15))',
                    borderRight: '1px solid rgba(139,92,246,0.18)', flexShrink: 0,
                }}>
                    <i className="ri-git-branch-line" style={{ fontSize: 11, color: '#a78bfa' }} />
                    <span style={{ color: '#a78bfa', fontWeight: 600 }}>{project.name}</span>
                </div>

                {currentFile && (
                    <div style={{
                        padding: '0 12px', height: '100%',
                        display: 'flex', alignItems: 'center', gap: 5,
                        borderRight: '1px solid rgba(139,92,246,0.1)', flexShrink: 0,
                    }}>
                        <i className={getFileIcon(currentFile.split('/').pop()).icon} style={{ fontSize: 11, color: getFileIcon(currentFile.split('/').pop()).color }} />
                        <span style={{ color: 'rgba(224,215,255,0.7)' }}>{currentFile}</span>
                    </div>
                )}

                {currentFile && (
                    <div style={{
                        padding: '0 10px', height: '100%',
                        display: 'flex', alignItems: 'center', gap: 4,
                        borderRight: '1px solid rgba(139,92,246,0.1)', flexShrink: 0,
                    }}>
                        <i className="ri-list-ordered" style={{ fontSize: 10 }} />
                        <span>{currentFileLines} lines</span>
                    </div>
                )}

                {currentFileExt && (
                    <div style={{
                        padding: '0 10px', height: '100%',
                        display: 'flex', alignItems: 'center',
                        borderRight: '1px solid rgba(139,92,246,0.1)', flexShrink: 0,
                    }}>
                        <span style={{ color: '#a78bfa', fontWeight: 700 }}>{currentFileExt}</span>
                    </div>
                )}

                <div style={{
                    marginLeft: 'auto', padding: '0 12px', height: '100%',
                    display: 'flex', alignItems: 'center', gap: 5,
                    borderLeft: '1px solid rgba(139,92,246,0.1)', flexShrink: 0,
                }}>
                    <i className="ri-file-copy-line" style={{ fontSize: 11 }} />
                    <span>{Object.keys(fileTree).length} file{Object.keys(fileTree).length !== 1 ? 's' : ''}</span>
                </div>
            </div>
        </section>
    )
}

export default EditorPanel
