import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { path: '/browse', label: '浏览', icon: '📜' },
  { path: '/search', label: '搜索', icon: '🔍' },
  { path: '/add', label: '添加', icon: '✨' },
  { path: '/settings', label: '设置', icon: '⚙️' },
]

export default function Layout() {
  return (
    <div className="min-h-dvh bg-palace-cream flex flex-col">
      {/* 顶部标题栏 */}
      <header className="bg-palace-warm/80 backdrop-blur-sm border-b border-palace-border sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-semibold text-palace-gold-dark tracking-wide">
            🌿 记忆花园
          </h1>
          <span className="text-xs text-palace-text-muted font-body">
            Memory Garden
          </span>
        </div>
      </header>

      {/* Tab 导航 */}
      <nav className="bg-palace-warm/50 border-b border-palace-border">
        <div className="max-w-2xl mx-auto px-4 flex">
          {tabs.map(tab => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex-1 text-center py-3 text-sm font-body transition-all duration-200 border-b-2 ${
                  isActive
                    ? 'border-palace-gold text-palace-gold-dark font-medium'
                    : 'border-transparent text-palace-text-muted hover:text-palace-text-light hover:border-palace-gold-light'
                }`
              }
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* 页面内容 */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5">
        <Outlet />
      </main>

      {/* 底部 */}
      <footer className="text-center py-4 text-xs text-palace-text-muted border-t border-palace-border">
        记忆花园 v0.1 · Lucie & Fidélis
      </footer>
    </div>
  )
}
