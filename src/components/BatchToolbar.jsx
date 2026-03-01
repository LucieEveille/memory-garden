import { getImpColor } from './MemoryCard'
import { useState, useRef, useEffect } from 'react'

export default function BatchToolbar({ count, onClear, onDelete, onSetImportance }) {
  const [impOpen, setImpOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!impOpen) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setImpOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [impOpen])

  return (
    <div
      className="slide-up flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-900 text-white"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
    >
      {/* 关闭 */}
      <button
        onClick={onClear}
        className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 transition-colors flex-shrink-0 text-xs"
      >
        ✕
      </button>

      <span className="text-sm text-gray-300">
        已选 <span className="text-white font-mono">{count}</span> 条
      </span>

      <div className="w-px h-4 bg-gray-700" />

      {/* 批量改重要度 */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setImpOpen(v => !v)}
          className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
        >
          调整等级
          <span className="text-xs">{impOpen ? '▲' : '▼'}</span>
        </button>
        {impOpen && (
          <div
            className="absolute bottom-9 left-0 z-50 bg-white rounded-xl shadow-xl border border-gray-100 p-2"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)', minWidth: 160 }}
          >
            <div className="text-xs text-gray-400 px-2 py-1 mb-1">选择等级</div>
            <div className="grid grid-cols-5 gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map(level => {
                const c = getImpColor(level)
                return (
                  <button
                    key={level}
                    onClick={() => { onSetImportance(level); setImpOpen(false) }}
                    className="w-8 h-8 rounded-lg text-xs font-mono flex items-center justify-center transition-all hover:scale-110"
                    style={{ color: c, backgroundColor: `${c}15`, border: `1px solid ${c}30` }}
                  >
                    {level}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-gray-700" />

      {/* 批量删除 */}
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
      >
        删除
      </button>
    </div>
  )
}
