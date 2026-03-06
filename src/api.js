// ═══════════════════════════════════════
// 记忆花园 v2.1 · API 接口
// 匹配 ai-memory-gateway v3.4+ 路由
// ═══════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_BASE || ''

// ─── 记忆 ───

export async function fetchMemories(limit = 500) {
  const res = await fetch(`${API_BASE}/debug/memories?limit=${limit}`)
  if (!res.ok) throw new Error('获取记忆失败')
  return res.json()
}

export async function searchMemories(query, limit = 50) {
  const res = await fetch(`${API_BASE}/debug/memories?q=${encodeURIComponent(query)}&limit=${limit}`)
  if (!res.ok) throw new Error('搜索失败')
  return res.json()
}

export async function addMemory(content, importance = 5, title = '') {
  const body = { content, importance }
  if (title) body.title = title
  const res = await fetch(`${API_BASE}/debug/memories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('添加失败')
  return res.json()
}

export async function updateMemory(id, content, importance, title) {
  const body = { content, importance }
  if (title !== undefined) body.title = title
  const res = await fetch(`${API_BASE}/debug/memories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('更新失败')
  return res.json()
}

export async function deleteMemory(id) {
  const res = await fetch(`${API_BASE}/debug/memories/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除失败')
  return res.json()
}

export async function deleteMemories(ids) {
  let success = 0, failed = 0
  const BATCH = 5
  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH)
    const results = await Promise.allSettled(batch.map(id => deleteMemory(id)))
    success += results.filter(r => r.status === 'fulfilled').length
    failed += results.filter(r => r.status === 'rejected').length
  }
  return { success, failed }
}

// ─── 系统 ───

export async function fetchStatus() {
  const res = await fetch(`${API_BASE}/`)
  if (!res.ok) throw new Error('获取状态失败')
  return res.json()
}

// ─── 配置 ───

export async function fetchConfig() {
  const res = await fetch(`${API_BASE}/admin/config`)
  if (!res.ok) throw new Error('获取配置失败')
  const data = await res.json()
  return data.config
}

export async function updateConfig(key, value) {
  const res = await fetch(`${API_BASE}/admin/config/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: String(value) }),
  })
  if (!res.ok) throw new Error('更新配置失败')
  return res.json()
}

// ─── 种子 ───

export async function importSeeds() {
  const res = await fetch(`${API_BASE}/import/seed-memories`)
  if (!res.ok) throw new Error('导入失败')
  return res.json()
}

// ─── 供应商 ───

export async function fetchProviders() {
  const res = await fetch(`${API_BASE}/admin/providers`)
  if (!res.ok) throw new Error('获取供应商失败')
  const data = await res.json()
  return data.providers || []
}

export async function createProvider(name, api_base_url, api_key = '', enabled = false) {
  const res = await fetch(`${API_BASE}/admin/providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, api_base_url, api_key, enabled }),
  })
  if (!res.ok) throw new Error('创建供应商失败')
  return res.json()
}

export async function updateProvider(id, data) {
  const res = await fetch(`${API_BASE}/admin/providers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('更新供应商失败')
  return res.json()
}

export async function deleteProvider(id) {
  const res = await fetch(`${API_BASE}/admin/providers/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除供应商失败')
  return res.json()
}

export async function fetchProviderModels(id) {
  const res = await fetch(`${API_BASE}/admin/providers/${id}/models`)
  if (!res.ok) throw new Error('获取模型列表失败')
  return res.json()
}

// ─── 已保存模型 ───

export async function fetchSavedModels(providerId) {
  const res = await fetch(`${API_BASE}/admin/providers/${providerId}/saved-models`)
  if (!res.ok) throw new Error('获取已保存模型失败')
  const data = await res.json()
  return data.models || []
}

export async function addSavedModel(providerId, modelData) {
  const res = await fetch(`${API_BASE}/admin/providers/${providerId}/saved-models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(modelData),
  })
  if (!res.ok) throw new Error('添加模型失败')
  return res.json()
}

export async function updateSavedModel(modelPkId, data) {
  const res = await fetch(`${API_BASE}/admin/saved-models/${modelPkId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('更新模型失败')
  return res.json()
}

export async function deleteSavedModel(modelPkId) {
  const res = await fetch(`${API_BASE}/admin/saved-models/${modelPkId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('删除模型失败')
  return res.json()
}
