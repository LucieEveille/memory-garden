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
              <div className="w-7 h-7 bg-mg-black rounded-lg flex items-center justify-center text-white text-xs">🧠</div>
              <span className="text-sm font-medium text-mg-text hidden sm:inline">记忆花园</span>
            </div>

            {/* 搜索 */}
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mg-text-muted text-xs">🔍</span>
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
              className={`flex items-center gap-1 px-2.5 py-2 text-xs rounded-lg border transition-colors flex-shrink-0 ${
                selectionMode ? '' : 'hover:bg-mg-input-bg hover:border-mg-border-hover hover:text-mg-text'
              }`}
              style={{
                borderColor: selectionMode ? '#111827' : undefined,
                color: selectionMode ? '#111827' : '#6B7280',
                backgroundColor: selectionMode ? '#F3F4F6' : undefined,
                fontWeight: selectionMode ? 600 : 400,
              }}
            >
              {selectionMode ? '退出' : '多选'}
            </button>

            {/* 设置 */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-mg-border text-mg-text-muted hover:text-mg-text hover:bg-mg-input-bg hover:border-mg-border-hover transition-colors flex-shrink-0"
            >
              ⚙
            </button>

            {/* 新建 */}
            <button
              onClick={openCreate}
              className="flex items-center gap-1 px-3 py-2 text-xs bg-mg-black text-white rounded-lg hover:bg-gray-800 active:bg-black transition-colors flex-shrink-0"
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
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors whitespace-nowrap ${
                  filterImp === null && !impDropdownOpen ? 'hover:bg-mg-input-bg hover:text-mg-text-secondary' : ''
                }`}
                style={{
                  color: filterImp !== null
                    ? (FILTER_TABS.find(t => t.value === filterImp)?.color ?? '#111827')
                    : '#9CA3AF',
                  backgroundColor: filterImp !== null
                    ? `${FILTER_TABS.find(t => t.value === filterImp)?.color ?? '#111827'}12`
                    : impDropdownOpen ? '#F3F4F6' : 'transparent',
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
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-mg-input-bg"
                        style={{
                          color: active ? (tab.color ?? '#111827') : '#6B7280',
                          backgroundColor: active ? '#F9FAFB' : 'transparent',
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
          <div className="flex items-center gap-2 mb-3">
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
