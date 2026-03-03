import { useState, useEffect, useMemo, useRef } from 'react'
import { fetchMemories, addMemory, updateMemory, deleteMemory, deleteMemories } from './api'
import MemoryCard from './components/MemoryCard'
import MemoryModal from './components/MemoryModal'
import BatchToolbar from './components/BatchToolbar'
import SettingsModal from './components/SettingsModal'
import DateRangePicker from './components/DateRangePicker'

// 排序切换按钮组
const SORT_GROUPS = [
  { key: 'no',         label: '序号',   asc: 'no-asc',         desc: 'no-desc' },
  { key: 'importance', label: '重要度', asc: 'importance-asc', desc: 'importance-desc' },
  { key: 'time',       label: '时间',   asc: 'time-asc',       desc: 'time-desc' },
]

// 重要度过滤 tabs
const FILTER_TABS = [
  { value: null, label: '全部' },
  { value: 1,    label: '1-4',  color: '#22c55e' },
  { value: 5,    label: '5-6',  color: '#3b82f6' },
  { value: 7,    label: '7-8',  color: '#a855f7' },
  { value: 9,    label: '9-10', color: '#f97316' },
]

function sortList(list, sortBy) {
  const sorted = [...list]
  switch (sortBy) {
    case 'no-desc':         return sorted.reverse()
    case 'importance-desc': return sorted.sort((a, b) => b.importance - a.importance)
    case 'importance-asc':  return sorted.sort((a, b) => a.importance - b.importance)
    case 'time-desc':       return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    case 'time-asc':        return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    default:                return sorted // no-asc = 默认序号正序
  }
}

