// ═══════════════════════════════════════
// 记忆花园 · API 接口
// 匹配 ai-memory-gateway v3.1 路由
// ═══════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_BASE || '';

// ─── 记忆相关 ───

export async function fetchMemories(limit = 200) {
  const res = await fetch(`${API_BASE}/debug/memories?limit=${limit}`);
  if (!res.ok) throw new Error('获取记忆失败');
  const data = await res.json();
  // 网关返回 { total_memories, query, results: [...] }
  return data;
}

export async function searchMemories(query, limit = 20) {
  const res = await fetch(`${API_BASE}/debug/memories?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!res.ok) throw new Error('搜索失败');
  return res.json();
}

export async function addMemory(content, importance = 5) {
  const res = await fetch(`${API_BASE}/debug/memories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, importance }),
  });
  if (!res.ok) throw new Error('添加失败');
  return res.json();
}

export async function updateMemory(id, content, importance) {
  const res = await fetch(`${API_BASE}/debug/memories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, importance }),
  });
  if (!res.ok) throw new Error('更新失败');
  return res.json();
}

export async function deleteMemory(id) {
  const res = await fetch(`${API_BASE}/debug/memories/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('删除失败');
  return res.json();
}

// ─── 系统状态 ───

export async function fetchStatus() {
  const res = await fetch(`${API_BASE}/`);
  if (!res.ok) throw new Error('获取状态失败');
  return res.json();
}

// ─── 配置相关 ───

export async function fetchConfig() {
  const res = await fetch(`${API_BASE}/admin/config`);
  if (!res.ok) throw new Error('获取配置失败');
  return res.json();
}

export async function updateConfig(key, value) {
  const res = await fetch(`${API_BASE}/admin/config/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: String(value) }),
  });
  if (!res.ok) throw new Error('更新配置失败');
  return res.json();
}

// ─── 批量操作 ───

export async function deleteMemories(ids) {
  const results = await Promise.allSettled(
    ids.map(id => deleteMemory(id))
  );
  const success = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  return { success, failed };
}

// ─── 种子导入 ───

export async function importSeeds() {
  const res = await fetch(`${API_BASE}/import/seed-memories`);
  if (!res.ok) throw new Error('导入失败');
  return res.json();
}
