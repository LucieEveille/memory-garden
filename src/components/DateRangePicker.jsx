import { useState, useRef, useEffect } from 'react'

// 工具函数
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay() // 0=周日
}

function fmt(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
}

function fmtShort(date) {
  if (!date) return ''
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function sameDay(a, b) {
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function inRange(day, start, end) {
  if (!start || !end) return false
  const t = day.getTime()
  const s = start.getTime()
  const e = end.getTime()
  return t >= Math.min(s, e) && t <= Math.max(s, e)
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function DateRangePicker({ startDate, endDate, onChange }) {
  const [open, setOpen] = useState(false)
  const [picking, setPicking] = useState(null) // null | 'start' | 'end'
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [hoverDate, setHoverDate] = useState(null)
  const ref = useRef(null)

  // 点击外部关闭
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setPicking(null)
        setHoverDate(null)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  // 打开时定位到已选日期或今天
  const handleOpen = () => {
    if (open) {
      setOpen(false)
      return
    }
    const target = startDate || new Date()
    setViewYear(target.getFullYear())
    setViewMonth(target.getMonth())
    setPicking(startDate ? null : 'start')
    setOpen(true)
  }

  // 翻月
  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  // 点击日期
  const handleClickDay = (day) => {
    if (picking === 'start' || (!picking && !startDate)) {
      // 选了开始日期
      onChange(day, null)
      setPicking('end')
    } else if (picking === 'end') {
      // 选了结束日期
      let s = startDate, e = day
      if (s && e.getTime() < s.getTime()) [s, e] = [e, s]
      onChange(s, e)
      setPicking(null)
    } else {
      // 已经有范围了，重新选
      onChange(day, null)
      setPicking('end')
    }
  }

  // 清除
  const handleClear = (e) => {
    e.stopPropagation()
    onChange(null, null)
    setPicking(null)
    setHoverDate(null)
    setOpen(false)
  }

  // 快捷选择
  const selectPreset = (daysAgo) => {
    const end = new Date()
    end.setHours(23, 59, 59, 999)
    const start = new Date()
    start.setDate(start.getDate() - daysAgo)
    start.setHours(0, 0, 0, 0)
    onChange(start, end)
    setPicking(null)
    setOpen(false)
  }

  const selectToday = () => {
    const d = new Date()
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
    onChange(start, end)
    setPicking(null)
    setOpen(false)
  }

  // 生成日历网格
  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)
  const today = new Date()

  // 预览范围（hover 时）
  const previewEnd = picking === 'end' ? hoverDate : null

  // 按钮文案
  const hasRange = startDate && endDate
  const hasStart = startDate && !endDate
  const btnLabel = hasRange
    ? `${fmtShort(startDate)} - ${fmtShort(endDate)}`
    : hasStart
      ? `${fmtShort(startDate)} - ?`
      : '日历'

  return (
    <div className="relative" ref={ref}>
      {/* 触发按钮 */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors whitespace-nowrap hover-gray"
        style={{
          color: hasRange ? '#111827' : '#9CA3AF',
          backgroundColor: hasRange ? '#F3F4F6' : open ? '#F3F4F6' : undefined,
          fontWeight: hasRange ? 600 : 400,
        }}
      >
        <span style={{ fontSize: '0.7rem' }}>📅</span>
        {btnLabel}
        {hasRange && (
          <span
            onClick={handleClear}
            className="ml-0.5 hover:text-mg-text"
            style={{ fontSize: '0.6rem' }}
          >
            ✕
          </span>
        )}
      </button>

      {/* 日历面板 */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 bg-white border border-mg-border rounded-xl shadow-lg"
          style={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            width: '280px',
            padding: '12px',
          }}
        >
          {/* 提示 */}
          {picking && (
            <div className="text-center text-xs text-mg-text-muted mb-2">
              {picking === 'start' ? '选择开始日期' : '选择结束日期'}
            </div>
          )}

          {/* 快捷选择 */}
          <div className="flex gap-1 mb-3">
            {[
              { label: '今天', fn: selectToday },
              { label: '近7天', fn: () => selectPreset(6) },
              { label: '近30天', fn: () => selectPreset(29) },
            ].map(p => (
              <button
                key={p.label}
                onClick={p.fn}
                className="flex-1 py-1 text-xs rounded-md border border-mg-border text-mg-text-secondary hover:bg-mg-input-bg hover:text-mg-text transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* 月份导航 */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-mg-input-bg text-mg-text-secondary hover:text-mg-text transition-colors"
            >
              ‹
            </button>
            <span className="text-sm font-medium text-mg-text">
              {viewYear}年{viewMonth + 1}月
            </span>
            <button
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-mg-input-bg text-mg-text-secondary hover:text-mg-text transition-colors"
            >
              ›
            </button>
          </div>

          {/* 星期头 */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs text-mg-text-muted py-1">
                {d}
              </div>
            ))}
          </div>

          {/* 日期网格 */}
          <div className="grid grid-cols-7">
            {/* 前置空格 */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {/* 日期 */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const date = new Date(viewYear, viewMonth, dayNum)
              const isToday = sameDay(date, today)
              const isStart = sameDay(date, startDate)
              const isEnd = sameDay(date, endDate)
              const isSelected = isStart || isEnd

              // 范围判定：已确定的范围 or hover预览
              const actualEnd = previewEnd || endDate
              const isInRange = startDate && actualEnd && inRange(date, startDate, actualEnd) && !isSelected

              // 是否是未来
              const isFuture = date.getTime() > new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime()

              // 单日选择 vs 范围选择的圆角
              const isRangeMode = startDate && (endDate || previewEnd)
              const rangeEnd = previewEnd || endDate
              let radius = '6px'
              if (isRangeMode && (isStart || isEnd || isInRange)) {
                const isRangeStart = sameDay(date, startDate)
                const isRangeEnd = sameDay(date, rangeEnd)
                if (isRangeStart && isRangeEnd) radius = '6px'
                else if (isRangeStart) radius = '6px 0 0 6px'
                else if (isRangeEnd) radius = '0 6px 6px 0'
                else radius = '0'
              }

              return (
                <button
                  key={dayNum}
                  onClick={() => !isFuture && handleClickDay(date)}
                  onMouseEnter={() => {
                    if (picking === 'end') setHoverDate(date)
                  }}
                  onMouseLeave={() => setHoverDate(null)}
                  className="h-8 flex items-center justify-center text-xs transition-all relative group"
                  style={{
                    color: isFuture
                      ? '#D1D5DB'
                      : isSelected
                        ? '#FFFFFF'
                        : isToday
                          ? '#111827'
                          : isInRange
                            ? '#111827'
                            : '#6B7280',
                    backgroundColor: isSelected
                      ? '#111827'
                      : isInRange
                        ? '#F3F4F6'
                        : 'transparent',
                    fontWeight: isSelected || isToday ? 600 : 400,
                    cursor: isFuture ? 'default' : 'pointer',
                    borderRadius: radius,
                  }}
                >
                  {/* hover 浅灰背景 */}
                  {!isFuture && !isSelected && !isInRange && (
                    <span
                      className="absolute inset-0 rounded-md bg-mg-input-bg opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                  <span className="relative">{dayNum}</span>
                  {isToday && (
                    <span
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ backgroundColor: isSelected ? '#FFFFFF' : '#111827' }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* 已选范围显示 */}
          {hasRange && (
            <div className="mt-3 pt-2 border-t border-mg-border flex items-center justify-between">
              <span className="text-xs text-mg-text-secondary">
                {fmt(startDate)} → {fmt(endDate)}
              </span>
              <button
                onClick={handleClear}
                className="text-xs text-mg-text-muted hover:text-mg-text transition-colors"
              >
                清除
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
