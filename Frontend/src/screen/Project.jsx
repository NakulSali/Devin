import React, { useState, useEffect, useContext, useRef, useCallback } from 'react'
import { UserContext } from '../context/user.context'
import { useLocation } from 'react-router-dom'
import axios from '../config/axios'
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket'
import Markdown from 'markdown-to-jsx'
import { WebContainer } from '@webcontainer/api'


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Convert flat { "routes/api.js": {...} } into nested tree for the explorer */
function buildNestedTree(fileTree) {
    const root = {}
    Object.keys(fileTree).forEach(path => {
        const parts = path.split('/')
        let node = root
        parts.forEach((part, i) => {
            if (i === parts.length - 1) {
                node[part] = { __isFile: true, __path: path }
            } else {
                if (!node[part]) node[part] = {}
                node = node[part]
            }
        })
    })
    return root
}

/** File extension → { icon, color } */
function getFileIcon(name) {
    const ext = (name.split('.').pop() || '').toLowerCase()
    const map = {
        js: { icon: 'ri-javascript-line', color: '#f59e0b' },
        jsx: { icon: 'ri-reactjs-line', color: '#61dafb' },
        ts: { icon: 'ri-file-code-line', color: '#3b82f6' },
        tsx: { icon: 'ri-reactjs-line', color: '#61dafb' },
        json: { icon: 'ri-file-list-line', color: '#f59e0b' },
        css: { icon: 'ri-css3-line', color: '#06b6d4' },
        html: { icon: 'ri-html5-line', color: '#f97316' },
        md: { icon: 'ri-markdown-line', color: '#a78bfa' },
        env: { icon: 'ri-settings-4-line', color: '#10b981' },
        sh: { icon: 'ri-terminal-line', color: '#10b981' },
    }
    return map[ext] || { icon: 'ri-file-code-line', color: '#a78bfa' }
}

/** Strip markdown fences that AI may wrap around JSON */
function cleanAIJson(raw) {
    return raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
}

/**
 * Convert flat fileTree  { "routes/api.js": { file: { contents } } }
 * into WebContainer nested format:
 * { routes: { directory: { "api.js": { file: { contents } } } } }
 */
function flatToWebContainerTree(fileTree) {
    const root = {}
    Object.entries(fileTree).forEach(([path, value]) => {
        const parts = path.split('/')
        let node = root
        parts.forEach((part, i) => {
            if (i === parts.length - 1) {
                // Leaf — actual file
                node[part] = { file: { contents: value?.file?.contents ?? '' } }
            } else {
                // Directory node
                if (!node[part]) {
                    node[part] = { directory: {} }
                }
                node = node[part].directory
            }
        })
    })
    return root
}

/** Count lines in a string */
function countLines(str) {
    return str ? str.split('\n').length : 0
}


// ─────────────────────────────────────────────────────────────────────────────
// FILE TREE NODE  (recursive)
// ─────────────────────────────────────────────────────────────────────────────

