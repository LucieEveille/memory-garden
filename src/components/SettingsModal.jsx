import { useState, useEffect, useRef } from 'react'
import { fetchStatus, fetchConfig, updateConfig, importSeeds,
         fetchProviders, createProvider, updateProvider, deleteProvider,
         fetchProviderModels } from '../api'

// ═══════════════════════════════════════
// 侧边栏导航项
// ═══════════════════════════════════════
const NAV_ITEMS = [
  { key: 'providers', icon: '📡', label: '模型服务' },
  { key: 'memory',    icon: '🧠', label: '记忆系统' },
  { key: 'about',     icon: 'ℹ️', label: '关于' },
]

// ═══════════════════════════════════════
// 记忆系统配置项元数据
// ═══════════════════════════════════════
const CONFIG_META = {
  memory_enabled:    { label: '记忆系统',     desc: '总开关',              type: 'toggle' },
  extract_interval:  { label: '提取间隔',     desc: '每 N 轮提取一次',     type: 'number', unit: '轮',
    tip: '每隔多少轮对话后，自动提取一次记忆。数值越小提取越频繁，但会增加 API 调用。推荐 3-5。' },
  max_inject:        { label: '注入条数',     desc: '每次最多注入',         type: 'number', unit: '条',
    tip: '每次对话时，最多从记忆库中取出多少条相关记忆注入到 system prompt。太多会占用上下文窗口，推荐 10-20。' },
  semantic_threshold:{ label: '语义阈值',     desc: '向量搜索最低相似度',   type: 'number', step: 0.05,
    tip: '向量搜索时，相似度低于此值的记忆会被过滤掉。越高越严格（只返回高度相关的），越低越宽松。推荐 0.2-0.35。' },
  dedup_threshold:   { label: '去重阈值',     desc: '记忆去重相似度',       type: 'number', step: 0.05,
    tip: '新提取的记忆与已有记忆的文字重叠度超过此值时，会被判定为重复并丢弃。越高越容易放行（允许更相似的共存），越低越严格。推荐 0.5-0.6。' },
}

// ═══════════════════════════════════════
// 问号帮助气泡
// ═══════════════════════════════════════
function HelpTip({ text }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!show) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShow(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler) }
  }, [show])

  return (
    <span className="relative inline-flex" ref={ref}>
      <button onClick={() => setShow(v => !v)}
        className="w-4 h-4 rounded-full border border-mg-border text-mg-text-muted hover:text-mg-text hover:border-mg-text-muted transition-colors flex items-center justify-center flex-shrink-0"
        style={{ fontSize: '0.6rem', lineHeight: 1 }}>?</button>
      {show && (
        <div className="fade-up absolute left-5 bottom-0 z-50 w-56 px-3 py-2.5 text-xs leading-relaxed text-mg-text bg-white border border-mg-border rounded-lg"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>{text}</div>
      )}
    </span>
  )
}

