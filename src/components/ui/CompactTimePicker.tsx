'use client'

import { useMemo, useState, useEffect } from 'react'
import { Clock, ChevronDown, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import Modal from './Modal'

function getISTNowDate(): Date {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const istOffset = 5.5 * 60 * 60 * 1000
  return new Date(utc + istOffset)
}

interface CompactTimePickerProps {
  date: string
  value: string
  onChange: (time: string) => void
  minTime?: string
  maxTime?: string
  stepMinutes?: number
  label?: string
  className?: string
  durationHint?: string
}

export function CompactTimePicker({
  date,
  value,
  onChange,
  minTime = '09:00',
  maxTime = '20:00',
  stepMinutes = 30,
  label,
  className,
  durationHint,
}: CompactTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  // mounted guard not required here; keep consistent rendering flow

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    if (isOpen) { window.addEventListener('keydown', handleEscape); return () => window.removeEventListener('keydown', handleEscape) }
  }, [isOpen])

  const availableTimes = useMemo(() => {
    const times: string[] = []
    const [minHour, minMinute] = minTime.split(':').map(Number)
    const [maxHour, maxMinute] = maxTime.split(':').map(Number)
    const minTotalMinutes = minHour * 60 + minMinute
    const maxTotalMinutes = maxHour * 60 + maxMinute

    for (let totalMinutes = minTotalMinutes; totalMinutes <= maxTotalMinutes; totalMinutes += stepMinutes) {
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      times.push(`${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`)
    }

    const today = getISTNowDate().toISOString().slice(0,10)
    if (date === today) {
      const now = getISTNowDate()
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes()
      const roundedCurrentMinutes = Math.ceil(currentTotalMinutes / stepMinutes) * stepMinutes
      return times.filter((time) => { const [hour, minute] = time.split(':').map(Number); return hour * 60 + minute >= roundedCurrentMinutes })
    }
    return times
  }, [date, minTime, maxTime, stepMinutes])

  const getQuickSlots = useMemo(() => {
    const today = getISTNowDate().toISOString().slice(0,10)
    const now = getISTNowDate()
    const slots: { label: string; time: string; icon?: string }[] = []
    if (date === today) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      const roundedMinutes = Math.ceil(currentMinutes / stepMinutes) * stepMinutes
      const nowTime = `${String(Math.floor(roundedMinutes/60)).padStart(2,'0')}:${String(roundedMinutes%60).padStart(2,'0')}`
      if (availableTimes.includes(nowTime)) slots.push({ label: 'Now', time: nowTime, icon: '⚡' })
      const plus30 = roundedMinutes + 30
      const plus30Time = `${String(Math.floor(plus30/60)).padStart(2,'0')}:${String(plus30%60).padStart(2,'0')}`
      if (availableTimes.includes(plus30Time)) slots.push({ label: '+30m', time: plus30Time })
      const plus60 = roundedMinutes + 60
      const plus60Time = `${String(Math.floor(plus60/60)).padStart(2,'0')}:${String(plus60%60).padStart(2,'0')}`
      if (availableTimes.includes(plus60Time)) slots.push({ label: '+1h', time: plus60Time })
    } else {
      ;['09:00','10:00','12:00','14:00'].forEach((time,i)=>{ if (availableTimes.includes(time)) slots.push({ label: ['9 AM','10 AM','12 PM','2 PM'][i], time }) })
    }
    return slots.slice(0,4)
  }, [date, availableTimes, stepMinutes])

  const timeGroups = useMemo(() => ({
    morning: availableTimes.filter(t => { const h = parseInt(t.split(':')[0]); return h >= 5 && h < 12 }),
    afternoon: availableTimes.filter(t => { const h = parseInt(t.split(':')[0]); return h >= 12 && h < 17 }),
    evening: availableTimes.filter(t => { const h = parseInt(t.split(':')[0]); return h >= 17 }),
  }), [availableTimes])

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${displayHours}:${String(minutes).padStart(2,'0')} ${period}`
  }

  const handleTimeSelect = (time: string) => { onChange(time); setIsOpen(false) }

  if (availableTimes.length === 0) {
    return (
      <div className={cn('', className)}>
        {label && <label className="text-sm font-medium text-text-main mb-2 block">{label}</label>}
        <div className="bg-surface-card/50 rounded-xl p-4 text-center text-text-muted text-sm">No available times for this date</div>
      </div>
    )
  }

  return (
    <>
      <div className={cn('', className)}>
        {label && <label className="text-sm font-medium text-text-main mb-3 block">{label}</label>}

        <div className="bg-gradient-to-br from-surface-card to-surface-card/80 rounded-xl border border-border-subtle p-4 space-y-3">
          {getQuickSlots.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-text-muted mr-1">Quick:</span>
              {getQuickSlots.map((slot) => (
                <button key={slot.time} onClick={() => onChange(slot.time)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200', value === slot.time ? 'bg-accent-blue text-white shadow-lg' : 'bg-surface-elevated hover:bg-surface-elevated/80 text-text-main border border-border-subtle')}>{slot.icon && <span className="mr-1">{slot.icon}</span>}{slot.label}</button>
              ))}
            </div>
          )}

          <button onClick={() => setIsOpen(true)} className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-surface-elevated border border-border-subtle hover:border-accent-blue/50 transition-all duration-200 text-left group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center"><Clock className="h-4 w-4 text-accent-blue" /></div>
              <div>
                <div className="text-xs text-text-muted">Pickup at</div>
                <div className="text-sm font-semibold text-text-main">{formatTime(value)}</div>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-text-muted group-hover:text-accent-blue transition-colors" />
          </button>

          {durationHint && <div className="flex items-center gap-2 text-xs text-text-muted"><span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>{durationHint}</div>}
        </div>
      </div>

      {isOpen && (
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Select Time">
          <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: '45vh' }}>
            {timeGroups.morning.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-text-muted"><span>🌅</span><span>Morning</span></div>
                <div className="grid grid-cols-3 gap-2">
                  {timeGroups.morning.map((time) => (
                    <button key={time} onClick={() => handleTimeSelect(time)} className={cn('px-2 py-2.5 rounded-lg text-sm font-medium transition-all', value === time ? 'bg-accent-blue text-white shadow-lg' : 'bg-surface-elevated hover:bg-accent-blue/20 text-text-main border border-border-subtle')}>{formatTime(time)}</button>
                  ))}
                </div>
              </div>
            )}

            {timeGroups.afternoon.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-text-muted"><span>☀️</span><span>Afternoon</span></div>
                <div className="grid grid-cols-3 gap-2">
                  {timeGroups.afternoon.map((time) => (
                    <button key={time} onClick={() => handleTimeSelect(time)} className={cn('px-2 py-2.5 rounded-lg text-sm font-medium transition-all', value === time ? 'bg-accent-blue text-white shadow-lg' : 'bg-surface-elevated hover:bg-accent-blue/20 text-text-main border border-border-subtle')}>{formatTime(time)}</button>
                  ))}
                </div>
              </div>
            )}

            {timeGroups.evening.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-text-muted"><span>🌆</span><span>Evening</span></div>
                <div className="grid grid-cols-3 gap-2">
                  {timeGroups.evening.map((time) => (
                    <button key={time} onClick={() => handleTimeSelect(time)} className={cn('px-2 py-2.5 rounded-lg text-sm font-medium transition-all', value === time ? 'bg-accent-blue text-white shadow-lg' : 'bg-surface-elevated hover:bg-accent-blue/20 text-text-main border border-border-subtle')}>{formatTime(time)}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border-subtle flex items-center justify-between"><span className="text-sm text-text-muted">Selected:</span><span className="text-lg font-bold text-accent-blue">{formatTime(value)}</span></div>
        </Modal>
      )}
    </>
  )
}

export default CompactTimePicker
