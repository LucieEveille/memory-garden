import { useState, useRef, useEffect } from 'react'

// 重要度颜色 (4档: 绿蓝紫橙)
export function getImpColor(level) {
  if (level <= 4) return '#22c55e'
  if (level <= 6) return '#3b82f6'
  if (level <= 8) return '#a855f7'
  return '#f97316'
}

export function getImpBg(level) {
  if (level <= 4) return 'rgba(34,197,94,0.08)'
  if (level <= 6) return 'rgba(59,130,246,0.08)'
  if (level <= 8) return 'rgba(168,85,247,0.08)'
  return 'rgba(249,115,22,0.08)'
}

export default function MemoryCard({ memory, index, selectionMode, selected, onSelect, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const color = getImpColor(memory.importance)
  const bg = getImpBg(memory.importance)

  const dateStr = memory.created_at
    ? new Date(memory.created_at).toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'numeric', day: 'numeric',
      })
    : ''

  return (
    <div
      className="fade-up bg-mg-card border rounded-lg p-4 transition-all duration-150"
      style={{
        borderColor: selected ? '#111827' : '#E5E7EB',
        boxShadow: selected ? '0 0 0 2px #111827' : '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* 顶部行 */}
      <div className="flex items-center gap-2 mb-2">
        {/* 多选checkbox */}
        {selectionMode && (
          <button
            onClick={() => onSelect(memory.id)}
            className="flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors"
            style={{
              borderColor: selected ? '#111827' : '#D1D5DB',
              backgroundColor: selected ? '#111827' : 'transparent',
            }}
          >
            {selected && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}

        {/* 序号 */}
        <span className="text-xs text-mg-text-muted font-mono">
          No.{String(index).padStart(3, '0')}
        </span>

        <div className="flex-1" />

        {/* 重要度 */}
        <span
          className="text-xs px-1.5 py-0.5 rounded font-mono font-medium"
          style={{ color, backgroundColor: bg, border: `1px solid ${color}30` }}
        >
          {memory.importance}
        </span>

        {/* 三点菜单 */}
        {!selectionMode && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-mg-input-bg transition-colors text-mg-text-muted hover:text-mg-text"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5"/>
                <circle cx="12" cy="12" r="1.5"/>
                <circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-7 z-50 bg-white border border-mg-border rounded-lg shadow-lg py-1 min-w-[100px]"
                style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
              >
                <button
                  onClick={() => { setMenuOpen(false); onEdit(memory) }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-mg-text-secondary hover:bg-mg-input-bg transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete(memory.id) }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-imp-red hover:bg-red-50 transition-colors"
                >
                  删除
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 标题 */}
      {memory.title && (
        <h3 className="text-sm font-semibold text-mg-text mb-1">{memory.title}</h3>
      )}

      {/* 内容 */}
      <p className="text-sm text-mg-text-secondary leading-relaxed break-words">
        {memory.content}
      </p>

      {/* 日期 */}
      <div className="mt-2.5 text-xs text-mg-text-muted">{dateStr}</div>
    </div>
  )
}
