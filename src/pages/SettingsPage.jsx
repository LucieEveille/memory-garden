import { useState, useEffect } from 'react'
import { fetchStatus, fetchConfig, updateConfig, importSeeds } from '../api'

const CONFIG_LABELS = {
  memory_enabled: { label: '记忆系统', type: 'toggle', desc: '总开关' },
  extract_interval: { label: '提取间隔', type: 'number', desc: '每 N 轮对话提取一次', unit: '轮' },
  max_inject: { label: '注入条数', type: 'number', desc: '每次注入上限', unit: '条' },
  semantic_threshold: { label: '语义阈值', type: 'number', desc: '向量搜索相似度阈值', step: 0.01 },
  dedup_threshold: { label: '去重阈值', type: 'number', desc: '去重相似度阈值', step: 0.01 },
}

const SOURCE_ICONS = {
  database: '💾',
  env: '🔧',
  default: '📋',
}

export default function SettingsPage() {
  const [status, setStatus] = useState(null)
  const [config, setConfig] = useState(null)
  const [configDraft, setConfigDraft] = useState({})
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statusData, configData] = await Promise.all([
        fetchStatus(),
        fetchConfig(),
      ])
      setStatus(statusData)
      setConfig(configData)
      // 初始化草稿
      const draft = {}
      for (const [key, item] of Object.entries(configData)) {
        draft[key] = item.value
      }
      setConfigDraft(draft)
    } catch (e) {
      setMessage({ type: 'error', text: '加载失败: ' + e.message })
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      for (const [key, value] of Object.entries(configDraft)) {
        if (config[key] && String(config[key].value) !== String(value)) {
          await updateConfig(key, value)
        }
      }
      showMessage('success', '配置已保存 ✅')
      loadData()
    } catch (e) {
      showMessage('error', '保存失败: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleImportSeeds = async () => {
    if (!confirm('确定导入种子记忆吗？')) return
    try {
      const result = await importSeeds()
      showMessage('success', `导入完成：${result.imported || 0} 条`)
      loadData()
    } catch (e) {
      showMessage('error', '导入失败')
    }
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

      {/* 系统状态 */}
      <section className="bg-white/70 rounded-lg border border-palace-border p-5">
        <h2 className="font-serif text-lg text-palace-gold-dark mb-3">📊 系统状态</h2>
        {status ? (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '记忆总数', value: status.memory_count ?? '—' },
              { label: '网关版本', value: status.gateway?.replace('AI Memory Gateway ', '') ?? '—' },
              { label: '提取间隔', value: `${status.extract_interval ?? '—'} 轮` },
              { label: '注入条数', value: `${status.max_inject ?? '—'} 条` },
            ].map(item => (
              <div key={item.label} className="bg-palace-cream/50 rounded-lg px-3 py-2.5">
                <div className="text-xs text-palace-text-muted">{item.label}</div>
                <div className="text-sm font-medium text-palace-text mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-palace-text-muted">加载中…</p>
        )}
      </section>

      {/* 网关配置 */}
      <section className="bg-white/70 rounded-lg border border-palace-border p-5">
        <h2 className="font-serif text-lg text-palace-gold-dark mb-3">⚙️ 网关配置</h2>
        {config ? (
          <div className="space-y-4">
            {Object.entries(CONFIG_LABELS).map(([key, meta]) => {
              const item = config[key]
              if (!item) return null
              const sourceIcon = SOURCE_ICONS[item.source] || '❓'

              return (
                <div key={key} className="flex items-center justify-between py-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-palace-text">{meta.label}</span>
                      <span className="text-xs" title={`来源: ${item.source}`}>{sourceIcon}</span>
                    </div>
                    <p className="text-xs text-palace-text-muted mt-0.5">{meta.desc}</p>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    {meta.type === 'toggle' ? (
                      <button
                        onClick={() => setConfigDraft(prev => ({ ...prev, [key]: String(prev[key]) === 'true' ? 'false' : 'true' }))}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          String(configDraft[key]) === 'true' ? 'bg-palace-gold' : 'bg-palace-border'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          String(configDraft[key]) === 'true' ? 'translate-x-6' : 'translate-x-0.5'
                        }`} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={configDraft[key] ?? ''}
                          onChange={e => setConfigDraft(prev => ({ ...prev, [key]: e.target.value }))}
                          step={meta.step || 1}
                          className="w-20 px-2 py-1 text-sm text-right bg-palace-cream/50 border border-palace-border rounded
                            focus:outline-none focus:border-palace-gold text-palace-text"
                        />
                        {meta.unit && <span className="text-xs text-palace-text-muted">{meta.unit}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="w-full py-2.5 text-sm bg-palace-gold text-white rounded-lg 
                hover:bg-palace-gold-dark transition-colors
                disabled:bg-palace-border disabled:text-palace-text-muted"
            >
              {saving ? '保存中…' : '💾 保存修改'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-palace-text-muted">加载中…</p>
        )}
      </section>

      {/* 快捷操作 */}
      <section className="bg-white/70 rounded-lg border border-palace-border p-5">
        <h2 className="font-serif text-lg text-palace-gold-dark mb-3">🎐 快捷操作</h2>
        <div className="space-y-2">
          <button onClick={handleImportSeeds}
            className="w-full py-2.5 text-sm border border-palace-border rounded-lg 
              text-palace-text-light hover:border-palace-gold hover:text-palace-gold-dark transition-colors">
            🌱 导入种子记忆
          </button>
        </div>
      </section>
    </div>
  )
}
