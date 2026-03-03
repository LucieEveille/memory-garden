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
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAA1eElEQVR4nO2dd7gkRdX/PzdsADYBu0tcWBAwAJIFBCWqgKIgiBgxvEZUMPCq8IIimAOYFRFBUVBQQBAUFFFRgiuSlCAZXDJsImy4d35/nPr+qqZ3Zu6EnrkzPef7PPP0dHV1VXV3nVOnzjl1ChwOh8PhcDgcDofD4XA4HEXHADAYjg6Hw+FwOIqOgfBbDdgImJqkORyOgmMoHH8IPA2cm0l3OBwFhYh8B2AEGAVKwMsy1x0ORwExGI6XYYT/LMYE/h6uuVLQ4SgoNLrvjRH/aOZ4cCafw+EoEDS6/wUj+EXhuCQcbwSGiVKCw+EoCDSq744R+z+Ac8L/C4E/hf8HhHzDnW2ew+FoJzSqX4wR+qHA18P/HwP7hf9/w02CDkehoNF/a0zz/xAwATgdI/pfYwT/n3C+W+Y+R0Hhc73+wvuxb/4DYDkwMaRPwAj/2+H8g+FY6mjrHA5H7hCTXwdT+j0FbBzSziTqAABmA48DS4FNMvc7Cgj/uMWHvvGhmMvvBcBdIW00HDXSPwKchUkGh2XudzgcPQYp84YxE18J2DO5fkZIuyBJ2w5jDPcAqyTlOAoI5+7FxiBG4C8GtgRuAf5MdeXeEHAdcDWwIe4eXHg4A+gPvCkczwRWEG38pcxxiGgWBHhL5rrD4egRSGyfjs3tlwObhTRp/0/HiPv8cC7GsC7mHbgEUx6CDxaFhH/U4mIIYwJ7A7OAK4HbsW8+EvJkJYBSuG8+8DssXsB+4Zr3lQLCP2pxUQq/14Xzn4fjWN9cisNzwvkh4ThaObvD4eg2SPxfA3gSW/K7YUgbJCr1TsOYxHnhfCi5dyawAHgG2CC511Eg+ActJtKFPzMw//57se9daSQvZf4PAY8BvwcmY9YABRB1FAj+QYsJEfSrwvHX4Zj93tW0+5oGyENwf2LcAEeB4AygeBjAlHyrAa/AiPaycK0aAWcZgQKEXI65Be+BTQlGcaegQsEZQPGgb7odZs67GXMAGmBlBpC1AgijoZz7gWuAaZgzUVq+owDwj1k8aITeCyPs32EE3ag3n/rGbykPGuoSQIHgDKB4kI1/b4xYLw/nleb71SSANO2PoZy9MEehFTgTKAycARQL8v1fH5sCLMKi/UJt7X8lBqD8NwL/BZ4HbBrSnAEUBM4AigUR5o7AJGxRz+NExtAIZA58GvMiHMD1AIWDf8jiYAAj2EFg15Amwq32nWtJACpzIJQD8NKkPJcCCgCP/NrbSIl7BFgW/r8EI+pLaZ0BDGIOQSPALiGv6pFiUWZDR4/BJYDeg0Z6Ld0dCb9VgZ2AzwHbYPb7VTDiXEbc9SdFNQYgd+HlRJ+CxVgosa9jDGZqUncpucclA4ejDVBknxRrAG8AfoURaKnC7xfYPoDCIHE58HdCnp+F8wmUmwu3wmIDqKzR5P8zwEVY6LC1Mu0axhmBw5ELNOILg8DLsdV6KzBi/C8W6fdlwNdC2rnAT4kE+0vgRUk5Q8B3w7WzMnVsnbn3V8BPwv8fYp6B3wLuTvL8GnMZnpCpw6VMh6MJZAl/BnAEFtCzhK3y+xawM+Wj7fnh+v7hfGeMGYhQf46ZCAFOCmmnh/MtiHECS8BvsAVFYIrFEhZSLMX2wFexoCMl4AHg41iEYcGnBg5HA0gJfzbwGeL+fddgYv+qFe6ZgkkDo8DzM+XsiC37FXF/k8gYLgG+nFz7LXFzELBRfH1sWfEiLMBIlqgnAq8FriAqCr8c7hN8auBw1EAqLk8HjsPm2orcu0sm/1DyA3hByHsv5gegPGm5u2PegZX0BX8D9sm0R4Q+CNwQ8u2UKTurm9geOJuoN/gCxjTSdjscjoCsuP9ObD2+5tbbV8ibjqQiwIMp3+gjJfwhovIP4BSi6XAEI1ghqwzUf+kB/idTb9qutM4tsClHCVNSfjApy6cFDgcri+nXYARzLaZsEwapPnKKED8T7v1sJj29b3NMmqik2f8dsG2FtqmcjxKnD2l6Ftm27kycGtyYeS6XBhx9CxHQqsQ5+ALgHUmeSvb7LHRdc/xDw3k6kk8APkm0HJxK1AFcjBG1GMEJRB3DUNLOfcL1K8L5WCN4lhEcim1MWsJMkDOSOlwacPQNUlfaXYHbMKL4EdGmnp0WVIPKGcLW/ZcwR6CUqF4CzAvXbidaCGQy/FE434s4z/8XZm4UhrD9AkeABzHnoLT+WkinBqtj1osScF9Sh4ccc/QFUqI+BiOEh4lECY25aIsA1yVq6cVEpgBfJI7snw1pYMQmR6CfJu2aBByd3PNNjGhV3gPYtGGzpJx6kT77XpiysgR8nnLdgMNRSIiw18bE7hLm0CMNeTOisAhmp1DeP8L57tgoLtPhjsk9shBoJD4znKdKwq2wWAAlzPfglSH99yFN1oJGCTaVbKYTNyf5MzFysa9RcRQO6tQ7Y6NoCfhQhevNlvtmosffJ4kj+DFE7zzZ4XVPlgEMZa4PAB8m6g1OIDoKfYjK7sn1ImUc7whlPo5JBulzORw9jXTEeyNR5H9pSGvVXXZiqEMWgKeIkkDW9VeoxQCEVE+xJfCXkPfpcPxWuJa6/jaK9N1sR3Qtfk+FNjgcPYe0g38c69xXA3NCWqujXEqwvyGa9b6ExfNXHVkiqocBZPMOYY5Jy8M9VyZ5Wp23q45ZxCnGiSHNmYCjJ5FqtWXiO5dy81orENGsia3mk8j/rqT+sfwG6mEAUE6EhyR1XYApH9Mym0Xqc/CjUP4pIc0tBI6eQtphpWk/hUhErXTmtOxdgTuIcQFWAHOp7TQEjTMAkjLXxNYlyIFoPtGUV4/PQi2kjEZMUxaKAVwScPQA0pH3e1gn/no4b5VAUgI9gijyfxGb+z9ONNnVIpZmGIDKm4yZ75ZjPv7SCRxTpZ2NIn1/xxOXK+vdORNwdC1SrbiW2n4jnLfq7aZyp2MEW8KUZi/CIvWUsE1AxGDyZgBpmVcSHY42B/4dzs8jLgNuZUqQMoETQtmnJW10JuDoSqjTH0sMngGtddqUqWwF3EQM0iGHnwOJy3hhbCmjWQag61rp9/ZwPoO4UOgOzNSp/Hk8tzwWvxrO3UTo6DqoUx6GddaLaF1sTef7hxBNfMcmeQaBd1POcMYikGYZgO77SrjvE5RPa44M6SuI6xlaUeClkoAiFB2ZaYvDMe5QJ90F6/w3YaNiK50/ve/TxChAr0muy3NPc+UTwnm7GcCHKZ/epIuO9sbWCmjE1nM0qxcQg5mMxSsoAfu2WKbDkRs0ws/GlGOLsGg80HwH1X3TiOvpr0vKzS7zlbLx8Mz1amiVAcih6ZzMfbo+l+g4dBG2s3A97aoGMZE5mBPVo6GO9JrDMS5Q59ca+9eH81ZdezfGtvUqYZF9p1UoN1v3wXXW3aoOYC+i/z6UT3GUZzI2JSlhSsIt6mzbWHWnS5IVDcmVgo5xgTrle7FO+YNw3irx74rZ11OPuLQ+QR1fovFLq+SrVk+zDGAb4pJhtSElwnRU/gRx+vKKTP2NQvd9KZR5dKZdDkfHINF/Q2AhcA9momvG1p9qvA/BwnSViIq0SorE1KlIcQBemKTVQrMMQOXK7FgrLkCqwDsE26ikhIU7U12NjtwqczLGfJZikkW9sRMcjtwgYlBUnQPCeSvLYz9EHC3lXVctkq7SpmDz4hHqnxe36gcwE9N1PEV5AJNadb2YqByU01AzFhK1cfdQ1h8y6Q5H26HO9hbK7e/NEL+I9UTi2vutQlotUVmEszbmjbcIc9NNr1VDqwxgVWJgkI1DWi2mo/o2IfoxyDuyGUuJ2nlWKOuDmXSHo22QT/pUjAiWYVF7GxVD09FP6wXmARuEtLHmyVlx/AHiQqN2M4B02rFVklYLKns28Kdw70+StjQaWWgAi0q0BJOY5IHoCkFHW6GOujYWgmshMbhlvZ1PZQwTHVwux/b6g/oYicp4Ybj/1uS+ehmAAoHWywDSshW9uF7FY5pnNaLl4tdEPUK9TEBtmIjFFSzRXIiyvoe/rMZRCsdFWOz+KdS3AEcYxETnVbDoPW/EiOFVwBMYkYzUUU4qjoONhLqvtHL23KB6F4TjKg3cO4I9/1PAQRjj2R/bx2B17L00IkXNwJimvgW099kLB2cAzeNZjOgGselAPRjCOvk0bOR7NSYBHIzN4wepj/hTqO6nwrHd31QM4JlM/fVKP6PE53wLtkHpHlhAk9khvd6pyGoYA1yCfQ9Hg3AG0DhKWAccxUZsqE8C0Mi+BuYdtzfmN/Bm4sg42kR7NAIvbOLeVqD6snsU1gM95yDwfmyxz87YHoXrMjYT0HueFv4vwkyCjgbhDKA5qANK7Fwjk56FiH8mFg34JZgC7t3Eb9Ao8afzYLD1+bXakDdWhOPkmrmqQ1GFhrAdhz6H7Ur0W8zltx5JQFaPx0L+AXwK0BCcATSHLAOYVS0jkfhnYcS/IzbifRB7/yKEZjE9HJ9uoYxG6tezL8nU32y9mvcfgy162hJjAhtQnQmoDWIAj4Sj9+cG4S+sOagDPhiOa1fJp7nuTGyOuwO2lPajWMdulfghRuUVA+iUBCAGMLFmrrEhJjCMrWo8Ftvl+BLGlgTkhPRoOLoJsEE4A2gND4fj7ArXNKdfHdNy74Atjz2KqAzMQ1zVN1xRM1f+UH159CHFNBzGHKKOw5jAb4B1qM4ExHgfrHDNUQecAbSGh8JxvXAUQYv4p2Imvp2wtfMfI1/ihzgCN6NAbAWqr5V9AVKkTOCE8NsSU5jOIipKU4gBPISjKTgDaA4iXo0864SjTFwlTDl2Lqbw+z4WxDNv4ofxYwB6hrwYgMoUEzgOmy5tizHR6cT3q2ddPxzn59iGvoIzgOagzi/l07oYwSt9AHNyeXk4vpfYcfPWUks0Xl4zV/7QFCBv/3sxgSFsuvQdzER4DvEdyxSrPQnEiDvNBHsezgCaQ8oAFmI6gJlEIj8V83S7EAucmYe2vxqk+FrWhrJroZ1mx9Q6cDjGRF8WjqpvBsYAVhB1MY4G4QygNSzCxM9JmEZ6FAsH/nZswcsb6Ix7LnR+JZz6TrueS0xgEHufF2FM9Qfh2pqY/8XDuBtw03AG0BxKRBPfvSFtNWxTyyOB64HXYu658hpsF8RgJtXMlT86oXsQQY9gzPRKLEjKJzAF6wC2CvIZ3AmoKXho5eYhcf/+cH48tjLufixOfyMLe1pBnua4RqD62v18kgKWYBLAn4DPEwOmPJC0p91tKRxcAmgNA9gyXLAINU9hYbvvoTPED9EHfrwYQCd88KUPeAR7vw9jC4jA4hL4lmFNwhlAa1BcPDB9wOuAf2KSVadGI9XTjA6glDk2gk5JAILMg7djEpbm/Q9hDMIZQBNwBtAcBjHRez3gUyHtMeB3dF4UzeoAGiFmjd7NmBC1CKiTprcV2Pu9iij6HwVsij2DhwRrEM4AGkcaiONc4LnhfIPwv9OjkXzy641JUAmNMA3l1SKgRS3U2yikd1kPI3qwqMy/IgYU8T7dAPxlNQbF/RvFNr3YCQtocSkmnm6S5Gs3RIhaBDQhk95uqL4lNXPlC73XuZjV5SpsZeUWWGAV6QJ8OlAnnAE0hiFMDP0scCi2/dX7gRvCdQXI7GQHlAPQajVz5Q/V10kHJL3XLcPxVmxl5cXYfoFfJ3oROhOoA84A6scwRvyHYTvS3IkxAbBNKsD81qGz9miJ4No6rBlxvpl7NOVYlElvJ1THduF4A0bob8Z8Lw7H1lyswPUBdcEZQH3QyL8LtrBnMabxn491wH+GfNtgDjKKTtMJaAqwKtEZpp11iwinhOMz1TK2AdKviNFeR9xI5RDMTHgSJg2swP1cHDlATHJ9zMmnhDmkQJwHr4aZA0eIyql2M1eVv2lo071EzXy9YcG1x572NKw3GCfEDT40GnfqedfBmN5i4q7D+g57Y4T/GPC8DrWrp+EvpzbU4Sdhu9Csj0Ws+SVGRMuJYa6vC//r3Z8vLzwT2jGF5uPzNYrJxCnA4g7VqW+xORYI9SaM0Aew5x8Gfo9NAdbEtlWflrnXkYEzgOpINf7fwnbsPRuLWJM6+ugdXouNiC/qUPskii/BiHAaUSxvd4cXA1hG56wAeqbtsWf/eziX1CKR/9vYNO2FmKVGXoTOBBwNQWLyB7EOdx1GYNndf9UB9w35/hjO293hVP4wcEeoe/OQVu/moJoCnBLO690deAOM4B4l+gO0+3lV93lYm98YztN5vpj2ROL2Y8dVyOdw1ES6A+1y4HGiw0+WSNQx18M2p1jA2GHC84akjxeH87EIuVUGsGW47/bknnY+q8qejOlhRqk+x6+kszkgpLllIAOfAqwMufLOwQJQDANvA26jso+/NNPzMXPgdOofifNoK9QXnrwSGjXdiRDF4B6ns9uRPRcj7LvCr1K9EvkfwMyDy4HTMIZRz14DfQVnAOWQF9lE4GfYqH4sFtlHfgCVoBDfV4Xjjkl57UQ2PHm7d8hVuapHkXg6xei2D8drMf2D3nsWWjj0J+DDmJvwWdgUrt1m0p6CM4ByaAnvyZjS7xxWVvrVwlVY59olnLd7oYw6sqLirlMt4xhodPRWPH4F42x3P1L79F7/Fo61CDlVCp4KbI1NdVwpmMAZQIRG+PcA7wNuBv6H+oJ5itD/EfLtgDnmdGph0H/Dcf2auVZGs2J7J6PxDhBF951C2rXhOFb7FUr8AxhzfgPwcdxT8P/DGYBBnn4vxvzJF2JuvouoL6SXOuKd2Nx0PaLSsBNeeWIAipLbLslD9YkBPFAtY45IFwBthlkebglp9X6XpZjV4GEsmtA+OBMAnAFAHOHXxlaUTQLehSn06hX9tcnlcmykAZMCVH67oZF4Ds3FIKxXElC5c8JRjKedCkC9v22xd3wt5vegSMtjQSL/PcBbwz1nABtRebORvkIzD78KUcvd6/OogeT3Y2yU+Tw296+l9KtWFsBfw3HXcGwncaThyUcwCUAeevV8m0Y3BS1hbrfZKUAnFgLtGurR+22k70opeCkWUHQ2puRVEJVe7sdq+xZ0KDDsJOKurL0O2cO/iHWui4nOJI12ComT24Sy7iBGzm23Vn5VbDQeJcYkqEUgeu7PY239bjivJRKrrrVZ2Re/3T4Ag0T9yu4hvVHxfYD43GeFsr4fzovgJDST1jdq7SuoA70e6wx3YnZ0dbhGkTqr3BPK1Lr1doqZqlcmyN3CeS0CUYf/HPUzAD3D1uGeW5K0djEAlb8hZvZ7AtsQpNk69W2nAjdiz/GecK0ITKBhNNsxe1lkgmju2xwbBZZiTiOPUr73XCOQHuBZLH49RM+8djIAlS3HmI3DsVkCGeva3HC8h/K9ENsBPduO2NTjKszTstk6dc9iTCm4CFP67kTvKwWboslmO2Yvb8CgzjMVmwdOxzbzuIrWo/nqI2g9wJ7h2G4l2RDmqQhxOXI9aCQgiJ5NU4xbQ72dIJo9KV9n0QpDHcW+883Y6D8JU/7OordjCjbVx3r1YZuFRMBR4oqxHwDfo3GlXyVIcrgy/H8p5n3WrgAhYmYj2BSmRDQ/5s10VN7zw/GuUG+7iGYA+x4TMAYwgHn2pW1pFnISOhv4MiY1nR6u+R4DBYbmeUcRXXcnk59nmCwKg1iIqhLGBCD/kTIt7yjML7+EjWxjLdDRezgx3PPtTHolpFaOEuYrcXySnvfzialsFeq7h3y19lL2DmHWgRKmE4E+1QcUHeqgL8dGrocwWzDkO4KlloVRjMjS9DygZ9kcC4IhJeYiLDjJ2uF6XgxA5UzFTI7PYFOOEuaWKx/9PEdPteWj2HusN2pRI9B3Xxu4G3ueQzL1OwoAfeiNiDvJ7BPS2jUy70GMI5AXYWjUAnNWWk4cuaYC88L5zpm2ZKHOfULI/61MehZ6f5sTmc0U4JPEbc8/nOTN41lV5x9C+QeO0cZmoXf0YkyBuxCzqafXHD0MEc1koqnsf8O1dnB5df7VMEeZEeK8uVVJIzty30lcIAOmzCphaxjS/NXKqZcBiBAOCvl/k1zblmhS+3qSvxUmkK7pfwYjynb6HOi53409x02Ycjgb/MXRg9DHPRX7uD9L0tul7BHBnBbqPDLTlmage48LZV5LXJU3GXuWj4Vr3xyjPqV/psn8nw31KQbhDODycO2rY5RVD/RtDgtlnhfS20mMau+3Q53nZNri6EHUCuvVzo+qeg8I9V4RzpvtwCrvnaG8W4nEP0xkOC8L1+WHMJYO4HjqYwBq90Uh/8HhfCi5ZzrRW+8jY5Q3FrLhv95GuSdfOyBJcQIxnNix4ZrrA3oQtcJ6tVusSyPnPIF5sTWrcNRzvCSUs4DoYaiOmQ1LtpDaYckaYQD1hONSGzfCgpOUgFdmrtWLNOjIImwKoLUHnQo8sj620rEEvDqkORPoIehDzsF85MfjQ6rj/5zmXU4lqawD3BfKeW2FctJFTdczdnxA3fvpkPcbNdqmd7kFtc1xuncvYsDQ52TKqAcSuQ8J9V3aRBmtoNLA8bzMNUcXQ6LcJEwULgHHhGud5OLqyG8IbbgkpNfbkfUcg9i24yVqmxTVORX15kM18irtU5Qr72rlfUvIe26mvkp5P0r0s5hEY0pBlfuzUMb7a7StXVBdh4c2XI9ZWZpdJ+LoILJKv7OS9E4qc9RRmhVl9RyfwJ7jcqLbby2x/u0h/9nhvBahNsIAvosxlrHm90o/P5T9xRrtyCLPqVOrSJ/blYI9Am0RpRFoHmaOGy/3zqwy6+3Up8xKlxYr1PhY4nS9ojpJ/bIonJxJT6FR74aQV2bHagStd7020QxarzekiOtAypWn4/HtUqWgLBwnhGuuD+hC6KPsj32sB4kr48ZLbFOHflto0/l1tCfteNdQrj+oZ73+ROK6gK2r1Kd3dWzId1ImXdB9G2Pz4Uepb7stlaN5/L+xmAVjTQX0fD+i3LlovAgu9RTUO31zSOtLJjCIPXi3zYPUcbbEdopdhnniwfh+KL2ndTEX3cVE891YJrpjsA7323BejwitPKdj4vrhmTKzdfxfqONrY+R7Y8h3QThvZApzNvX5B+h9TMNi962gc1abWtA73Q77fs8wtqfleKGj9NktTEDtmIkFqShhbrLQHVxa7bsYa9sbqT4NUIfalij6b0z9yieVKQeaX2bKzeYTk6nGAHTfqRhDObJKvkrQVGAt4s7Ju1dpT1rmfkQFoiwb4w217XVY2+7HtkeD7qGDtr4nPeQewNHYNsww/hxQ4vIwcUXXl8K1biB+WNnN9BfhPNtxUpdl7Xv/znCt3vesMp9DFNmnJ+Vn23Q01Udn5Z9EFH+3abA9WRfi26nuYqu838OYzccrtGk8kX1nV2PTmm5YPqx3tyumNN43nOfGnFLbaAnTanfD/uv6KN+jfMTrJk2t3s8GRCcdbeFViShPppxRNEoAGjW1X2AlZq0ytZjnKxXqUrt3IBJvMzEOVeb3QzlnVKhL5U0hKg47tb1avUilNrl4y8I0nhuNpD4vD1Pu85LrAK3C3kvUsK/C+D28PobW9s/DbLXdwJGz0EeSPf8NlHcovdvXhOt3YVOaZuzOqd/+KBbwIk1P/8vEWCvP0cQt0tO21gs9wxQsVkEJm6KkZakPaYfla+ge8T+FnmUiFp1I6yJgfCSVNKaBVk1+Mlxri3Suh1RU1e9k0jsF1XdwaMd/GT97cT3I+vKfH84lCsvbbz5GbHuF6818xHR5awnTi0ygnKDUno9TnQEor1ZQ7pdDm3bApKAnKY9enF089bEK7ekWqH+thUlF9ay+bBdUn4K7XhzO2zYoiwNOxxakpGaRTukDVM+OwBIsRLXcXruxw0B5SO3FWJvXC2nyXTgfe5+fD+fNPkulufv2IU3vbiwGoE6+GaaNf4T6zH+1oLL/l2jjT4l/dWyX42XUF9p8PJFanZ7A3tHLQlqnXc1fSVRMrk0HvBVV8Yswk8gCOmeuSRedaLHG60NatxK/oHfzC6KLq9LeR1ziO5HWObjexUmYRHF8Jn0sBqDjkZTP21th8hJXB4hRjI4O1waJpsbLkrRuht7RvpjO4jE6F0hEUuP6xAA3HVXMZzvIVeTTcWtBDz2DqCU/KtOeboba+CqizgJM2bUYk2a0yq/Vj5iuIJQjTqoYHYsBKN/fwvX9yWc5bhqZSa6+sqmLKbwl05Zuhtr4LqKiVOHY2sXAUkb621BvlsF3BKrsl4ztT94qJNYMY4tq2l1fO6A5+GRi/Lk9iWvPteglLw4+gDFlzVN3odxsCpWVgKlL8Qhmw29ku7GxoOfTiH89xqi0gnBGjnV1AqnStYQFTV2N9oniqk9LuS+j9hqRtkEdenWiPuBtmUbmVY/Kk4uoFmaMp/mlGeg5FIpLkXzPyVzPs67jWVmLX4sBZDv0N5L78m7bKaGOJyhXKo+3f0kjSPunFqD9kvKROi+ongOI837pksZlypQuWpFya8fMtVaR1XT+me5xwGgU0vqvi+lONBWQc0yez5O6sJYwRd7qIU2KxywDkLVgFcwUKSklLS8PpE5PkoCexnRJvRiHL5VQf8PKFrI8JafNidOndoWcbwgiUO2xdy9x++i8gmAqpNe/seW1eZQ9HtDz7IU5U40S7bbtmjoNAX+nfH6tWH5ZHcCkcI8WVN1GjDeYN7MVE3o39h6eoXKwk16BGPg04iKuvEKKqa+viW1bny4Q64p3lfUtvxpz/GhlHpRlLPMxsxT0logoqM0vIIr+JeA/2IjbDiLLmt7+FM5FfFkGIE+/CzCibNUkWQsSnaXQLWELpl7UxjrbjTSk2B3ksy4ldT66jOp+G+OKdB4kl8/zieJcs95su2OOI4uJU4uueegGIOJfi6gveS+di3m/FbY2YATbCFOMJssABjAGtRRjALtlysm7XXsQp0HvCP8fIC7j7mVGvwWm1CxhHp7QnFu3yvtxKOvnST1dNQVO3RLPxxp7WrjWyPw27bSPYx1x/5DWi8Qv5jed6FWnkfWt4fzyTN68kJr9JDqemVwXA/hSkvbNkHYfJsWl5eQFPacsSEeGc0kqNxKner3IBNRPd8OmNkuIgVTq7cMp8Z+MvZc/YNJi1+q/1LBViaPbdzLXakEPPBeLaFPCouhAbxK/nmcK8X1IGz8c0u/DmNz2lH/0vNsgN9unsY1KBihfDDSA6W6eZGVLS55IvQyXYkx+ZlKPlL1XY3PedrShE1B/1UrIR6jfUSjtB18gro+YEdK6Wv+VjnjS8H4vpNXSCSh9FnGnmV5y9MlCH3Aa0cnl1OSanklBOU7L3JcXsusQ0rqkszkpnH85nD+LTRXa0R6V95VM3cPJtZOIDmazk+u9hlTRWcJcsxVHoNp7TafMXwr3/YMeU36nTEAj35lEJVP24ZV/GnH32S+EtF788GrzOsTnOSWkSRJK3TmXhF9e1pMUKmtbTNIoYWLpLOCIcH4iJo0sCHmuCffkLWaqvDWx+fEyypeVpyPfV4mOQlro1ct9QSbX64nLwavFRBgkBiO9hhhFqqckIT3cakSdwO8xooDyhScDmAlKro3fDde6TtFRB/RcWxAVfgq4kZ0G6YP+MOQ7LlNGHlB9UzGvvkWhrq8RR6ZPECURvf88XH+zUHkfCPWcF85TQkiZwKeIDi+9bB1Qm79I9BbU4qrBTJ7VMSuM6GWNkN5TxC8MJkftuXY35vqp9KFwPCdc/2lyrZeIP13Zti9xLn1Ucj37PMq/Laahf4AYfz7PZ1dZ12ES2V2YxHEecRmpgknIQgH5E5sYvUK37RHSs507ZQKKP/E0cUuyXnMWSp/nO9jz/A7zsZADEVg/kLL2x0R/jV561pWQdnw59GjUEWTiuACbN/Ua8aeEciT2LEuJKxVrSTLZYCHvqFBmXu37BTavfk+oS1MC/WS7FoNuh/vvgaGOaxn7O+ue/Yiek8dWuN4LSPVf6u/nJ9c/iA0CJaJzGPQ48QspB9yFOAJcQvTv/y0xok+vPHQ66s8iBkq5g/pFVt2/D9EEJpfcvJDOQ5/GrDRywFmGdbx5RBOgVrTl2QYR+19CHW/ItK0a0imVlMO/pnyTlV7pL6KDSUSJ92yiOfRe4OUhb68NgnVBH3M6UQssE8ncJF+3z/2z8+PXYPPUErZ1VqOaa3WMebTHMUhM5tVEAt8RI/zlIW13bPr1OJGg8voGqn/3UNftNOZinPabM0IZjxKZiOroZkaQXRw0m7jfoyxlUg725Hy/HmiJKkQb9IJwfBCLY79Kkl+ORd3CDNL5Glj0Xe1h9ywxDj809hFVpsJOX0O+I5vK2TyUr/BeZ1LuCPQfLAZAek+e9Sty87vDeSMMLn2fb8OCq0qMfkFyLV3SPN6Q2J+2fQLm23IP5f1fW6hNpHv6e65IR01pd28GNsU6hJRQd2PzoTUz98tO3OmXk3o4CmthprMVxE6YRkVqtI3qKBOIu/seEK7lIQWoPWsQNw4dIO4MtGqo5xlsU5G86oX43nYLdd8Z6mtG0ZnOo+diEotG0K8SpwWqdzz7S/b9TcNiB2r6+yS2z+JzMKen1Ceimwa9XJDqALQf3c2Uf7DpmCuoGMFizGtuZyprz8Xp2/Giqn3EuVgU2MXE+fprMu1qFrpXSrLryE8hOpAcHyeu8T8x1LUKxtRSJVteDEDtv4L8lJzpvS8nrr5bik0tN8nkbyczSEf5St9/e4w5aQHYk9gAOCvJsyaRCchkXBgmkBL/8UTil9NL6gEGxinfRVzCWsJE0y9g3mkTWBkiVpWlTlfrBeq6Pp7uz4qPw9jyXYnLJWxZ8mFJW/IS11WOQnFp+W4ec0K9i5uAi8J/BSYZxsKRlch37zuVoTBo/8IUYHkwtfSdD2AWl3Rl4bmYOXZihfvy6iuVvssQFoPheKyfqD03YlPENTJ5VcZMIhM4OWlrTzOBlPg/jz3cDcSRfyiTN9vptsMIX9FtS5iE8BOso25CfYSnj6ffWC91Kmaj/hqmmVXdl2KiedrOPBU2KmsvojUhr92NVfZvsG8AkSEPYCOplIFp/maRTmv+GcrWev92vDNhX+BC4jd7EJMkX070pa+GRvuJsBHGgE4jBqstYUq+rxHdqtM2V3IIW5PoOfrtkNZLVo4ypPO1k7CHmkc0MVXrBJUWxAxgotRxRE25fvOxD3489hF2BDYkmhRrYXJoz3bAoZgi5s/YXFjl3wJ8mrhTjdAuES0l1BL57ZCr+3+AMVGIuhiIOxjnteOTnuMwovdbOztzts9shkUdlulQJs+/YWL2m7B9CtahXPFcCYOYq/SccM/BWF88j3JNfgnT4ZyIEX32m9WKDqT2r06cLv2QcumjZ5ByT8UHuBITc6D+ESCrdRfWwcTKL2EdawHlH6GEKegex5SKN2LzxKuxqcWtGON4qsJ987EP+wHi6q20Pe2em+ndbIOZ6B4m7hLUSr2pAnZZ+C/3X4gLg+R33kqHU4edQgwttnu41k4TlwaPbNufizk/ncPKBFvCfCMexCIgzcP6yTWYpHQXFvJ7eYX7Foe8X8MkQ8XnS1FtqlAJavdUomPYzyifauaKdnhSDWLa3omYk88bMffTgzDTzRBmf64Ho+GXckFFqr2IOJediDGFDTAuvQEWd282NueaRhx9StgHvQ1jEPMxk8wd2FRDIlyK4aQt7cYI9o7+iX38t2JSwDE09u6qYT7WoYYzZa1L3JEYVn4HjWAIY8DvwcTjC7FRLY/210IpKV/fewX2rW/DBiMwQn0ONoWciz37TEwEnxTaKdPuI1gMvkexd3df+N2P9cNnM20YSO4fDfXXi9HQ5sUYQzkL83WYEo5P0f532BJShw1th30eZvaBfO3aqSUgb7TbyjAWVO8m2EdfhDG1VkRBjUKvxb7LTGIADrDRcX6Sv9nnFrOeiUkvy4GtM23oNCRJtqP+tOy8/TaGiW7DfyFKZ13pAq1GzSVq8E9L0ts5h6mkoc1qerO/bN5UI9wNUGeV/uR7mfRmy3tpKG9T4KNEJeAfMS09tPYOVI8Ce5yRSR9vVOsrtfrJePSVtPyTiVaU54e0rmECqfZ+J6JL7GeT6z2lwOgSqAOsjU1VlmI6iWbfp+6RuW9nbGpRwpShN2EK0DRvs22ei4mxT2GitveB5pC+N4Vve4zyzWPHdcBKudSbsE5aIoYs7qYRtRehUVMf/4JMeiNQR9qI6A58RPg/FdODnN9C+el9p1Pu3toto38vIrWKvYmojHx3kmdcmKtG/QGiuPcYcTVTLZOHoz5oBFgNc4YqEd9vo0SlbzErlPMm4vLsmZiUcXrI04x4qfbsiCm+HsSUaq1aLxwGfZNdiFL2N4iOTh2bEqQcaQNiFJ9riXH7u2Z+UgDoXR9MdKRqZiNW5Z0aynkfkQGsi5nCTg55mmUAg5i5t0SMh++jf37Qd5mD6WykHNQ6lLZPCdKP+Vpi3PNTsFEqm8eRD/ROxWwVTKURQlXHGMaI/f8wBrACUwiWaH6XWeVXiLGrGL/FW0WH+sIEzP9A/ghvSfLkPgCnH3JNonPPEsxOLbiipz3Qe92MGEC0UY+9lBCfxFysP4TNKV+Afc8jwvVGOpD0POsTA31u12DbHI0hfa8HYVPvErZeRTE3K3nUNgQVkHacQ4iOMpdSvlWXc/r2Qh/zI9j7v4LGPBPTPA9h88cjMMXtDsRpATQWyER5LwhlnJBpr6M9yE7FzyPq4d6eyduyPm5v4pxjIXEve/AP3Smkbq6XY9/i6HCtEYIF83g8AzMDPgPsSnMrAZXvfeH+v9OcfsLRPFL6O4y4nP4a4JWtFDwrFHgt0ff5G8SVfG7b7TxSU96jmPjeyBbRIsrbMDdjMYDdsO97UANlpWsWnsKmJVo74f2is0gXWc3CzK8yF96AKWTnUgdTViHajqiEmYe+gDl0CD7qjx/07g/Evs+9xHnfWISnDnAztl7+IxjxainwAZk6qkHz/hnENe8SO90CNH5Iv9scbOHXfOJqzDElM118HjaX24+o3VcFLtqNP0RkJ2Af9w/Up3UXg7gasygchWmQxUxeEa7XYgDpvP9X4b5vZtrlGD9klX+TMDp+XnK9YeS50MHROtKPfD5GhN8K55UiJgm65wps38ZPYDodBSOtZzohIlc4sT+EOn1w6C5UW0pfF8Tl/aN2LySGT8fmeSXiNtvVmIAI+/eYA8lHMQbweuL6gDRfFir37cSIRQrw4gNEd6JajASolkgMqKGdShzdB60dX4gp7x7EVg4egimAakkCJWLchuXE9eW11plPCHn3wRy/FoR6H8I6WCdiJTgah2IkVPw+zrV7GwoecgfmmbkEcwbZl9pMQEx9gKjsTdOzEPHviikPS5jUcANdHqDCURvOAHofI9h07WpsRB7B9AIHYkRbyQkkS+gDNdKHQzl7Y1u5rYpFp7mUlaMKOXoMzgCKgRUYMV6Kbf+1FNPQv5+4eUmWEYy1Sm+YOBV8KxajbhLGZH4ZrjcS7srRhXAGUByICVwG7InFrfs2Nl9fI1wfZWUFXzoFILm+Als5eBLmNfg45i9wHk78DkfXQqaf9YmrBx/EtqXSfvOXYo4hH8E8ChUncPukjDdjEZVLWKSgTTPlOxyOLkU6yh9OXLZ9K+Yf/juqM4B9iRt5LMachYYrlOtwOLoYaTi2mdha/2cxwl6KRW3+GOUM4DZiOOsvE12MVZ7D4egxZP3DT8HW7F+IOQI9iq0BkC7gTGyxUXq/O4MVFD6fKz5GiN5g92NRe16IbTYhE97ycPww5WHBRnAzX6HhYl1/QOY8xbhfBZsOjGB94KmQbx7GLCYQzYeOAsMlgP7CKEbUE7G4gGIAS8P12UQdgKMP4BJAf2III3rtuygx30f8PoMzgP6CCHwy5XN7/Z+Io6/gDKB/kGryVyWaBFMdwNQKeR0FhjOA/oMW+CwkLimWDmBytZscxYQzgP7DBMwKsIw4JVAAyUnj1SjH+MAZQP9hFWyuv5A4BViCRQeeOY7tcowDnAH0HxQkRAxAVoAVmG7A0UdwBtA/kGJvSjg+naQvw6SAaZ1ulGN84Qyg/6B5/pPEBUPLsCmAGID7A/QJnAH0DyQBiMhTCaAELCKaAR19AmcA/QdNAZ6g/PsvBFYP/10C6BM4A+g/rBGOi1l5y3CfAvQZnAH0D7JTgEWUf/8FxClACfcG7As4A+g/SAJYQvn3fwxjALU2FHEUDM4A+g+zw/Fp4u5AYJGBVsN9AfoKzgD6DzOxhUBg31/z/ccwsd8XBPURnAH0D0ToM7H5P5R//8fD0U2BfQRnAP0DMYDZmMYfbJRPpwAQdQQuAfQBnAH0B1JCnwU8nKSLMTyZXHf0CZwB9BcGsRH+kXCeMoAF4TgrueYoOJwB9BemAtOJEgBEm/+TWFyAdSrc5ygonAH0BzSaz8C++X+Ta4oJsBRzB163oy1zjCucAfQHxACk4Hsoc127Bz0GrB3+uztwH8AZQH9BxJ1lAOoH84H1wn9nAH0AZwD9AUkAYgDSAWSJfD6wVvivPQMcBYYzgP7CnHCU048YgAj9PsxRyIOD9gmcAfQXNsTcgJ8I56XM8T4saKg7A/UJnAH0B0TgczBF31NV8t0fjh4duE/gDKA/IC/AOcADrLz5pxiEzINSBLoEUHA4Ayg+5O03jDn53FvlOkQPwTnJNUeB4Qygf7AG5gV4d5KWJfDHsEAhG3WqUY7xhTOA4kNELvPe3dUyYq7ADwIbt7VFjq6BM4DiQwxAYv09Va6TXBcDyOoKHAWDM4DiQwQusf7+CtfS/3cSmYU7AxUczgD6B5thBJ11A87idmxJsG8T1gdwBlB8SMO/KRb1ZwFx8Q/EEV757gjX18lcdxQQzgCKD83jN8EUgCUiA6hE3FISblQjj6MgcAZQbMjGvyqwAXBbSM9+95TI78e2C9+swjVHweAMoNgQ8a6DLfC5pUYeYSHmEPT8NrbL0SVwBlBsZC0AkgCqrfXX1OBOIgPwuAAFhjOAYkMM4HnheFc4psuAUwlA/eHfmNIQbDrg04CCwhlAf+CFmDJQPgBjjeo3Y8FD1hgjn6PH4Qyg2JAFYHNsFeCTNfJCZAw3Y31jbjh3CaCgcAZQXGgzkGFsCvDvkD7EyhJAJV8AiFMH7ycFhX/Y4iKNA7gGcEMmXf/TczGA+ZjD0FZtbJ+jC+AMoLgQYW+CEfb1ddyjPQJGgFuBbZJ0RwHhDKC4EAPYKvyXD8BYK/zUJ67HdAfgloDCwhlA8bEdsIyVTYBjYR7mQOSbhRYYzgCKi5Fw3BZT6i2mPPxXNej69SH/c8O595UCwj9qMSFCn4b59M8L6ZW+d1a01xThdixC0LZV8jkKAGcAxYS+66bABOCacJ4l4oEK6doteDHmErxTm9ro6AI4AygmRNAavf8ZjvXO/7Um4Bpg+/B/pEpeRw/DGUCxsTOwgvotAFn8FYsPuDpRMnAUCM4AigmN1rtg9vwF1KcAFMQorsWkgS3CufeXgsE/aPEwiBH6bEwH8NeQPlT1jpUhRnErto3YLuHcJYCCwRlA8SAi3Tr8v7LO/CnkEbgUuBHYPUl3FAjOAIoHEfRLw1EmwEbn/+obVwAvwhYVuUdgweAMoHgQoe+FRQHWyr5GR2/lvxxTAsohyBlAgeAMoFjQEuAZmAvwnzErQKUlwMpfDWIk8zCHIEkU3mcKBP+YxYK+53aYA9Dvw3k1Qh8K1yr1A+kBFgA3Afsk6Y6CwBlAsSBC3zsc/xSO1eb/gxgTqGYhUP+4BNgV1wMUDs4AigXZ/1+JBfW4PZw3u8mnRvuLsaAi8gdwBlAQOAMoDmT/n4MR6iUYQ6hl/89GBMpCjOMfwCJgP6pPGRw9CP+QxcEgRpx7huOFIb2V0VrbiC3FrAEHhjTfNrwgcAZQHJTC7yAsAMhfQnqri3jEQH6OLS6ahW8bXhg4AygGBjBCnwG8DHPeeYI4LWgFYiCXYoS/b6ivEddiR5fCGUAxIHPe3sBk4Gzqm6vXwxw0DXgCkyreTJQ2HD0OZwDFgAjyrZjTziXUN1evV4yXsvCHwB6YZ6CbAwsAZwC9D4XxXgtz1rkMeAgbtfNS1o1gDOXXmGfhQfg0oBBwBtD70Dd8Peb9dxrRuSf9DSY/pQ0kZdTKPwBMBJZgTOD9uDXA4egKDACTsLX79zR478ewEb0RPB+TCF4Qzn0Q6WEMj3cDHC1hEBuFX4Ct1nsSmwJMII7OUtZpZB8J15aGe4Ywq8EKyuf0qYvwaFLeilDvx4B34HqAnoYzgN7GKEaMtwAnA/tjRF0tyEeKAYwJ/AuL+6eQYdmNQknSZG68FbMKVCrX4XCME5oRx5sZwV3553B0GTo9F3fRvwDwj1gsdPJ7uujvcDgcDofD4XA4HA6Hw+FwOBzdjv8HkdQnpU6a4OsAAAAASUVORK5CYII=" alt="记忆花园" className="w-12 h-12 rounded-xl border border-mg-border-hover p-1" />
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