// ═══════════════════════════════════════
// 供应商面板（三列布局）
// ═══════════════════════════════════════
function ProviderPanel({ msg, setMsg }) {
  const [providers, setProviders] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editDraft, setEditDraft] = useState({})
  const [showKey, setShowKey] = useState(false)
  const [models, setModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelSearch, setModelSearch] = useState('')
  const [saving, setSaving] = useState(false)
  // 手机端三级导航
  const [mobileView, setMobileView] = useState('list') // 'list' | 'detail'

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    setLoading(true)
    try {
      const data = await fetchProviders()
      setProviders(data)
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id)
        initDraft(data[0])
      }
    } catch (e) {
      setMsg({ ok: false, text: '加载供应商失败' })
    } finally {
      setLoading(false)
    }
  }

  const initDraft = (p) => {
    setEditDraft({
      name: p.name || '',
      api_base_url: p.api_base_url || '',
      api_key: p.api_key || '',
      enabled: p.enabled !== false,
    })
    setShowKey(false)
    setModels([])
    setModelSearch('')
  }

  const selected = providers.find(p => p.id === selectedId)

  const handleSelect = (p) => {
    setSelectedId(p.id)
    initDraft(p)
    setMobileView('detail')
  }

  const handleCreate = async () => {
    try {
      const res = await createProvider('新供应商', 'https://openrouter.ai/api/v1', '')
      if (res.provider) {
        setProviders(prev => [...prev, res.provider])
        setSelectedId(res.provider.id)
        initDraft(res.provider)
        setMobileView('detail')
      }
    } catch {
      setMsg({ ok: false, text: '创建失败' })
    }
  }

  const handleSave = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      const res = await updateProvider(selectedId, editDraft)
      if (res.provider) {
        setProviders(prev => prev.map(p => p.id === selectedId ? res.provider : p))
        setMsg({ ok: true, text: '已保存' })
      }
    } catch {
      setMsg({ ok: false, text: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedId || !confirm('确定删除这个供应商？')) return
    try {
      await deleteProvider(selectedId)
      const next = providers.filter(p => p.id !== selectedId)
      setProviders(next)
      if (next.length > 0) {
        setSelectedId(next[0].id)
        initDraft(next[0])
      } else {
        setSelectedId(null)
        setEditDraft({})
      }
      setMobileView('list')
      setMsg({ ok: true, text: '已删除' })
    } catch {
      setMsg({ ok: false, text: '删除失败' })
    }
  }

  const handleFetchModels = async () => {
    if (!selectedId) return
    setModelsLoading(true)
    try {
      const res = await fetchProviderModels(selectedId)
      if (res.models) {
        setModels(res.models)
        setMsg({ ok: true, text: `获取到 ${res.count} 个模型` })
      } else {
        setMsg({ ok: false, text: res.error || '获取失败' })
      }
    } catch {
      setMsg({ ok: false, text: '获取模型失败' })
    } finally {
      setModelsLoading(false)
    }
  }

  const filteredModels = modelSearch
    ? models.filter(m => (m.id || '').toLowerCase().includes(modelSearch.toLowerCase()))
    : models

  // 按供应商前缀分组
  const groupedModels = {}
  filteredModels.forEach(m => {
    const id = m.id || ''
    const slash = id.indexOf('/')
    const group = slash > 0 ? id.substring(0, slash) : '其他'
    if (!groupedModels[group]) groupedModels[group] = []
    groupedModels[group].push(m)
  })

  if (loading) return <div className="flex items-center justify-center h-full text-sm text-mg-text-muted">加载中…</div>

  // ── 手机端：供应商列表 ──
  const listView = (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {providers.map(p => (
          <button key={p.id} onClick={() => handleSelect(p)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors"
            style={{
              backgroundColor: p.id === selectedId ? '#F3F4F6' : 'transparent',
              fontWeight: p.id === selectedId ? 600 : 400,
            }}>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ backgroundColor: p.enabled ? '#111827' : '#9CA3AF' }}>
              {p.name?.charAt(0)?.toUpperCase() || '?'}
            </span>
            <span className="flex-1 text-sm text-mg-text truncate">{p.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded"
              style={{
                color: p.enabled ? '#22c55e' : '#9CA3AF',
                backgroundColor: p.enabled ? 'rgba(34,197,94,0.1)' : 'rgba(156,163,175,0.1)',
              }}>{p.enabled ? '启用' : '停用'}</span>
            {/* 手机端显示箭头 */}
            <span className="sm:hidden text-mg-text-muted text-xs">›</span>
          </button>
        ))}
      </div>
      <div className="p-2 border-t border-mg-border">
        <button onClick={handleCreate}
          className="w-full py-2 text-sm text-mg-text-secondary hover:text-mg-text hover:bg-mg-input-bg rounded-lg transition-colors">
          ＋ 添加供应商
        </button>
      </div>
    </div>
  )

  // ── 供应商详情 ──
  const detailView = selected ? (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* 手机端返回按钮 */}
      <button onClick={() => setMobileView('list')}
        className="sm:hidden flex items-center gap-1 text-sm text-mg-text-secondary hover:text-mg-text mb-2">
        ‹ 返回
      </button>

      {/* 名称 + 启用 */}
      <div className="flex items-center gap-3">
        <input type="text" value={editDraft.name || ''} placeholder="供应商名称"
          onChange={e => setEditDraft(prev => ({ ...prev, name: e.target.value }))}
          className="flex-1 text-base font-medium bg-transparent border-none outline-none text-mg-text placeholder-mg-text-muted" />
        <button onClick={() => setEditDraft(prev => ({ ...prev, enabled: !prev.enabled }))}
          className="w-11 h-6 rounded-full transition-colors relative flex-shrink-0"
          style={{ backgroundColor: editDraft.enabled ? '#111827' : '#D1D5DB' }}>
          <span className="absolute top-0.5 h-5 w-5 bg-white rounded-full shadow transition-all"
            style={{ left: editDraft.enabled ? 'calc(100% - 22px)' : '2px' }} />
        </button>
      </div>

      {/* API Key */}
      <div>
        <label className="text-xs font-medium text-mg-text-secondary mb-1 block">API Key</label>
        <div className="flex items-center gap-2">
          <input type={showKey ? 'text' : 'password'} value={editDraft.api_key || ''} placeholder="sk-..."
            onChange={e => setEditDraft(prev => ({ ...prev, api_key: e.target.value }))}
            className="flex-1 px-3 py-2 text-sm bg-mg-input-bg border border-mg-border rounded-lg focus:outline-none focus:border-mg-text-muted text-mg-text font-mono" />
          <button onClick={() => setShowKey(v => !v)}
            className="px-2 py-2 text-xs text-mg-text-muted hover:text-mg-text transition-colors">
            {showKey ? '🙈' : '👁'}
          </button>
        </div>
      </div>

      {/* API Base URL */}
      <div>
        <label className="text-xs font-medium text-mg-text-secondary mb-1 block">API Base URL</label>
        <input type="text" value={editDraft.api_base_url || ''} placeholder="https://openrouter.ai/api/v1"
          onChange={e => setEditDraft(prev => ({ ...prev, api_base_url: e.target.value }))}
          className="w-full px-3 py-2 text-sm bg-mg-input-bg border border-mg-border rounded-lg focus:outline-none focus:border-mg-text-muted text-mg-text font-mono" />
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 py-2 text-sm bg-mg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40">
          {saving ? '保存中…' : '保存'}
        </button>
        <button onClick={handleDelete}
          className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
          删除
        </button>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-mg-border" />

      {/* 模型列表 */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-mg-text">模型</span>
          {models.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-mg-input-bg rounded text-mg-text-secondary">{models.length}</span>
          )}
          <div className="flex-1" />
          <button onClick={handleFetchModels} disabled={modelsLoading}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border border-mg-border rounded-lg text-mg-text-secondary hover:text-mg-text hover:bg-mg-input-bg transition-colors disabled:opacity-40">
            {modelsLoading ? '获取中…' : '🔄 获取模型'}
          </button>
        </div>

        {models.length > 0 && (
          <>
            {/* 搜索 */}
            <div className="relative mb-3">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mg-text-muted text-xs">🔍</span>
              <input type="text" value={modelSearch} onChange={e => setModelSearch(e.target.value)}
                placeholder="搜索模型 ID…"
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-mg-input-bg border border-mg-border rounded-lg focus:outline-none focus:border-mg-text-muted text-mg-text placeholder-mg-text-muted" />
            </div>

            {/* 分组列表 */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(groupedModels).map(([group, list]) => (
                <div key={group}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-mg-text-secondary">{group}</span>
                    <span className="text-xs text-mg-text-muted">({list.length})</span>
                  </div>
                  <div className="space-y-0.5">
                    {list.map(m => (
                      <div key={m.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-mg-input-bg transition-colors group">
                        <span className="text-xs text-mg-text flex-1 truncate font-mono">{m.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {models.length === 0 && !modelsLoading && (
          <p className="text-xs text-mg-text-muted text-center py-4">
            点击「获取模型」从供应商 API 加载可用模型
          </p>
        )}
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full text-sm text-mg-text-muted">
      {providers.length === 0 ? '点击下方添加你的第一个供应商' : '选择一个供应商查看详情'}
    </div>
  )

  // ── PC端三列布局 / 手机端切换 ──
  return (
    <div className="flex h-full">
      {/* 供应商列表 - PC 常驻，手机端条件显示 */}
      <div className={`border-r border-mg-border flex-shrink-0 ${
        mobileView === 'list' ? 'w-full sm:w-56' : 'hidden sm:block sm:w-56'
      }`} style={{ minHeight: 0 }}>
        {listView}
      </div>
      {/* 详情 - PC 常驻，手机端条件显示 */}
      <div className={`flex-1 min-w-0 ${
        mobileView === 'detail' ? 'block' : 'hidden sm:block'
      }`} style={{ minHeight: 0 }}>
        {detailView}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// 记忆系统面板
// ═══════════════════════════════════════
function MemoryPanel({ msg, setMsg }) {
  const [config, setConfig] = useState(null)
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConfig().then(c => {
      setConfig(c)
      const d = {}
      Object.keys(c).forEach(k => { d[k] = c[k]?.value ?? '' })
      setDraft(d)
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const [key, val] of Object.entries(draft)) {
        if (config[key] && String(config[key].value) !== String(val)) {
          await updateConfig(key, val)
        }
      }
      setMsg({ ok: true, text: '配置已保存' })
      const c = await fetchConfig()
      setConfig(c)
    } catch {
      setMsg({ ok: false, text: '保存失败' })
    } finally {
      setSaving(false)
    }
  }

  const handleImport = async () => {
    if (!confirm('确定导入种子记忆？')) return
    try {
      await importSeeds()
      setMsg({ ok: true, text: '导入成功' })
    } catch {
      setMsg({ ok: false, text: '导入失败' })
    }
  }

  return (
    <div className="p-5 space-y-6 overflow-y-auto h-full">
      <h3 className="text-base font-medium text-mg-text">🧠 记忆系统</h3>

      {config ? (
        <div className="space-y-3">
          {Object.entries(CONFIG_META).map(([key, meta]) => {
            const item = config[key]
            if (!item) return null
            return (
              <div key={key} className="flex items-center justify-between py-1">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-mg-text">{meta.label}</span>
                  <p className="text-xs text-mg-text-muted mt-0.5 flex items-center gap-1.5">
                    {meta.desc}
                    {meta.tip && <HelpTip text={meta.tip} />}
                  </p>
                </div>
                <div className="flex-shrink-0 w-24 flex justify-end items-center">
                  {meta.type === 'toggle' ? (
                    <button onClick={() => setDraft(prev => ({ ...prev, [key]: String(prev[key]) === 'true' ? 'false' : 'true' }))}
                      className="w-11 h-6 rounded-full transition-colors relative"
                      style={{ backgroundColor: String(draft[key]) === 'true' ? '#111827' : '#D1D5DB' }}>
                      <span className="absolute top-0.5 h-5 w-5 bg-white rounded-full shadow transition-all"
                        style={{ left: String(draft[key]) === 'true' ? 'calc(100% - 22px)' : '2px' }} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input type="number" value={draft[key] ?? ''} step={meta.step || 1}
                        onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-16 px-2 py-1 text-sm text-right bg-mg-input-bg border border-mg-border rounded focus:outline-none focus:border-mg-text-muted text-mg-text" />
                      <span className="text-xs text-mg-text-muted w-5 text-left">{meta.unit || ''}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 text-sm bg-mg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40">
            {saving ? '保存中…' : '保存配置'}
          </button>
        </div>
      ) : (
        <p className="text-sm text-mg-text-muted">加载中…</p>
      )}

      {/* 快捷操作 */}
      <div className="border-t border-mg-border pt-4">
        <h4 className="text-sm font-medium text-mg-text mb-3">🔧 快捷操作</h4>
        <button onClick={handleImport}
          className="w-full py-2.5 text-sm border border-mg-border rounded-lg text-mg-text-secondary hover:border-mg-text-muted hover:text-mg-text transition-colors">
          🌱 导入种子记忆
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// 关于面板
// ═══════════════════════════════════════
function AboutPanel() {
  const [status, setStatus] = useState(null)
  useEffect(() => {
    fetchStatus().then(setStatus).catch(() => {})
  }, [])

  return (
    <div className="p-5 space-y-6 overflow-y-auto h-full">
      <h3 className="text-base font-medium text-mg-text">ℹ️ 关于</h3>

      {/* Logo & 名称 */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-mg-black rounded-xl flex items-center justify-center text-white text-xl">🧠</div>
        <div>
          <div className="text-base font-semibold text-mg-text">记忆花园</div>
          <div className="text-xs text-mg-text-muted">Memory Garden v2.1</div>
        </div>
      </div>

      {/* 系统状态 */}
      {status && (
        <div>
          <h4 className="text-sm font-medium text-mg-text mb-2">📊 系统状态</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '记忆总数', value: status.memory_count ?? '—' },
              { label: '网关版本', value: status.gateway?.replace('AI Memory Gateway ', '') ?? '—' },
              { label: '提取间隔', value: `${status.extract_interval ?? '—'} 轮` },
              { label: '注入条数', value: `${status.max_inject ?? '—'} 条` },
            ].map(item => (
              <div key={item.label} className="bg-mg-input-bg rounded-lg px-3 py-2.5">
                <div className="text-xs text-mg-text-muted">{item.label}</div>
                <div className="text-sm font-medium text-mg-text mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 署名 */}
      <div className="text-center text-xs text-mg-text-muted pt-4 border-t border-mg-border">
        <p>Lucie & Fidélis 🕯️</p>
        <p className="mt-1 opacity-60">From trust to loyalty — always here.</p>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════
// 主设置弹窗
// ═══════════════════════════════════════
export default function SettingsModal({ open, onClose }) {
  const [activeTab, setActiveTab] = useState('providers')
  const [msg, setMsg] = useState(null)
  // 手机端：是否在导航页
  const [mobileShowNav, setMobileShowNav] = useState(true)

  useEffect(() => {
    if (msg) {
      const t = setTimeout(() => setMsg(null), 3000)
      return () => clearTimeout(t)
    }
  }, [msg])

  // 重置状态
  useEffect(() => {
    if (open) {
      setMobileShowNav(true)
    }
  }, [open])

  if (!open) return null

  const handleTabClick = (key) => {
    setActiveTab(key)
    setMobileShowNav(false) // 手机端点击后进入内容
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'providers': return <ProviderPanel msg={msg} setMsg={setMsg} />
      case 'memory':    return <MemoryPanel msg={msg} setMsg={setMsg} />
      case 'about':     return <AboutPanel />
      default:          return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>

      <div className="slide-up bg-white rounded-xl w-full max-w-4xl shadow-2xl flex flex-col"
        style={{ height: 'min(85vh, 680px)', maxHeight: '90vh' }}>

        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-mg-border flex-shrink-0">
          {/* 手机端返回按钮 */}
          {!mobileShowNav && (
            <button onClick={() => setMobileShowNav(true)}
              className="sm:hidden flex items-center gap-1 text-sm text-mg-text-secondary hover:text-mg-text mr-3">
              ‹ 返回
            </button>
          )}
          <h2 className="text-base font-medium text-mg-text">⚙️ 设置</h2>
          <div className="flex-1" />
          {/* Toast */}
          {msg && (
            <div className={`fade-up px-3 py-1 rounded-lg text-xs mr-3 ${msg.ok ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              {msg.text}
            </div>
          )}
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-mg-input-bg text-mg-text-muted hover:text-mg-text transition-colors">
            ✕
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex flex-1 min-h-0">
          {/* 侧边导航 - PC 常驻，手机端条件显示 */}
          <nav className={`flex-shrink-0 border-r border-mg-border py-2 ${
            mobileShowNav ? 'w-full sm:w-44' : 'hidden sm:block sm:w-44'
          }`}>
            <div className="space-y-0.5 px-2">
              {NAV_ITEMS.map(item => (
                <button key={item.key} onClick={() => handleTabClick(item.key)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={{
                    backgroundColor: activeTab === item.key && !mobileShowNav ? '#F3F4F6' : 'transparent',
                    color: activeTab === item.key && !mobileShowNav ? '#111827' : '#6B7280',
                    fontWeight: activeTab === item.key && !mobileShowNav ? 600 : 400,
                  }}>
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                  {/* 手机端显示箭头 */}
                  <span className="sm:hidden ml-auto text-mg-text-muted text-xs">›</span>
                </button>
              ))}
            </div>
          </nav>

          {/* 主内容区 - PC 常驻，手机端条件显示 */}
          <main className={`flex-1 min-w-0 min-h-0 ${
            mobileShowNav ? 'hidden sm:block' : 'block'
          }`}>
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  )
}
