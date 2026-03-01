import { useState, useEffect } from 'react'
import { getImpColor } from './MemoryCard'

const IMP_LABELS = {
  1: '极低', 2: '很低', 3: '低', 4: '稍低',
  5: '中等', 6: '偏高', 7: '高', 8: '很高',
  9: '极高', 10: '最高',
}

export default function MemoryModal({ open, memory, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [importance, setImportance] = useState(5)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(memory?.title || '')
      setContent(memory?.content || '')
      setImportance(memory?.importance || 5)
    }
  }, [open, memory])

  if (!open) return null

  const color = getImpColor(importance)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    setSaving(true)
    try {
      await onSave({ title: title.trim(), content: content.trim(), importance })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="slide-up bg-white rounded-xl w-full max-w-lg shadow-2xl">
        {/* 头 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mg-border">
          <h2 className="text-base font-medium text-mg-text">
            {memory ? '编辑记忆' : '新建记忆'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-mg-input-bg text-mg-text-muted hover:text-mg-text transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* 标题 */}
          <div>
            <label className="text-xs text-mg-text-muted mb-1 block">标题（可选）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="为这条记忆起个标题…"
              className="w-full px-3 py-2 text-sm border border-mg-border rounded-lg focus:outline-none focus:border-mg-text-muted bg-mg-input-bg placeholder-mg-text-muted"
            />
          </div>

          {/* 内容 */}
          <div>
            <label className="text-xs text-mg-text-muted mb-1 block">内容 *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="记录你想记住的内容…"
              rows={5}
              required
              className="w-full px-3 py-2 text-sm border border-mg-border rounded-lg focus:outline-none focus:border-mg-text-muted bg-mg-input-bg resize-y placeholder-mg-text-muted"
            />
          </div>

          {/* 重要度 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-mg-text-muted">重要等级</label>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-mono w-6 h-6 flex items-center justify-center rounded font-medium"
                  style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
                >
                  {importance}
                </span>
                <span className="text-xs text-mg-text-muted">{IMP_LABELS[importance]}</span>
              </div>
            </div>
            <input
              type="range"
              min="1" max="10"
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${color} 0%, ${color} ${(importance - 1) / 9 * 100}%, #E5E7EB ${(importance - 1) / 9 * 100}%, #E5E7EB 100%)`,
                accentColor: color,
              }}
            />
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-mg-text-secondary hover:text-mg-text hover:bg-mg-input-bg rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="px-5 py-2 text-sm bg-mg-black text-white rounded-lg hover:bg-black transition-colors disabled:opacity-40"
            >
              {saving ? '保存中…' : memory ? '保存更改' : '创建记忆'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
