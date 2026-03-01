import { useState } from 'react'
import { searchMemories } from '../api'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    
    setLoading(true)
    try {
      const data = await searchMemories(query.trim())
      setResults(data)
    } catch (e) {
      setResults({ error: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* 搜索框 */}
      <div className="flex gap-2" role="search">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch(e)}
          placeholder="搜索记忆…"
          className="flex-1 px-4 py-2.5 text-sm bg-white/70 border border-palace-border rounded-lg
            text-palace-text placeholder:text-palace-text-muted/50
            focus:outline-none focus:border-palace-gold transition-colors"
        />
        <button 
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-5 py-2.5 text-sm bg-palace-gold text-white rounded-lg 
            hover:bg-palace-gold-dark transition-colors
            disabled:bg-palace-border disabled:text-palace-text-muted disabled:cursor-not-allowed"
        >
          {loading ? '搜索中…' : '搜索'}
        </button>
      </div>

      {/* 搜索结果 */}
      {results && !results.error && (
        <div className="fade-in space-y-3">
          <p className="text-sm text-palace-text-muted">
            找到 <strong className="text-palace-gold-dark">{results.results?.length || 0}</strong> 条结果
            <span className="ml-2 px-2 py-0.5 bg-palace-warm rounded text-xs">
              🧠 语义搜索
            </span>
          </p>

          {results.results?.map((mem, i) => (
            <div key={mem.id || i} className="bg-white/70 rounded-lg border border-palace-border p-4 card-hover">
              <p className="text-sm leading-relaxed text-palace-text">{mem.content}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-palace-text-muted">
                <span>⭐ {mem.importance}</span>
                <span>#{mem.id}</span>
              </div>
            </div>
          ))}

          {results.results?.length === 0 && (
            <div className="text-center py-8 text-palace-text-muted">
              <div className="text-2xl mb-2">🍂</div>
              没有找到相关记忆
            </div>
          )}
        </div>
      )}

      {results?.error && (
        <div className="fade-in px-4 py-2.5 rounded-lg text-sm bg-palace-danger-light text-palace-danger">
          搜索出错: {results.error}
        </div>
      )}

      {/* 空状态 */}
      {!results && !loading && (
        <div className="text-center py-12 text-palace-text-muted">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-sm">输入关键词搜索记忆</p>
          <p className="text-xs mt-1">支持语义搜索和关键词搜索</p>
        </div>
      )}
    </div>
  )
}
