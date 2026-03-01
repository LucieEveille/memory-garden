import { useState, useEffect, useRef } from 'react'
import { fetchStatus, fetchConfig, updateConfig, importSeeds } from '../api'

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

// 问号气泡
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
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [show])

  return (
    <span className="relative inline-flex" ref={ref}>
      <button
        onClick={() => setShow(v => !v)}
        className="w-4 h-4 rounded-full border border-mg-border text-mg-text-muted hover:text-mg-text hover:border-mg-text-muted transition-colors flex items-center justify-center flex-shrink-0"
        style={{ fontSize: '0.6rem', lineHeight: 1 }}
      >
        ?
      </button>
      {show && (
        <div
          className="fade-up absolute left-5 bottom-0 z-50 w-56 px-3 py-2.5 text-xs leading-relaxed text-mg-text bg-white border border-mg-border rounded-lg"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
        >
          {text}
        </div>
      )}
    </span>
  )
}

export default function SettingsModal({ open, onClose }) {
  const [status, setStatus] = useState(null)
  const [config, setConfig] = useState(null)
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!open) return
    fetchStatus().then(setStatus).catch(() => {})
    fetchConfig().then(c => {
      setConfig(c)
      const d = {}
      Object.keys(c).forEach(k => { d[k] = c[k]?.value ?? '' })
      setDraft(d)
    }).catch(() => {})
  }, [open])

  useEffect(() => {
    if (msg) {
      const t = setTimeout(() => setMsg(null), 3000)
      return () => clearTimeout(t)
    }
  }, [msg])

  if (!open) return null

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="slide-up bg-white rounded-xl w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mg-border sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-base font-medium text-mg-text">⚙️ 设置</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-mg-input-bg text-mg-text-muted hover:text-mg-text transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* 提示消息 */}
          {msg && (
            <div className={`fade-up px-3 py-2 rounded-lg text-sm ${msg.ok ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
              {msg.text}
            </div>
          )}

          {/* 系统状态 */}
          <section>
            <h3 className="text-sm font-medium text-mg-text mb-3">📊 系统状态</h3>
            {status ? (
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
            ) : (
              <p className="text-sm text-mg-text-muted">加载中…</p>
            )}
          </section>

          {/* 网关配置 */}
          <section>
            <h3 className="text-sm font-medium text-mg-text mb-3">⚙️ 网关配置</h3>
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
                          <button
                            onClick={() => setDraft(prev => ({
                              ...prev,
                              [key]: String(prev[key]) === 'true' ? 'false' : 'true'
                            }))}
                            className="w-11 h-6 rounded-full transition-colors relative"
                            style={{
                              backgroundColor: String(draft[key]) === 'true' ? '#111827' : '#D1D5DB',
                            }}
                          >
                            <span
                              className="absolute top-0.5 h-5 w-5 bg-white rounded-full shadow transition-all"
                              style={{ left: String(draft[key]) === 'true' ? 'calc(100% - 22px)' : '2px' }}
                            />
                          </button>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={draft[key] ?? ''}
                              onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.value }))}
                              step={meta.step || 1}
                              className="w-16 px-2 py-1 text-sm text-right bg-mg-input-bg border border-mg-border rounded focus:outline-none focus:border-mg-text-muted text-mg-text"
                            />
                            <span className="text-xs text-mg-text-muted w-5 text-left">{meta.unit || ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-2.5 text-sm bg-mg-black text-white rounded-lg hover:bg-black transition-colors disabled:opacity-40"
                >
                  {saving ? '保存中…' : '保存配置'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-mg-text-muted">加载中…</p>
            )}
          </section>

          {/* 快捷操作 */}
          <section>
            <h3 className="text-sm font-medium text-mg-text mb-3">🔧 快捷操作</h3>
            <button
              onClick={handleImport}
              className="w-full py-2.5 text-sm border border-mg-border rounded-lg text-mg-text-secondary hover:border-mg-text-muted hover:text-mg-text transition-colors"
            >
              🌱 导入种子记忆
            </button>
          </section>
        </div>

        {/* 底部 */}
        <div className="px-6 py-3 border-t border-mg-border text-center text-xs text-mg-text-muted">
          记忆花园 v2.0 · Lucie & Fidélis
        </div>
      </div>
    </div>
  )
}