export default function App() {
  // 数据
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)

  // UI 状态
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('no-asc')
  const [filterImp, setFilterImp] = useState(null)
  const [dateStart, setDateStart] = useState(null)
  const [dateEnd, setDateEnd] = useState(null)
  const [impDropdownOpen, setImpDropdownOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState(null)
  const impDropdownRef = useRef(null)

  // 加载
  const loadMemories = async () => {
    setLoading(true)
    try {
      const data = await fetchMemories(500)
      setMemories(data.results || [])
    } catch (e) {
      showToast('加载失败: ' + e.message, false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMemories() }, [])

  // toast 自动消失
  const showToast = (text, ok = true) => setToast({ text, ok })
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(t)
    }
  }, [toast])

  // 重要度下拉菜单 - 点击外部关闭
  useEffect(() => {
    if (!impDropdownOpen) return
    const handler = (e) => {
      if (impDropdownRef.current && !impDropdownRef.current.contains(e.target)) {
        setImpDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [impDropdownOpen])

  // 过滤 + 排序
  const filtered = useMemo(() => {
    let list = memories

    // 搜索
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.content.toLowerCase().includes(q) ||
        (m.title && m.title.toLowerCase().includes(q))
      )
    }

    // 重要度过滤
    if (filterImp !== null) {
      list = list.filter(m => {
        if (filterImp === 1) return m.importance <= 4
        if (filterImp === 5) return m.importance >= 5 && m.importance <= 6
        if (filterImp === 7) return m.importance >= 7 && m.importance <= 8
        if (filterImp === 9) return m.importance >= 9
        return true
      })
    }

    // 日期范围过滤
    if (dateStart) {
      const startTime = new Date(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate()).getTime()
      const endTime = dateEnd
        ? new Date(dateEnd.getFullYear(), dateEnd.getMonth(), dateEnd.getDate(), 23, 59, 59, 999).getTime()
        : new Date(dateStart.getFullYear(), dateStart.getMonth(), dateStart.getDate(), 23, 59, 59, 999).getTime()
      list = list.filter(m => {
        if (!m.created_at) return false
        const t = new Date(m.created_at).getTime()
        return t >= startTime && t <= endTime
      })
    }

    return sortList(list, sortBy)
  }, [memories, search, filterImp, dateStart, dateEnd, sortBy])

  // 每档数量（用于 tabs 显示）
  const counts = useMemo(() => ({
    all: memories.length,
    g: memories.filter(m => m.importance <= 4).length,
    b: memories.filter(m => m.importance >= 5 && m.importance <= 6).length,
    p: memories.filter(m => m.importance >= 7 && m.importance <= 8).length,
    o: memories.filter(m => m.importance >= 9).length,
  }), [memories])
  const countKeys = [counts.all, counts.g, counts.b, counts.p, counts.o]

  // ── 操作 ──

  const handleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(m => m.id)))
    }
  }

  const exitSelection = () => {
    setSelectionMode(false)
    setSelected(new Set())
  }

  const openCreate = () => {
    setEditTarget(null)
    setModalOpen(true)
  }

  const openEdit = (m) => {
    setEditTarget(m)
    setModalOpen(true)
  }

  const handleSave = async ({ title, content, importance }) => {
    try {
      if (editTarget) {
        await updateMemory(editTarget.id, content, importance, title)
        setMemories(prev => prev.map(m =>
          m.id === editTarget.id
            ? { ...m, content, importance, title }
            : m
        ))
        showToast('已更新')
      } else {
        const res = await addMemory(content, importance, title)
        // 本地追加，用返回数据或构造临时对象
        const newMem = res.memory || {
          id: res.id || Date.now(),
          content, importance, title,
          created_at: new Date().toISOString(),
        }
        setMemories(prev => [newMem, ...prev])
        showToast('已创建')
      }
      setModalOpen(false)
      setEditTarget(null)
    } catch (e) {
      showToast(e.message, false)
    }
  }

  const handleDeleteOne = (id) => setConfirmDelete([id])

  const handleBatchDelete = () => setConfirmDelete([...selected])

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return
    try {
      const { success, failed } = await deleteMemories(confirmDelete)
      showToast(`删除完成：成功 ${success} 条${failed > 0 ? `，失败 ${failed} 条` : ''}`, failed === 0)
      // 本地移除
      const deleteSet = new Set(confirmDelete)
      setMemories(prev => prev.filter(m => !deleteSet.has(m.id)))
      setSelected(prev => {
        const next = new Set(prev)
        confirmDelete.forEach(id => next.delete(id))
        return next
      })
    } catch {
      showToast('删除失败', false)
    }
    setConfirmDelete(null)
  }

  const handleBatchImportance = async (level) => {
    try {
      const ids = [...selected]
      await Promise.all(ids.map(id => {
        const m = memories.find(mem => mem.id === id)
        if (m) return updateMemory(id, m.content, level, m.title)
      }))
      // 本地更新
      const idSet = new Set(ids)
      setMemories(prev => prev.map(m =>
        idSet.has(m.id) ? { ...m, importance: level } : m
      ))
      showToast(`已将 ${ids.length} 条记忆设为等级 ${level}`)
      setSelected(new Set())
    } catch {
      showToast('操作失败', false)
    }
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length

  return (
    <div className="min-h-screen bg-mg-bg">
      {/* ══ 顶栏 ══ */}
      <header className="bg-white border-b border-mg-border sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4">
          {/* 第一行：标题 + 操作 */}
          <div className="flex items-center gap-3 py-3">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <img src="data:image/png;base64,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" alt="记忆花园" className="w-7 h-7 rounded-lg border border-mg-border-hover p-0.5" />
              <span className="text-sm font-medium text-mg-text hidden sm:inline">记忆花园</span>
            </div>

            {/* 搜索 */}
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mg-text-muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索…"
                className="w-full pl-8 pr-8 py-2 text-sm bg-mg-input-bg border border-transparent rounded-lg focus:outline-none focus:border-mg-border-hover focus:bg-white transition-colors placeholder-mg-text-muted"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mg-text-muted hover:text-mg-text text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 多选 */}
            <button
              onClick={selectionMode ? exitSelection : () => setSelectionMode(true)}
              className={`h-8 flex items-center gap-1 px-2.5 text-xs rounded-lg border transition-colors flex-shrink-0 ${
                selectionMode
                  ? 'border-mg-black text-mg-text bg-mg-input-bg font-medium'
                  : 'border-mg-border text-mg-text-muted hover:text-mg-text hover:bg-mg-input-bg hover:border-mg-border-hover'
              }`}
            >
              {selectionMode ? '退出' : '多选'}
            </button>

            {/* 设置 */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-mg-border text-mg-text-muted hover:text-mg-text hover:bg-mg-input-bg hover:border-mg-border-hover transition-colors flex-shrink-0"
            >
              ⚙
            </button>

            {/* 新建 */}
            <button
              onClick={openCreate}
              className="h-8 flex items-center gap-1 px-3 text-xs bg-mg-black text-white rounded-lg hover:bg-gray-800 active:bg-black transition-colors flex-shrink-0"
            >
              <span>+</span>
              <span className="hidden sm:inline">新建</span>
            </button>
          </div>

          {/* 第二行：排序 + 过滤 */}
          <div className="flex items-center gap-1 pb-2 flex-wrap">
            {/* 排序 */}
            {SORT_GROUPS.map(g => {
              const isActive = sortBy === g.asc || sortBy === g.desc
              const isDesc = sortBy === g.desc
              const handleClick = () => {
                if (!isActive) setSortBy(g.asc)
                else setSortBy(isDesc ? g.asc : g.desc)
              }
              return (
                <button
                  key={g.key}
                  onClick={handleClick}
                  className="flex items-center gap-0.5 px-2 py-1 text-xs rounded-md transition-colors whitespace-nowrap"
                  style={{
                    color: isActive ? '#111827' : '#9CA3AF',
                    backgroundColor: isActive ? '#F3F4F6' : 'transparent',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {g.label}
                  <span style={{ opacity: isActive ? 1 : 0.3, fontSize: '0.65rem' }}>
                    {isActive ? (isDesc ? '↓' : '↑') : '↕'}
                  </span>
                </button>
              )
            })}

            <div className="w-px h-3.5 bg-mg-border mx-1 flex-shrink-0" />

            {/* 重要度下拉筛选 */}
            <div className="relative" ref={impDropdownRef}>
              <button
                onClick={() => setImpDropdownOpen(v => !v)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors whitespace-nowrap hover-gray"
                style={{
                  color: filterImp !== null
                    ? (FILTER_TABS.find(t => t.value === filterImp)?.color ?? '#111827')
                    : '#9CA3AF',
                  backgroundColor: filterImp !== null
                    ? `${FILTER_TABS.find(t => t.value === filterImp)?.color ?? '#111827'}12`
                    : impDropdownOpen ? '#F3F4F6' : undefined,
                  fontWeight: filterImp !== null ? 600 : 400,
                }}
              >
                {filterImp !== null && (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: FILTER_TABS.find(t => t.value === filterImp)?.color }}
                  />
                )}
                {filterImp !== null
                  ? FILTER_TABS.find(t => t.value === filterImp)?.label
                  : '重要度'}
                <span style={{ fontSize: '0.6rem', opacity: 0.6, marginLeft: '1px' }}>
                  {impDropdownOpen ? '▲' : '▼'}
                </span>
              </button>

              {impDropdownOpen && (
                <div
                  className="absolute left-0 top-full mt-1 z-50 bg-white border border-mg-border rounded-lg shadow-lg py-1 min-w-[120px]"
                  style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                >
                  {FILTER_TABS.map((tab, i) => {
                    const active = filterImp === tab.value
                    return (
                      <button
                        key={String(tab.value)}
                        onClick={() => {
                          setFilterImp(tab.value)
                          setImpDropdownOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover-gray"
                        style={{
                          color: active ? (tab.color ?? '#111827') : '#6B7280',
                          backgroundColor: active ? '#F9FAFB' : undefined,
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        {tab.color ? (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tab.color }}
                          />
                        ) : (
                          <span className="w-2 h-2 flex-shrink-0" />
                        )}
                        <span>{tab.label}</span>
                        <span className="ml-auto opacity-40">({countKeys[i]})</span>
                        {active && <span style={{ fontSize: '0.6rem' }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 日历范围筛选 */}
            <DateRangePicker
              startDate={dateStart}
              endDate={dateEnd}
              onChange={(s, e) => { setDateStart(s); setDateEnd(e) }}
            />
          </div>
        </div>
      </header>

      {/* ══ Toast ══ */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50">
          <div className={`fade-up px-4 py-2 rounded-lg text-sm shadow-lg ${toast.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
            {toast.text}
          </div>
        </div>
      )}

      {/* ══ 主区域 ══ */}
      <main className="max-w-2xl mx-auto px-4 py-5 pb-24">
        {/* 全选行 */}
        {selectionMode && filtered.length > 0 && (
          <div className="flex items-center gap-2 mb-3" style={{ paddingLeft: '17px' }}>
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-xs text-mg-text-muted hover:text-mg-text transition-colors"
            >
              <span
                className="w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0"
                style={{
                  borderColor: allSelected ? '#111827' : '#D1D5DB',
                  backgroundColor: allSelected ? '#111827' : 'transparent',
                }}
              >
                {allSelected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              全选
            </button>
            <span className="text-xs text-mg-text-muted">
              共 {filtered.length} 条
              {search && <span className="ml-1">（搜索：{search}）</span>}
            </span>
          </div>
        )}

        {/* 记忆列表 */}
        {loading ? (
          <div className="text-center py-20 text-mg-text-muted">
            <div className="text-2xl mb-2">🧠</div>
            <span className="text-sm">加载中…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-mg-text-muted">
            <div className="text-2xl mb-2">🍃</div>
            <p className="text-sm">
              {search ? `未找到包含"${search}"的记忆` : '还没有记忆'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((m, i) => (
              <MemoryCard
                key={m.id}
                memory={m}
                index={i + 1}
                selectionMode={selectionMode}
                selected={selected.has(m.id)}
                onSelect={handleSelect}
                onEdit={openEdit}
                onDelete={handleDeleteOne}
              />
            ))}
          </div>
        )}
      </main>

      {/* ══ 浮动批量栏 ══ */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <BatchToolbar
            count={selected.size}
            onClear={exitSelection}
            onDelete={handleBatchDelete}
            onSetImportance={handleBatchImportance}
          />
        </div>
      )}

      {/* ══ 新建/编辑弹窗 ══ */}
      <MemoryModal
        open={modalOpen}
        memory={editTarget}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        onSave={handleSave}
      />

      {/* ══ 设置弹窗 ══ */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* ══ 删除确认 ══ */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
        >
          <div className="slide-up bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-medium text-mg-text mb-2">确认删除</h3>
            <p className="text-sm text-mg-text-secondary mb-5">
              {confirmDelete.length === 1
                ? '确定要删除这条记忆吗？此操作不可撤销。'
                : `确定要删除选中的 ${confirmDelete.length} 条记忆吗？此操作不可撤销。`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-mg-text-secondary hover:bg-mg-input-bg rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDeleteAction}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
