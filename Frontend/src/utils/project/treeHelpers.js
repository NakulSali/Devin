// ── Tree & file utility helpers ───────────────────────────────────────────────

/** Convert flat { "routes/api.js": {...} } into nested tree for the explorer */
export function buildNestedTree(fileTree) {
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
export function getFileIcon(name) {
    const ext = (name.split('.').pop() || '').toLowerCase()
    const map = {
        js:   { icon: 'ri-javascript-line',  color: '#f59e0b' },
        jsx:  { icon: 'ri-reactjs-line',      color: '#61dafb' },
        ts:   { icon: 'ri-file-code-line',    color: '#3b82f6' },
        tsx:  { icon: 'ri-reactjs-line',      color: '#61dafb' },
        json: { icon: 'ri-file-list-line',    color: '#f59e0b' },
        css:  { icon: 'ri-css3-line',         color: '#06b6d4' },
        html: { icon: 'ri-html5-line',        color: '#f97316' },
        md:   { icon: 'ri-markdown-line',     color: '#a78bfa' },
        env:  { icon: 'ri-settings-4-line',   color: '#10b981' },
        sh:   { icon: 'ri-terminal-line',     color: '#10b981' },
    }
    return map[ext] || { icon: 'ri-file-code-line', color: '#a78bfa' }
}

/**
 * Convert flat fileTree { "routes/api.js": { file: { contents } } }
 * into WebContainer nested format:
 * { routes: { directory: { "api.js": { file: { contents } } } } }
 */
export function flatToWebContainerTree(fileTree) {
    const root = {}
    Object.entries(fileTree).forEach(([path, value]) => {
        const parts = path.split('/')
        let node = root
        parts.forEach((part, i) => {
            if (i === parts.length - 1) {
                node[part] = { file: { contents: value?.file?.contents ?? '' } }
            } else {
                if (!node[part]) node[part] = { directory: {} }
                node = node[part].directory
            }
        })
    })
    return root
}

/** Count lines in a string */
export function countLines(str) {
    return str ? str.split('\n').length : 0
}
