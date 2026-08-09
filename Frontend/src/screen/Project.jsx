import React, { useState, useEffect, useContext, useRef, useCallback } from 'react'
import { UserContext } from '../context/user.context'
import { useLocation } from 'react-router-dom'
import { sendMessage } from '../config/socket'

// Hooks
import { useNotifications } from '../hooks/useNotifications'
import { useWebContainer } from '../hooks/useWebContainer'
import { useProjectSocket } from '../hooks/useProjectSocket'

// Components
import Toast from '../components/project/Toast'
import ChatPanel from '../components/project/ChatPanel'
import EditorPanel from '../components/project/EditorPanel'
import CollaboratorModal from '../components/project/CollaboratorModal'

// Utilities
import { buildNestedTree } from '../utils/project/treeHelpers'
import axios from '../config/axios'


const Project = () => {
    const location = useLocation()
    const { user } = useContext(UserContext)
    const messageBox = useRef(null)

    // ── Core state ────────────────────────────────────────────────────────
    const [project, setProject] = useState(location.state?.project || null)
    const [message, setMessage] = useState('')
    const [messages, setMessages] = useState([])
    const [users, setUsers] = useState([])
    const [fileTree, setFileTree] = useState({})

    // ── Editor state ──────────────────────────────────────────────────────
    const [currentFile, setCurrentFile] = useState(null)
    const [openFiles, setOpenFiles] = useState([])
    const [expandedFolders, setExpandedFolders] = useState(new Set())
    const [inputFocused, setInputFocused] = useState(false)

    // ── UI state ──────────────────────────────────────────────────────────
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedUserId, setSelectedUserId] = useState(new Set())
    const [isTerminalOpen, setIsTerminalOpen] = useState(false)

    // ── Terminal state ────────────────────────────────────────────────────
    const [terminalLog, setTerminalLog] = useState([{ type: 'system', text: 'Terminal ready. Click ▶ Run or type a command below.' }])
    const [terminalInput, setTerminalInput] = useState('')
    const terminalRef = useRef(null)
    const terminalInputRef = useRef(null)

    // ── Notifications ─────────────────────────────────────────────────────
    const { notifications, pushNotification, dismissNotification } = useNotifications()

    // ── Terminal log helper ───────────────────────────────────────────────
    const logToTerminal = useCallback((text, type = 'info') => {
        setTerminalLog(prev => [...prev, { type, text }])
        setTimeout(() => {
            if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight
        }, 50)
    }, [])

    // ── WebContainer ──────────────────────────────────────────────────────
    const {
        isRunning, previewUrl, setPreviewUrl,
        runMeta, setRunMeta, shellWriterRef,
        runProject, sendTerminalCommand,
    } = useWebContainer({ fileTree, logToTerminal, pushNotification, terminalInputRef, setIsTerminalOpen })

    // ── File open/close helpers ───────────────────────────────────────────
    function openFile(filePath) {
        setCurrentFile(filePath)
        setOpenFiles(prev => [...new Set([...prev, filePath])])
    }

    function toggleFolder(path) {
        setExpandedFolders(prev => {
            const next = new Set(prev)
            next.has(path) ? next.delete(path) : next.add(path)
            return next
        })
    }

    // ── Socket + project load ─────────────────────────────────────────────
    const { saveFileTree } = useProjectSocket({
        project, currentFile,
        setProject, setFileTree, setMessages, setUsers, setRunMeta,
        openFile, logToTerminal, pushNotification, setIsTerminalOpen,
    })

    // ── Auto-expand folders when fileTree changes ─────────────────────────
    useEffect(() => {
        const folders = new Set()
        Object.keys(fileTree).forEach(path => {
            const parts = path.split('/')
            if (parts.length > 1) folders.add(parts[0])
        })
        if (folders.size > 0) setExpandedFolders(folders)
    }, [fileTree])

    // ── Scroll chat on new messages ───────────────────────────────────────
    useEffect(() => {
        if (messageBox.current) messageBox.current.scrollTop = messageBox.current.scrollHeight
    }, [messages])

    // ── Scroll terminal on new log entries ────────────────────────────────
    useEffect(() => {
        if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }, [terminalLog])

    // ── Send chat message ─────────────────────────────────────────────────
    const send = () => {
        if (!message.trim()) return
        sendMessage('project-message', { message, sender: user })
        setMessages(prev => [...prev, { sender: user, message }])
        setMessage('')
    }

    // ── Collaborator modal actions ────────────────────────────────────────
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
            users: Array.from(selectedUserId),
        }).then(() => {
            setIsModalOpen(false)
            pushNotification(`${selectedUserId.size} collaborator(s) added`, 'success', 'Collaborators updated')
        }).catch(() => pushNotification('Failed to add collaborators', 'error', 'Error'))
    }

    // ── No project guard ──────────────────────────────────────────────────
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

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <main style={{
            height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0a1f 100%)',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            color: '#e0d7ff', overflow: 'hidden',
        }}>
            {/* Toast notifications */}
            <div style={{
                position: 'fixed', top: 16, right: 16, zIndex: 9999,
                display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
            }}>
                {notifications.map(n => (
                    <div key={n.id} style={{ pointerEvents: 'all' }}>
                        <Toast toast={n} onDismiss={dismissNotification} />
                    </div>
                ))}
            </div>

            {/* Main body */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

                <ChatPanel
                    project={project}
                    messages={messages}
                    message={message}
                    setMessage={setMessage}
                    send={send}
                    messageBox={messageBox}
                    user={user}
                    inputFocused={inputFocused}
                    setInputFocused={setInputFocused}
                    isSidePanelOpen={isSidePanelOpen}
                    setIsSidePanelOpen={setIsSidePanelOpen}
                    setIsModalOpen={setIsModalOpen}
                />

                <EditorPanel
                    project={project}
                    fileTree={fileTree}
                    nestedTree={buildNestedTree(fileTree)}
                    currentFile={currentFile}
                    setCurrentFile={setCurrentFile}
                    openFiles={openFiles}
                    setOpenFiles={setOpenFiles}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                    openFile={openFile}
                    saveFileTree={saveFileTree}
                    setFileTree={setFileTree}
                    isTerminalOpen={isTerminalOpen}
                    setIsTerminalOpen={setIsTerminalOpen}
                    isRunning={isRunning}
                    runMeta={runMeta}
                    runProject={runProject}
                    terminalLog={terminalLog}
                    setTerminalLog={setTerminalLog}
                    terminalInput={terminalInput}
                    setTerminalInput={setTerminalInput}
                    terminalRef={terminalRef}
                    terminalInputRef={terminalInputRef}
                    shellWriterRef={shellWriterRef}
                    sendTerminalCommand={sendTerminalCommand}
                    previewUrl={previewUrl}
                    setPreviewUrl={setPreviewUrl}
                />
            </div>

            {/* Collaborators modal */}
            {isModalOpen && (
                <CollaboratorModal
                    users={users}
                    selectedUserId={selectedUserId}
                    onUserClick={handleUserClick}
                    onAdd={addCollaborators}
                    onClose={() => setIsModalOpen(false)}
                />
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