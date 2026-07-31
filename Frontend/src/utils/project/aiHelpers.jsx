import React from 'react'
import Markdown from 'markdown-to-jsx'

/** Strip markdown fences that AI may wrap around JSON */
export function cleanAIJson(raw) {
    return raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()
}

/** Render an AI message bubble — extracts .text from JSON, falls back to raw */
export function WriteAiMessage(rawMessage) {
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