function FileTreeNode({ name, node, depth, currentFile, onFileClick, expandedFolders, toggleFolder, parentPath }) {
    const fullPath = parentPath ? `${parentPath}/${name}` : name

    if (node.__isFile) {
        const isActive = currentFile === node.__path
        const { icon, color } = getFileIcon(name)
        return (
            <button
                onClick={() => onFileClick(node.__path)}
                title={node.__path}
                style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: `5px 10px 5px ${12 + depth * 14}px`,
                    border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer',
                    background: isActive ? 'rgba(139,92,246,0.18)' : 'transparent',
                    color: isActive ? '#e0d7ff' : 'rgba(167,139,250,0.75)',
                    fontSize: 12,
                    borderLeft: isActive ? '2px solid #8b5cf6' : '2px solid transparent',
                    transition: 'all 0.13s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(139,92,246,0.09)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
                <i className={icon} style={{ fontSize: 13, flexShrink: 0, color }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            </button>
        )
    }

    // Folder
    const isExpanded = expandedFolders.has(fullPath)
    const children = Object.entries(node).filter(([k]) => !k.startsWith('__'))

    return (
        <div>
            <button
                onClick={() => toggleFolder(fullPath)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: `5px 10px 5px ${8 + depth * 14}px`,
                    border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer',
                    background: 'transparent',
                    color: 'rgba(224,215,255,0.88)',
                    fontSize: 12, fontWeight: 600,
                    transition: 'all 0.13s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
                <i
                    className={isExpanded ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'}
                    style={{ fontSize: 14, flexShrink: 0, color: 'rgba(167,139,250,0.55)', transition: 'transform 0.15s' }}
                />
                <i
                    className={isExpanded ? 'ri-folder-open-fill' : 'ri-folder-fill'}
                    style={{ fontSize: 13, flexShrink: 0, color: '#f59e0b' }}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            </button>

            {isExpanded && (
                <div style={{ borderLeft: '1px solid rgba(139,92,246,0.14)', marginLeft: `${16 + depth * 14}px` }}>
                    {children.map(([childName, childNode]) => (
                        <FileTreeNode
                            key={childName}
                            name={childName}
                            node={childNode}
                            depth={depth + 1}
                            currentFile={currentFile}
                            onFileClick={onFileClick}
                            expandedFolders={expandedFolders}
                            toggleFolder={toggleFolder}
                            parentPath={fullPath}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}


// ─────────────────────────────────────────────────────────────────────────────
// TOAST NOTIFICATION  (single item)
// ─────────────────────────────────────────────────────────────────────────────

const TOAST_COLORS = {
    success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', icon: 'ri-checkbox-circle-fill', color: '#10b981' },
    error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', icon: 'ri-error-warning-fill', color: '#ef4444' },
    warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', icon: 'ri-alert-fill', color: '#f59e0b' },
    info: { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.35)', icon: 'ri-information-fill', color: '#a78bfa' },
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


// ─────────────────────────────────────────────────────────────────────────────
// MAIN PROJECT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const Project = () => {
    const location = useLocation()
    const { user } = useContext(UserContext)
    const messageBox = useRef(null)

    // ── Core state ────────────────────────────────────────────────────────
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedUserId, setSelectedUserId] = useState(new Set())
    const [project, setProject] = useState(location.state?.project || null)
    const [message, setMessage] = useState('')

    const [users, setUsers] = useState([])
    const [messages, setMessages] = useState([])
    const [fileTree, setFileTree] = useState({})

    // ── Editor state ──────────────────────────────────────────────────────
    const [currentFile, setCurrentFile] = useState(null)
    const [openFiles, setOpenFiles] = useState([])
    const [expandedFolders, setExpandedFolders] = useState(new Set())
    const [inputFocused, setInputFocused] = useState(false)

    // ── Terminal panel ────────────────────────────────────────────────────
    const [isTerminalOpen, setIsTerminalOpen] = useState(false)
    const [terminalLog, setTerminalLog] = useState([
        { type: 'system', text: 'Terminal ready. Use @ai in chat to generate files.' }
    ])
    const terminalRef = useRef(null)

    // ── WebContainer state ────────────────────────────────────────────────
    const [runMeta, setRunMeta] = useState(null)   // { buildCommand, startCommand }
    const [isRunning, setIsRunning] = useState(false)
    const [previewUrl, setPreviewUrl] = useState(null)
    const webcontainerRef = useRef(null)

    // ── Notifications (toasts) ────────────────────────────────────────────
    const [notifications, setNotifications] = useState([])
    const notifCounter = useRef(0)

    // ── Derived ───────────────────────────────────────────────────────────
    const nestedTree = buildNestedTree(fileTree)
    const currentFileContents = fileTree[currentFile]?.file?.contents || ''
    const currentFileLines = countLines(currentFileContents)
    const currentFileExt = currentFile ? (currentFile.split('.').pop() || '').toUpperCase() : ''

    // ─────────────────────────────────────────────────────────────────────
    // NOTIFICATION HELPERS
    // ─────────────────────────────────────────────────────────────────────

    const pushNotification = useCallback((message, type = 'info', title = '') => {
        const id = ++notifCounter.current
        setNotifications(prev => [...prev.slice(-3), { id, message, type, title }])
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id))
        }, 4000)
    }, [])

    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    // ─────────────────────────────────────────────────────────────────────
    // TERMINAL LOG HELPER
    // ─────────────────────────────────────────────────────────────────────

    const logToTerminal = useCallback((text, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })
        setTerminalLog(prev => [...prev, { type, text, timestamp }])
        // auto-scroll terminal
        setTimeout(() => {
            if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight
        }, 50)
    }, [])

    // ─────────────────────────────────────────────────────────────────────
    // FOLDER EXPAND / FILE OPEN
    // ─────────────────────────────────────────────────────────────────────

    function toggleFolder(path) {
        setExpandedFolders(prev => {
            const next = new Set(prev)
            next.has(path) ? next.delete(path) : next.add(path)
            return next
        })
    }

    function openFile(filePath) {
        setCurrentFile(filePath)
        setOpenFiles(prev => [...new Set([...prev, filePath])])
    }

    function closeTab(e, filePath) {
        e.stopPropagation()
        setOpenFiles(prev => {
            const next = prev.filter(f => f !== filePath)
            if (currentFile === filePath) setCurrentFile(next[next.length - 1] || null)
            return next
        })
    }

    // Auto-expand top-level folders when fileTree changes
    useEffect(() => {
        const folders = new Set()
        Object.keys(fileTree).forEach(path => {
            const parts = path.split('/')
            if (parts.length > 1) folders.add(parts[0])
        })
        if (folders.size > 0) setExpandedFolders(folders)
    }, [fileTree])

    // Scroll chat to bottom on new messages
    useEffect(() => {
        if (messageBox.current) messageBox.current.scrollTop = messageBox.current.scrollHeight
    }, [messages])

    // Scroll terminal to bottom
    useEffect(() => {
        if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }, [terminalLog])

    // ─────────────────────────────────────────────────────────────────────
    // COLLABORATORS
    // ─────────────────────────────────────────────────────────────────────

    const handleUserClick = (id) => {
        setSelectedUserId(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    function addCollaborators() {
        axios.put('/projects/add-user', {
            projectId: location.state.project._id,
            users: Array.from(selectedUserId)
        }).then(res => {
            console.log(res.data)
            setIsModalOpen(false)
            pushNotification(`${selectedUserId.size} collaborator(s) added`, 'success', 'Collaborators updated')
        }).catch(err => {
            console.log(err)
            pushNotification('Failed to add collaborators', 'error', 'Error')
        })
    }

    // ─────────────────────────────────────────────────────────────────────
    // SEND CHAT MESSAGE
    // ─────────────────────────────────────────────────────────────────────

    const send = () => {
        if (!message.trim()) return
        sendMessage('project-message', { message, sender: user })
        setMessages(prev => [...prev, { sender: user, message }])
        setMessage('')
    }

    // ─────────────────────────────────────────────────────────────────────
    // AI MESSAGE BUBBLE  (safe JSON parse — shows only text)
    // ─────────────────────────────────────────────────────────────────────

    function WriteAiMessage(rawMessage) {
        let displayText = rawMessage
        try {
            const parsed = JSON.parse(cleanAIJson(rawMessage))
            displayText = parsed.text || rawMessage
        } catch { /* plain text response */ }
        return (
            <div style={{
                overflow: 'auto',
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(139,92,246,0.3)',
                borderRadius: 10, padding: '10px 12px',
                color: '#e0d7ff', fontSize: 13, lineHeight: 1.6,
            }}>
                <Markdown>{displayText}</Markdown>
            </div>
        )
    }

    // ─────────────────────────────────────────────────────────────────────
    // SOCKET + PROJECT INIT
    // ─────────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!project) return

        initializeSocket(project._id)

        receiveMessage('project-message', data => {
            console.log('msg:', data)

            if (data.sender._id === 'ai') {
                try {
                    const parsed = JSON.parse(cleanAIJson(data.message))

                    if (parsed.fileTree && Object.keys(parsed.fileTree).length > 0) {
                        const ft = parsed.fileTree
                        setFileTree(ft)
                        const firstFile = Object.keys(ft)[0]
                        if (firstFile) openFile(firstFile)

                        const fileCount = Object.keys(ft).length
                        pushNotification(`${fileCount} file${fileCount > 1 ? 's' : ''} generated by AI`, 'success', 'Files Created')
                        logToTerminal(`AI generated ${fileCount} file(s): ${Object.keys(ft).join(', ')}`, 'success')
                        setIsTerminalOpen(true)
                    }

                    // Capture run commands so the Run button appears
                    if (parsed.buildCommand || parsed.startCommand) {
                        setRunMeta({
                            buildCommand: parsed.buildCommand || null,
                            startCommand: parsed.startCommand || null,
                        })
                        logToTerminal(
                            `Run commands detected — click ▶ Run to execute: ${parsed.startCommand?.mainItem} ${parsed.startCommand?.commands?.join(' ')}`,
                            'info'
                        )
                    }
                } catch (e) {
                    console.warn('AI response was not JSON:', e)
                }
            }

            setMessages(prev => [...prev, data])
        })

        // Load saved project data
        axios.get(`/projects/get-project/${project._id}`).then(res => {
            setProject(res.data.project)
            const ft = res.data.project.fileTree || {}
            setFileTree(ft)
            const keys = Object.keys(ft)
            if (keys.length > 0) openFile(keys[0])
            logToTerminal(`Project "${res.data.project.name}" loaded — ${keys.length} file(s)`, 'system')
        })

        axios.get('/users/all').then(res => setUsers(res.data.users)).catch(console.log)

    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ─────────────────────────────────────────────────────────────────────
    // SAVE FILE TREE
    // ─────────────────────────────────────────────────────────────────────

    function saveFileTree(ft) {
        axios.put('/projects/update-file-tree', {
            projectId: project._id,
            fileTree: ft
        }).then(() => {
            pushNotification(`${currentFile} saved`, 'info')
            logToTerminal(`File saved: ${currentFile}`, 'info')
        }).catch(err => {
            console.log(err)
            pushNotification('Failed to save file', 'error', 'Save Error')
        })
    }

    // ─────────────────────────────────────────────────────────────────────
    // WEBCONTAINER — RUN PROJECT
    // ─────────────────────────────────────────────────────────────────────

    async function runProject() {
        if (isRunning) return
        setIsRunning(true)
        setIsTerminalOpen(true)
        setPreviewUrl(null)
        logToTerminal('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'system')
        logToTerminal('Starting WebContainer...', 'system')

        try {
            // Boot once per session
            if (!webcontainerRef.current) {
                logToTerminal('⚡ Booting WebContainer environment...', 'info')
                webcontainerRef.current = await WebContainer.boot()
                logToTerminal('✓ WebContainer ready', 'success')
            }

            const wc = webcontainerRef.current

            // Mount the AI-generated file tree (convert flat paths → nested dirs)
            logToTerminal('📁 Mounting project files...', 'info')
            const wcTree = flatToWebContainerTree(fileTree)
            await wc.mount(wcTree)
            logToTerminal(`✓ ${Object.keys(fileTree).length} file(s) mounted`, 'success')

            // Run build command (e.g. npm install)
            if (runMeta?.buildCommand) {
                const { mainItem, commands } = runMeta.buildCommand
                logToTerminal(`$ ${mainItem} ${commands.join(' ')}`, 'info')
                const installProcess = await wc.spawn(mainItem, commands)
                installProcess.output.pipeTo(new WritableStream({
                    write(chunk) {
                        chunk.split('\n').filter(Boolean).forEach(line =>
                            logToTerminal(line, 'info')
                        )
                    }
                }))
                const exitCode = await installProcess.exit
                if (exitCode !== 0) {
                    logToTerminal(`✗ Build failed (exit code ${exitCode})`, 'error')
                    pushNotification('Build failed — check terminal', 'error', 'Run Error')
                    setIsRunning(false)
                    return
                }
                logToTerminal('✓ Dependencies installed!', 'success')
            }

            // Run start command (e.g. node app.js)
            if (runMeta?.startCommand) {
                const { mainItem, commands } = runMeta.startCommand
                logToTerminal(`$ ${mainItem} ${commands.join(' ')}`, 'info')
                const startProcess = await wc.spawn(mainItem, commands)
                startProcess.output.pipeTo(new WritableStream({
                    write(chunk) {
                        chunk.split('\n').filter(Boolean).forEach(line =>
                            logToTerminal(line, 'info')
                        )
                    }
                }))
            }

            // Show preview URL when server is ready
            wc.on('server-ready', (port, url) => {
                logToTerminal(`🚀 Server running at: ${url}`, 'success')
                setPreviewUrl(url)
                setIsRunning(false)
                pushNotification(`Server ready on port ${port}`, 'success', 'Server Running')
            })

        } catch (err) {
            logToTerminal(`✗ Error: ${err.message}`, 'error')
            pushNotification(err.message, 'error', 'WebContainer Error')
            setIsRunning(false)
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // NO PROJECT GUARD
    // ─────────────────────────────────────────────────────────────────────

    if (!project) {
        return (
            <main style={{
                height: '100vh', width: '100vw',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0a1f 100%)',
                fontFamily: "'Inter', 'Segoe UI', sans-serif"
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 18,
                        background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px', boxShadow: '0 0 40px rgba(139,92,246,0.4)'
                    }}>
                        <i className="ri-folder-open-line" style={{ fontSize: 32, color: '#fff' }} />
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e0d7ff', margin: '0 0 8px' }}>No project selected</h2>
                    <p style={{ color: 'rgba(167,139,250,0.6)', marginBottom: 24, fontSize: 14 }}>
                        Please go back and open a project from the home page.
                    </p>
                    <a href="/" style={{
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                        color: '#fff', borderRadius: 12, textDecoration: 'none',
                        fontWeight: 600, fontSize: 14, boxShadow: '0 0 20px rgba(139,92,246,0.4)'
                    }}>Go Home</a>
                </div>
            </main>
        )
    }

    // ─────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────

    return (
        <main style={{
            height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0a1f 100%)',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            color: '#e0d7ff', overflow: 'hidden',
        }}>

            {/* ══════════════════════════════════════════
                TOAST NOTIFICATIONS  (fixed top-right)
            ══════════════════════════════════════════ */}
            <div style={{
                position: 'fixed', top: 16, right: 16, zIndex: 9999,
                display: 'flex', flexDirection: 'column', gap: 8,
                pointerEvents: 'none',
            }}>
                {notifications.map(n => (
                    <div key={n.id} style={{ pointerEvents: 'all' }}>
                        <Toast toast={n} onDismiss={dismissNotification} />
                    </div>
                ))}
            </div>

            {/* ══════════════════════════════════════════
                MAIN BODY  (chat + editor)
            ══════════════════════════════════════════ */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

                {/* ╔══════════════════════════════╗
                    ║  LEFT PANEL — CHAT           ║
                    ╚══════════════════════════════╝ */}
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

                    {/* Messages */}
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

                        {/* Chat input */}
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
                                borderRadius: 10, padding: '0 12px',
                                transition: 'all 0.2s',
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

                {/* ╔══════════════════════════════╗
                    ║  RIGHT PANEL — EDITOR        ║
                    ╚══════════════════════════════╝ */}
                <section style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    height: '100%', overflow: 'hidden', background: 'rgba(0,0,0,0.3)', minWidth: 0,
                }}>
                    {/* ── File Tabs bar ── */}
                    <div style={{
                        height: 42, display: 'flex', alignItems: 'stretch',
                        borderBottom: '1px solid rgba(139,92,246,0.15)',
                        background: 'rgba(5,5,15,0.7)', flexShrink: 0,
                        overflowX: 'auto', overflowY: 'hidden',
                        scrollbarWidth: 'none',
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

                        {/* Terminal toggle + Run button — right side of tab bar */}
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
                                fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                                whiteSpace: 'nowrap',
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

                        {/* ▶ Run button — visible when AI generated runnable code */}
                        {runMeta?.startCommand && Object.keys(fileTree).length > 0 && (
                            <button
                                onClick={runProject}
                                disabled={isRunning}
                                title={`Run: ${runMeta.startCommand.mainItem} ${runMeta.startCommand.commands.join(' ')}`}
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
                                    transition: 'all 0.2s',
                                    letterSpacing: '0.03em',
                                    boxShadow: isRunning ? 'none' : 'inset 0 0 20px rgba(16,185,129,0.08)',
                                }}
                            >
                                {isRunning ? (
                                    <><i className="ri-loader-4-line" style={{ fontSize: 13, animation: 'spin 1s linear infinite' }} /> Running...</>
                                ) : (
                                    <><i className="ri-play-fill" style={{ fontSize: 14 }} /> Run</>
                                )}
                            </button>
                        )}
                    </div>

                    {/* ── Explorer + Code Area ── */}
                    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

                        {/* File Explorer */}
                        <div style={{
                            width: 210, flexShrink: 0,
                            borderRight: '1px solid rgba(139,92,246,0.15)',
                            background: 'rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column',
                            overflow: 'hidden',
                        }}>
                            {/* Explorer header */}
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

                            {/* File list */}
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

                        {/* Code editor + terminal */}
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

                            {/* ── COLLAPSIBLE TERMINAL PANEL ── */}
                            <div style={{
                                flexShrink: 0,
                                borderTop: '1px solid rgba(139,92,246,0.2)',
                                background: 'rgba(5,5,12,0.9)',
                                overflow: 'hidden',
                                transition: 'height 0.28s cubic-bezier(0.4,0,0.2,1)',
                                height: isTerminalOpen ? 200 : 0,
                            }}>
                                {/* Terminal header */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '6px 14px',
                                    borderBottom: '1px solid rgba(139,92,246,0.12)',
                                    background: 'rgba(139,92,246,0.05)',
                                    flexShrink: 0,
                                }}>
                                    <div style={{ display: 'flex', gap: 5 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                                    </div>
                                    <span style={{ fontSize: 11, color: 'rgba(167,139,250,0.5)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                        <i className="ri-terminal-box-line" style={{ marginRight: 5 }} />
                                        Output
                                    </span>
                                    <button
                                        onClick={() => setTerminalLog([{ type: 'system', text: 'Terminal cleared.' }])}
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
                                    <button
                                        onClick={() => setIsTerminalOpen(false)}
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

                                {/* Terminal log output */}
                                <div
                                    ref={terminalRef}
                                    style={{
                                        height: 152, overflowY: 'auto',
                                        padding: '8px 14px',
                                        fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                                        fontSize: 12, lineHeight: 1.7,
                                        scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.2) transparent',
                                    }}
                                >
                                    {terminalLog.map((entry, i) => {
                                        const colors = {
                                            system: 'rgba(167,139,250,0.5)',
                                            info: '#06b6d4',
                                            success: '#10b981',
                                            error: '#ef4444',
                                            warning: '#f59e0b',
                                        }
                                        const icons = {
                                            system: '●',
                                            info: '›',
                                            success: '✓',
                                            error: '✗',
                                            warning: '⚠',
                                        }
                                        return (
                                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                {entry.timestamp && (
                                                    <span style={{ color: 'rgba(167,139,250,0.25)', flexShrink: 0, fontSize: 11 }}>
                                                        {entry.timestamp}
                                                    </span>
                                                )}
                                                <span style={{ color: colors[entry.type] || '#a78bfa', flexShrink: 0 }}>
                                                    {icons[entry.type] || '›'}
                                                </span>
                                                <span style={{ color: entry.type === 'system' ? 'rgba(167,139,250,0.5)' : '#c9d1d9' }}>
                                                    {entry.text}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* ── PREVIEW PANEL — slides open when server-ready ── */}
                            {previewUrl && (
                                <div style={{
                                    flexShrink: 0,
                                    borderTop: '1px solid rgba(16,185,129,0.25)',
                                    background: 'rgba(5,5,12,0.95)',
                                    display: 'flex', flexDirection: 'column',
                                    animation: 'fadeSlideIn 0.3s ease',
                                    height: 340,
                                }}>
                                    {/* Preview header */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '5px 14px',
                                        borderBottom: '1px solid rgba(16,185,129,0.15)',
                                        background: 'rgba(16,185,129,0.05)',
                                        flexShrink: 0,
                                    }}>
                                        <div style={{ display: 'flex', gap: 5 }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                                        </div>
                                        <i className="ri-global-line" style={{ fontSize: 12, color: '#10b981' }} />
                                        <span style={{ fontSize: 11, color: 'rgba(16,185,129,0.8)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                            Preview
                                        </span>
                                        <code style={{
                                            marginLeft: 4, fontSize: 11,
                                            color: 'rgba(16,185,129,0.6)',
                                            fontFamily: "'Fira Code', monospace",
                                            background: 'rgba(16,185,129,0.08)',
                                            border: '1px solid rgba(16,185,129,0.2)',
                                            borderRadius: 4, padding: '1px 7px',
                                        }}>
                                            {previewUrl}
                                        </code>
                                        <a
                                            href={previewUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            title="Open in new tab"
                                            style={{
                                                marginLeft: 4,
                                                color: 'rgba(16,185,129,0.5)', fontSize: 13,
                                                textDecoration: 'none', lineHeight: 1,
                                                transition: 'color 0.15s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.color = '#10b981' }}
                                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(16,185,129,0.5)' }}
                                        >
                                            <i className="ri-external-link-line" />
                                        </a>
                                        <button
                                            onClick={() => setPreviewUrl(null)}
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

                                    {/* Preview iframe */}
                                    <iframe
                                        src={previewUrl}
                                        title="App Preview"
                                        style={{
                                            flex: 1, border: 'none',
                                            background: '#fff',
                                            width: '100%',
                                        }}
                                    />
                                </div>
                            )}

                        </div>
                    </div>

                    {/* ── FILE STATUS BAR ── */}
                    <div style={{
                        flexShrink: 0, height: 24,
                        display: 'flex', alignItems: 'center', gap: 0,
                        borderTop: '1px solid rgba(139,92,246,0.12)',
                        background: 'rgba(139,92,246,0.07)',
                        fontSize: 11, color: 'rgba(167,139,250,0.5)',
                        overflow: 'hidden',
                    }}>
                        {/* Left side — project name */}
                        <div style={{
                            padding: '0 12px', height: '100%',
                            display: 'flex', alignItems: 'center', gap: 5,
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.15))',
                            borderRight: '1px solid rgba(139,92,246,0.18)',
                            flexShrink: 0,
                        }}>
                            <i className="ri-git-branch-line" style={{ fontSize: 11, color: '#a78bfa' }} />
                            <span style={{ color: '#a78bfa', fontWeight: 600 }}>{project.name}</span>
                        </div>

                        {/* Current file path */}
                        {currentFile && (
                            <div style={{
                                padding: '0 12px', height: '100%',
                                display: 'flex', alignItems: 'center', gap: 5,
                                borderRight: '1px solid rgba(139,92,246,0.1)',
                                flexShrink: 0,
                            }}>
                                <i className={getFileIcon(currentFile.split('/').pop()).icon} style={{ fontSize: 11, color: getFileIcon(currentFile.split('/').pop()).color }} />
                                <span style={{ color: 'rgba(224,215,255,0.7)' }}>{currentFile}</span>
                            </div>
                        )}

                        {/* Line count */}
                        {currentFile && (
                            <div style={{
                                padding: '0 10px', height: '100%',
                                display: 'flex', alignItems: 'center', gap: 4,
                                borderRight: '1px solid rgba(139,92,246,0.1)',
                                flexShrink: 0,
                            }}>
                                <i className="ri-list-ordered" style={{ fontSize: 10 }} />
                                <span>{currentFileLines} lines</span>
                            </div>
                        )}

                        {/* File type badge */}
                        {currentFileExt && (
                            <div style={{
                                padding: '0 10px', height: '100%',
                                display: 'flex', alignItems: 'center',
                                borderRight: '1px solid rgba(139,92,246,0.1)',
                                flexShrink: 0,
                            }}>
                                <span style={{ color: '#a78bfa', fontWeight: 700 }}>{currentFileExt}</span>
                            </div>
                        )}

                        {/* Total files count — right side */}
                        <div style={{
                            marginLeft: 'auto', padding: '0 12px', height: '100%',
                            display: 'flex', alignItems: 'center', gap: 5,
                            borderLeft: '1px solid rgba(139,92,246,0.1)',
                            flexShrink: 0,
                        }}>
                            <i className="ri-file-copy-line" style={{ fontSize: 11 }} />
                            <span>{Object.keys(fileTree).length} file{Object.keys(fileTree).length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>

                </section>
            </div>

            {/* ══════════════════════════════════════════
                MODAL — Add Collaborators
            ══════════════════════════════════════════ */}
            {isModalOpen && (
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
                            <button onClick={() => setIsModalOpen(false)} style={{
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
                                        onClick={() => handleUserClick(u._id)}
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
                            onClick={addCollaborators}
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
            )}

            <style>{`
                * { box-sizing: border-box; }
                ::-webkit-scrollbar { width: 5px; height: 5px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 10px; }
                input::placeholder { color: rgba(167,139,250,0.3) !important; }
                code:focus { box-shadow: none; }
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(20px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
            `}</style>
        </main>
    )
}

export default Project