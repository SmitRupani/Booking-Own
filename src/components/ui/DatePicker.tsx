'use client'

import { useState, useEffect } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Modal from './Modal'

interface DatePickerProps {
  value: Date | string | null
  onChange: (date: Date | string) => void
  minDate?: Date | string
  maxDate?: Date | string
  placeholder?: string
  className?: string
  returnFormat?: 'date' | 'string'
}

function getISTNowDate(): Date {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const istOffset = 5.5 * 60 * 60 * 1000
  return new Date(utc + istOffset)
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Select date',
  className = '',
  returnFormat = 'date',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const valueAsDate = value instanceof Date ? value : (value ? new Date(String(value) + 'T00:00:00') : null)
  const [currentMonth, setCurrentMonth] = useState<Date>(valueAsDate || new Date())

  const normalizedMinDate = minDate ? (minDate instanceof Date ? new Date(minDate) : new Date(String(minDate) + 'T00:00:00')) : null
  if (normalizedMinDate) normalizedMinDate.setHours(0, 0, 0, 0)

  const normalizedMaxDate = maxDate ? (maxDate instanceof Date ? new Date(maxDate) : new Date(String(maxDate) + 'T00:00:00')) : null
  if (normalizedMaxDate) normalizedMaxDate.setHours(23, 59, 59, 999)

  const formatDateDisplay = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const formatDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleDateClick = (date: Date) => {
    if (returnFormat === 'string') onChange(formatDateString(date))
    else onChange(date)
    setIsOpen(false)
  }

  // Calendar generation (simple copy of the bookingCopy algorithm)
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const monthNamesShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const daysOfWeek = ['Su','Mo','Tu','We','Th','Fr','Sa']

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay()

  const prevMonth = new Date(year, month, 0)
  const daysInPrevMonth = prevMonth.getDate()

  const calendarDays: Array<{ date: Date; isCurrentMonth: boolean }> = []
  for (let i = startingDayOfWeek - 1; i >= 0; i--) calendarDays.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false })
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push({ date: new Date(year, month, day), isCurrentMonth: true })
  const remaining = 42 - calendarDays.length
  for (let day = 1; day <= remaining; day++) calendarDays.push({ date: new Date(year, month + 1, day), isCurrentMonth: false })

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
  }

  const isSelected = (date: Date) => {
    if (!valueAsDate) return false
    return date.getDate() === valueAsDate.getDate() && date.getMonth() === valueAsDate.getMonth() && date.getFullYear() === valueAsDate.getFullYear()
  }

  const isDisabled = (date: Date) => {
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0,0,0,0)
    if (normalizedMinDate && normalizedDate < normalizedMinDate) return true
    if (normalizedMaxDate && normalizedDate > normalizedMaxDate) return true
    return false
  }

  const goToPreviousMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const goToNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  // Hydration guard
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t) }, [])

  const getRelativeLabel = () => {
    if (!valueAsDate) return null
    const today = new Date(); today.setHours(0,0,0,0)
    const selected = new Date(valueAsDate); selected.setHours(0,0,0,0)
    const diffTime = selected.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`
    return null
  }

  const relativeLabel = getRelativeLabel()

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn('group relative w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-br from-violet-600/90 via-purple-600/90 to-violet-700/90 hover:from-violet-500/90 hover:via-purple-500/90 hover:to-violet-600/90 border border-violet-400/30 shadow-lg transition-all','', isOpen && 'ring-2 ring-violet-400/50')}
        aria-label="Select date"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
          <CalendarDays className="h-5 w-5 text-white" />
        </div>

        <div className="flex-1 text-left">
          <p className="text-[10px] text-violet-200/70 uppercase tracking-wider font-medium">{relativeLabel || 'Selected Date'}</p>
          <p className="text-lg font-bold text-white">{valueAsDate ? formatDateDisplay(valueAsDate) : placeholder}</p>
        </div>

        <div className={cn('w-6 h-6 rounded-full bg-white/10 flex items-center justify-center transition-transform duration-300', isOpen && 'rotate-180')}>
          <ChevronLeft className="h-4 w-4 text-white/70 rotate-[-90deg]" />
        </div>
      </button>

      {mounted && (
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`${monthNames[month]} ${year}`}>
          <div className="px-2">
            <div className="flex items-center justify-between px-2 py-3">
              <button type="button" onClick={(e) => { e.stopPropagation(); goToPreviousMonth() }} className="p-2 rounded-lg">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-sm font-semibold text-white">{monthNamesShort[month]} {year}</div>
              <button type="button" onClick={(e) => { e.stopPropagation(); goToNextMonth() }} className="p-2 rounded-lg">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0 px-3 py-2 bg-white/[0.02]">
              {daysOfWeek.map((day) => (
                <div key={day} className="text-[10px] font-bold text-gray-500 text-center py-1 uppercase">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 p-3">
              {calendarDays.map(({ date, isCurrentMonth }, index) => {
                const disabled = isDisabled(date)
                const selected = isSelected(date)
                const today = isToday(date)

                return (
                  <button
                    key={`${date.toISOString()}-${index}`}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); if (!disabled) handleDateClick(date) }}
                    disabled={disabled}
                    className={cn('aspect-square rounded-lg text-sm font-medium transition-all duration-200 relative', !isCurrentMonth && !disabled && 'opacity-60 text-gray-400 hover:opacity-100 hover:bg-violet-500/20 hover:scale-105 active:scale-95 hover:text-white', !isCurrentMonth && disabled && 'opacity-20 cursor-not-allowed', isCurrentMonth && !disabled && 'hover:bg-violet-500/20 hover:scale-105 active:scale-95', disabled && isCurrentMonth && 'opacity-30 cursor-not-allowed hover:bg-transparent hover:scale-100', selected && 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg scale-105 font-bold', today && !selected && 'bg-white/10 text-violet-400 font-bold ring-2 ring-violet-500/50', !selected && !today && isCurrentMonth && !disabled && 'text-gray-300 hover:text-white')}
                  >
                    {date.getDate()}
                    {today && !selected && (<span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-violet-400 rounded-full" />)}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-white/[0.02]">
              <button type="button" onClick={(e) => { e.stopPropagation(); const todayStr = getISTNowDate().toISOString().slice(0,10); handleDateClick(new Date(todayStr + 'T00:00:00')) }} className="flex items-center gap-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors px-3 py-2 hover:bg-violet-500/10 rounded-lg">
                <CalendarDays className="w-4 h-4" /> Today
              </button>
              <button type="button" onClick={() => setIsOpen(false)} className="text-sm font-medium text-gray-400 hover:text-white transition-colors px-4 py-2 hover:bg-white/5 rounded-lg">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default DatePicker
