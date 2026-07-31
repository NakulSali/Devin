import { useState, useRef, useCallback } from 'react'
import { WebContainer } from '@webcontainer/api'
import { flatToWebContainerTree } from '../utils/project/treeHelpers'

// ── Module-level singleton ────────────────────────────────────────────────────
// WebContainer.boot() may only be called ONCE per browser tab. Storing the
// instance outside the hook ensures it survives React re-renders and HMR
// hot-reloads without triggering a second boot (which throws an error).
let globalWC = null
let globalWCPromise = null   // in-flight boot promise — prevents race conditions
let currentBlobUrl = null   // track the active blob URL so we can revoke it on refresh

async function getWebContainer() {
    if (globalWC) return globalWC
    if (globalWCPromise) return globalWCPromise  // already booting — wait for it
    globalWCPromise = WebContainer.boot().then(wc => {
        globalWC = wc
        globalWCPromise = null
        return wc
    })
    return globalWCPromise
}

// ── Blob preview builder (frontend-only fast path) ──────────────────────
/**
 * For pure HTML/CSS/JS projects with no server, inline all assets into the
 * HTML and return a Blob URL so the iframe can render it immediately.
 */
function buildBlobPreview(fileTree) {
    // Find the root HTML entry (index.html preferred)
    const htmlKey = Object.keys(fileTree).find(k => k === 'index.html')
        || Object.keys(fileTree).find(k => k.endsWith('.html') && !k.includes('/'))
    if (!htmlKey) return null

    let html = fileTree[htmlKey]?.file?.contents || ''

    // Inline every <link rel="stylesheet" href="..."> that exists in the fileTree
    html = html.replace(
        /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*\/?>/gi,
        (match, href) => {
            const cssKey = href.replace(/^\.?\//, '')
            const css = fileTree[cssKey]?.file?.contents
            return css ? `<style>${css}</style>` : match
        }
    )

    // Inline every <script src="..."> that exists in the fileTree
    html = html.replace(
        /<script([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi,
        (match, pre, src, post) => {
            const jsKey = src.replace(/^\.?\//, '')
            const js = fileTree[jsKey]?.file?.contents
            return js ? `<script${pre}${post}>${js}</script>` : match
        }
    )

    // Revoke any previously created blob URL to avoid memory leaks
    if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl)
        currentBlobUrl = null
    }

    const blob = new Blob([html], { type: 'text/html' })
    currentBlobUrl = URL.createObjectURL(blob)
    return currentBlobUrl
}

/** Returns true if the project is a plain HTML/CSS/JS frontend with no Node server */
function isFrontendOnlyProject(fileTree) {
    const hasHtml = Object.keys(fileTree).some(k => k.endsWith('.html'))
    if (!hasHtml) return false

    // If there is a package.json with a start/dev/serve SCRIPT, it needs a server
    // (a package.json with only dependencies but no scripts is fine — treat as static)
    if (fileTree['package.json']) {
        try {
            const pkg = JSON.parse(fileTree['package.json'].file.contents)
            const scripts = pkg.scripts || {}
            const hasServerScript = scripts.start || scripts.dev || scripts.serve
                || scripts.preview || scripts.build   // build-only also needs WC
            if (hasServerScript) return false
        } catch { /* ignore — treat as static if JSON is malformed */ }
    }
    return true
}

/**
 * useWebContainer — manages all WebContainer logic:
 *  - booting the container (singleton — safe across re-renders & HMR)
 *  - booting the interactive jsh shell
 *  - mounting files and running the project
 *  - handling terminal commands from the interactive input
 */
export function useWebContainer({ fileTree, logToTerminal, pushNotification, terminalInputRef, setIsTerminalOpen }) {
    const [isRunning, setIsRunning] = useState(false)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [runMeta, setRunMeta] = useState(null)  // { buildCommand, startCommand }

    // webcontainerRef removed — use module-level globalWC singleton instead
    const shellWriterRef = useRef(null)   // stdin writer for interactive jsh
    const serverReadyListenerRef = useRef(false)  // prevent duplicate listeners

    // ── Boot the interactive jsh shell ─────────────────────────────────────
    const bootShell = useCallback(async (wc) => {
        const shell = await wc.spawn('jsh', { terminal: { cols: 80, rows: 20 } })
        const encoder = new TextEncoder()

        shell.output.pipeTo(new WritableStream({
            write(chunk) {
                // Strip ANSI escape codes for clean display
                const clean = chunk.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\r/g, '')
                clean.split('\n').filter(l => l.trim()).forEach(line => {
                    const lower = line.toLowerCase()
                    if (lower.includes('error') || lower.includes('enoent') || lower.includes('cannot find')) {
                        logToTerminal(line, 'error')
                    } else if (lower.includes('warn')) {
                        logToTerminal(line, 'warning')
                    } else if (lower.includes('✓') || lower.includes('success') || lower.includes('ready') || lower.includes('running')) {
                        logToTerminal(line, 'success')
                    } else {
                        logToTerminal(line, 'info')
                    }
                })
            }
        }))

        const writer = shell.input.getWriter()
        shellWriterRef.current = { write: (text) => writer.write(encoder.encode(text)) }
        logToTerminal('✓ Interactive shell ready — type commands below', 'success')
    }, [logToTerminal])

    // ── Send a user-typed command to the jsh shell ──────────────────────────
    const sendTerminalCommand = useCallback(async (cmd) => {
        if (!cmd.trim()) return
        logToTerminal(`$ ${cmd}`, 'input')

        if (!globalWC) {
            logToTerminal('⚡ Booting WebContainer...', 'system')
            try {
                const wc = await getWebContainer()
                logToTerminal('✓ WebContainer ready', 'success')
                await bootShell(wc)
            } catch (e) {
                logToTerminal(`✗ Boot failed: ${e.message}`, 'error')
                return
            }
        }

        if (shellWriterRef.current) {
            shellWriterRef.current.write(cmd + '\n')
        } else {
            logToTerminal('⚠ Shell not ready yet — click ▶ Run first', 'warning')
        }
    }, [logToTerminal, bootShell])

    // ── Run the project (npm install + start) ──────────────────────────────
    const runProject = useCallback(async () => {
        if (isRunning) return
        if (Object.keys(fileTree).length === 0) {
            pushNotification('No files to run. Use @ai to generate code first.', 'warning', 'Nothing to Run')
            return
        }

        setIsRunning(true)
        setIsTerminalOpen(true)
        logToTerminal('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'system')
        logToTerminal('⚡ Starting project...', 'system')
        setTimeout(() => terminalInputRef.current?.focus(), 300)

        // ── Fast path: plain HTML/CSS/JS — instant Blob URL preview ───────────
        if (isFrontendOnlyProject(fileTree)) {
            logToTerminal('🗂 Detected frontend-only project (HTML/CSS/JS)', 'info')
            logToTerminal('🚀 Building inline preview…', 'info')
            const blobUrl = buildBlobPreview(fileTree)
            if (blobUrl) {
                setPreviewUrl(blobUrl)          // set AFTER building, no null flash
                setIsRunning(false)
                logToTerminal('✓ Preview ready! (inline Blob — no server needed)', 'success')
                pushNotification('Preview ready instantly!', 'success', '🚀 Live Preview')
            } else {
                logToTerminal('✗ Could not find an HTML entry point', 'error')
                pushNotification('No HTML file found', 'error', 'Preview Error')
                setIsRunning(false)
            }
            return
        }

        // ── Server path: Node/React — boot WebContainer ────────────────────
        setPreviewUrl(null)   // reset server preview (blob cleanup already done above)

        try {
            if (!globalWC) {
                logToTerminal('⚡ Booting WebContainer (first run — may take ~30s)...', 'info')
            } else {
                logToTerminal('✓ Reusing existing WebContainer', 'success')
            }
            const wc = await getWebContainer()
            if (!shellWriterRef.current) {
                logToTerminal('✓ WebContainer booted', 'success')
                await bootShell(wc)
            }

            // Mount the AI-generated file tree
            logToTerminal('📁 Mounting project files...', 'info')
            const wcTree = flatToWebContainerTree(fileTree)
            await wc.mount(wcTree)
            logToTerminal(`✓ ${Object.keys(fileTree).length} file(s) mounted`, 'success')

            // Resolve run commands — Priority: runMeta → package.json → fallback
            let effectiveBuild = runMeta?.buildCommand || null
            let effectiveStart = runMeta?.startCommand || null

            if (fileTree['package.json']) {
                try {
                    const pkg = JSON.parse(fileTree['package.json'].file.contents)
                    effectiveBuild = { mainItem: 'npm', commands: ['install'] }
                    if (!effectiveStart) {
                        if (pkg.scripts?.start) effectiveStart = { mainItem: 'npm', commands: ['run', 'start'] }
                        else if (pkg.scripts?.dev) effectiveStart = { mainItem: 'npm', commands: ['run', 'dev'] }
                        else if (pkg.main) effectiveStart = { mainItem: 'node', commands: [pkg.main] }
                        else effectiveStart = { mainItem: 'node', commands: ['index.js'] }
                    }
                    logToTerminal(`Auto-detected: ${effectiveBuild.mainItem} ${effectiveBuild.commands.join(' ')} | ${effectiveStart.mainItem} ${effectiveStart.commands.join(' ')}`, 'info')
                } catch {
                    logToTerminal('⚠ Could not parse package.json — using fallback', 'warning')
                    effectiveBuild = { mainItem: 'npm', commands: ['install'] }
                    effectiveStart = effectiveStart || { mainItem: 'node', commands: ['index.js'] }
                }
            }

            if (!effectiveStart) {
                const jsFile = Object.keys(fileTree).find(f => !f.includes('/') && f.endsWith('.js'))
                if (jsFile) {
                    effectiveStart = { mainItem: 'node', commands: [jsFile] }
                    logToTerminal(`Auto-detected entry point: ${jsFile}`, 'info')
                } else {
                    logToTerminal('✗ Could not determine start command. Ask @ai to create a project with package.json.', 'error')
                    pushNotification('No start command found', 'error', 'Run Error')
                    setIsRunning(false)
                    return
                }
            }

            // npm install
            if (effectiveBuild) {
                const { mainItem, commands } = effectiveBuild
                logToTerminal(`$ ${mainItem} ${commands.join(' ')}`, 'info')
                const installProcess = await wc.spawn(mainItem, commands)
                installProcess.output.pipeTo(new WritableStream({
                    write(chunk) {
                        chunk.split('\n').filter(Boolean).forEach(line => {
                            if (line.includes('npm warn') || line.includes('npm error')) {
                                logToTerminal(line, line.includes('error') ? 'error' : 'warning')
                            } else if (!line.startsWith('npm')) {
                                logToTerminal(line, 'info')
                            }
                        })
                    }
                }))
                const exitCode = await installProcess.exit
                if (exitCode !== 0) {
                    logToTerminal(`✗ npm install failed (exit ${exitCode})`, 'error')
                    pushNotification('npm install failed — check terminal', 'error', 'Build Error')
                    setIsRunning(false)
                    return
                }
                logToTerminal('✓ Dependencies installed!', 'success')
            }

            // Start the server
            const { mainItem, commands } = effectiveStart
            logToTerminal(`$ ${mainItem} ${commands.join(' ')}`, 'info')
            logToTerminal('⏳ Waiting for server to start...', 'info')
            const startProcess = await wc.spawn(mainItem, commands)

            startProcess.output.pipeTo(new WritableStream({
                write(chunk) {
                    chunk.split('\n').filter(Boolean).forEach(line => {
                        const lower = line.toLowerCase()
                        if (lower.includes('error') || lower.includes('cannot find') || lower.includes('enoent')) {
                            logToTerminal(line, 'error')
                        } else if (lower.includes('warn')) {
                            logToTerminal(line, 'warning')
                        } else {
                            logToTerminal(line, 'info')
                        }
                    })
                }
            }))

            startProcess.exit.then(code => {
                if (code !== 0) {
                    logToTerminal(`✗ Server exited with code ${code}`, 'error')
                    pushNotification('Server crashed — check terminal', 'error', 'Server Error')
                    setIsRunning(false)
                }
            })

            // server-ready event — attach only once
            if (!serverReadyListenerRef.current) {
                serverReadyListenerRef.current = true
                wc.on('server-ready', (port, url) => {
                    logToTerminal(`🚀 Server running on port ${port}`, 'success')
                    logToTerminal(`🌐 Preview: ${url}`, 'success')
                    setPreviewUrl(url)
                    setIsRunning(false)
                    pushNotification(`Server ready on port ${port}`, 'success', '🚀 Server Running')
                })
            }

            // Fallback: unlock Run button after 60s if server-ready never fires
            setTimeout(() => setIsRunning(false), 60000)

        } catch (err) {
            logToTerminal(`✗ WebContainer Error: ${err.message}`, 'error')
            pushNotification(err.message, 'error', 'WebContainer Error')
            console.error('WebContainer error:', err)
            setIsRunning(false)
        }
    }, [isRunning, fileTree, runMeta, logToTerminal, pushNotification, bootShell, setIsTerminalOpen, terminalInputRef])

    return {
        isRunning,
        previewUrl, setPreviewUrl,
        runMeta, setRunMeta,
        shellWriterRef,
        runProject,
        sendTerminalCommand,
    }
}
