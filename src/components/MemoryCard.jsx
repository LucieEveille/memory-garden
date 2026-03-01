import { useState } from 'react'

export default function MemoryCard({ memory, index, editMode, selected, onToggleSelect, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(memory.content)
  const [importance, setImportance] = useState(memory.importance)

  const handleSave = () => {
    onEdit(memory.id, content, importance)
    setEditing(false)
  }

  const handleCancel = () => {
    setContent(memory.content)
    setImportance(memory.importance)
    setEditing(false)
  }

  const dateStr = memory.created_at
    ? new Date(memory.created_at).toLocaleDateString('zh-CN', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    : ''

  return (
    <div className={`
      bg-white/70 rounded-lg border transition-all duration-200 relative
      ${selected ? 'border-palace-gold shadow-md' : 'border-palace-border'}
      ${!editMode && 'card-hover'}
    `}>
      {/* 右上角序号 */}
      {index && (
        <span className="absolute top-2.5 right-3.5 text-xs text-palace-gold/60 font-serif">
          No.{index}
        </span>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* 编辑模式下的复选框 */}
          {editMode && (
            <label className="flex-shrink-0 mt-0.5 cursor-pointer">
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect(memory.id)}
                className="w-4 h-4 accent-palace-gold"
              />
            </label>
          )}

          <div className="flex-1 min-w-0">
            {editing ? (
              /* 编辑状态 */
              <div className="space-y-3 fade-in">
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-palace-cream border border-palace-border rounded-lg 
                    focus:outline-none focus:border-palace-gold resize-none text-palace-text"
                />
                <div className="flex items-center gap-3">
                  <label className="text-xs text-palace-text-muted">重要度</label>
                  <input
                    type="range"
                    min="1" max="10"
                    value={importance}
                    onChange={e => setImportance(Number(e.target.value))}
                    className="flex-1 accent-palace-gold"
                  />
                  <span className="text-sm font-medium text-palace-gold-dark w-6 text-center">{importance}</span>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={handleCancel}
                    className="px-3 py-1.5 text-xs text-palace-text-muted border border-palace-border rounded-md hover:bg-palace-warm transition-colors">
                    取消
                  </button>
                  <button onClick={handleSave}
                    className="px-3 py-1.5 text-xs text-white bg-palace-gold rounded-md hover:bg-palace-gold-dark transition-colors">
                    保存
                  </button>
                </div>
              </div>
            ) : (
              /* 展示状态 */
              <>
                <p className="text-sm leading-relaxed text-palace-text break-words mt-1">{memory.content}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3 text-xs text-palace-text-muted">
                    <span>{dateStr}</span>
                    <span>⭐ {memory.importance}</span>
                    <span className="opacity-30">#{memory.id}</span>
                  </div>
                  {!editMode && (
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditing(true)}
                        className="px-2.5 py-1 text-xs rounded-md border border-transparent
                          text-palace-text-light hover:text-palace-gold-dark hover:bg-palace-warm hover:border-palace-gold-light 
                          transition-all">
                        ✏️ 编辑
                      </button>
                      <button onClick={() => onDelete(memory.id)}
                        className="px-2.5 py-1 text-xs rounded-md border border-transparent
                          text-palace-text-muted hover:text-palace-danger hover:bg-palace-danger-light hover:border-palace-danger/20
                          transition-all">
                        🗑️ 删除
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
