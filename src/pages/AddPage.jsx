import { useState } from 'react'
import { addMemory } from '../api'

export default function AddPage() {
  const [content, setContent] = useState('')
  const [importance, setImportance] = useState(5)
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) return
    
    setSubmitting(true)
    try {
      await addMemory(content.trim(), importance)
      setMessage({ type: 'success', text: '记忆已添加 🌿' })
      setContent('')
      setImportance(5)
    } catch (e) {
      setMessage({ type: 'error', text: '添加失败: ' + e.message })
    } finally {
      setSubmitting(false)
    }
  }

  // 消息自动消失
  if (message) {
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="space-y-5">
      {/* 消息提示 */}
      {message && (
        <div className={`fade-in px-4 py-2.5 rounded-lg text-sm ${
          message.type === 'error'
            ? 'bg-palace-danger-light text-palace-danger'
            : 'bg-palace-success-light text-palace-success'
        }`}>
          {message.text}
        </div>
      )}

      {/* 输入区域 */}
      <div className="bg-white/70 rounded-lg border border-palace-border p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-palace-text-light mb-2">记忆内容</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={5}
            placeholder="写下要记住的内容…"
            className="w-full px-4 py-3 text-sm bg-palace-cream/50 border border-palace-border rounded-lg
              text-palace-text placeholder:text-palace-text-muted/50
              focus:outline-none focus:border-palace-gold resize-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-palace-text-light mb-2">
            重要度
            <span className="ml-2 text-palace-gold-dark font-semibold">{importance}</span>
          </label>
          <input
            type="range"
            min="1" max="10"
            value={importance}
            onChange={e => setImportance(Number(e.target.value))}
            className="w-full accent-palace-gold"
          />
          <div className="flex justify-between text-xs text-palace-text-muted mt-1">
            <span>1 低</span>
            <span>10 高</span>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
          className="w-full py-2.5 text-sm bg-palace-gold text-white rounded-lg 
            hover:bg-palace-gold-dark transition-colors
            disabled:bg-palace-border disabled:text-palace-text-muted disabled:cursor-not-allowed"
        >
          {submitting ? '添加中…' : '✨ 添加记忆'}
        </button>
      </div>

      {/* 提示 */}
      <div className="text-center text-xs text-palace-text-muted space-y-1">
        <p>手动添加的记忆会立即生效</p>
        <p>AI 对话中提取的记忆会自动存入</p>
      </div>
    </div>
  )
}
