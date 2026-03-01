import { useState, useEffect } from 'react'
import { fetchMemories, updateMemory, deleteMemory, deleteMemories } from '../api'
import MemoryCard from '../components/MemoryCard'

const SORT_OPTIONS = [
  { value: 'time_desc', label: '时间 新→旧' },
  { value: 'time_asc', label: '时间 旧→新' },
  { value: 'importance_desc', label: '重要度 高→低' },
  { value: 'importance_asc', label: '重要度 低→高' },
]

function sortMemories(memories, sort) {
  const sorted = [...memories]
  switch (sort) {
    case 'time_asc':
      return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    case 'importance_desc':
      return sorted.sort((a, b) => b.importance - a.importance)
    case 'importance_asc':
      return sorted.sort((a, b) => a.importance - b.importance)
    case 'time_desc':
    default:
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
}

export default function BrowsePage() {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('time_desc')
  const [editMode, setEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [message, setMessage] = useState(null)

  const loadMemories = async () => {
    setLoading(true)
    try {
      const data = await fetchMemories(500)
      setMemories(data.results || [])
    } catch (e) {
      setMessage({ type: 'error', text: '加载失败: ' + e.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMemories() }, [])

  // 消息自动消失
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const sortedMemories = sortMemories(memories, sort)

  const isAllSelected = sortedMemories.length > 0 && selectedIds.size === sortedMemories.length

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedMemories.map(m => m.id)))
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条记忆吗？此操作不可撤销。`)) return
    
    const { success, failed } = await deleteMemories([...selectedIds])
    setMessage({ 
      type: failed > 0 ? 'error' : 'success', 
      text: `删除完成：成功 ${success} 条${failed > 0 ? `，失败 ${failed} 条` : ''}` 
    })
    setSelectedIds(new Set())
    loadMemories()
  }

  const handleEdit = async (id, content, importance) => {
    try {
      await updateMemory(id, content, importance)
      setMessage({ type: 'success', text: '已更新' })
      loadMemories()
    } catch (e) {
      setMessage({ type: 'error', text: '更新失败' })
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除这条记忆吗？')) return
    try {
      await deleteMemory(id)
      setMessage({ type: 'success', text: '已删除' })
      loadMemories()
    } catch (e) {
      setMessage({ type: 'error', text: '删除失败' })
    }
  }

  const exitEditMode = () => {
    setEditMode(false)
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-4">
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

      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select 
            value={sort} 
            onChange={e => setSort(e.target.value)}
            className="text-sm px-3 py-1.5 bg-white/70 border border-palace-border rounded-lg 
              text-palace-text focus:outline-none focus:border-palace-gold"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <span className="text-xs text-palace-text-muted">{sortedMemories.length} 条</span>
        </div>

        <button 
          onClick={editMode ? exitEditMode : () => setEditMode(true)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            editMode
              ? 'bg-palace-gold text-white border-palace-gold'
              : 'bg-white/70 text-palace-text-light border-palace-border hover:border-palace-gold'
          }`}
        >
          {editMode ? '完成' : '编辑'}
        </button>
      </div>

      {/* 批量操作浮动栏 */}
      {editMode && (
        <div className="fade-in flex items-center justify-between px-4 py-2.5 bg-palace-warm rounded-lg border border-palace-gold-light">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={handleSelectAll}
              className="w-4 h-4 accent-palace-gold"
            />
            <span className="text-sm text-palace-gold-dark">
              {isAllSelected ? '取消全选' : '全选'}
            </span>
          </label>
          <div className="flex items-center gap-3">
            <span className="text-sm text-palace-text-muted">
              已选 <strong className="text-palace-gold-dark">{selectedIds.size}</strong> 条
            </span>
            <button 
              onClick={handleBatchDelete}
              disabled={selectedIds.size === 0}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedIds.size > 0
                  ? 'bg-palace-danger text-white hover:bg-palace-danger/80'
                  : 'bg-palace-border text-palace-text-muted cursor-not-allowed'
              }`}
            >
              删除
            </button>
          </div>
        </div>
      )}

      {/* 记忆列表 */}
      {loading ? (
        <div className="text-center py-12 text-palace-text-muted">
          <div className="text-2xl mb-2">🌿</div>
          加载中…
        </div>
      ) : sortedMemories.length === 0 ? (
        <div className="text-center py-12 text-palace-text-muted">
          <div className="text-2xl mb-2">🍃</div>
          还没有记忆
        </div>
      ) : (
        <div className="space-y-3">
          {sortedMemories.map((mem, index) => (
            <MemoryCard
              key={mem.id}
              memory={mem}
              index={index + 1}
              editMode={editMode}
              selected={selectedIds.has(mem.id)}
              onToggleSelect={handleToggleSelect}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
