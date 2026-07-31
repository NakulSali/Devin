import React from 'react'
import { getFileIcon } from '../../utils/project/treeHelpers'

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

    const isExpanded = expandedFolders.has(fullPath)
    const children   = Object.entries(node).filter(([k]) => !k.startsWith('__'))

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

export default FileTreeNode
