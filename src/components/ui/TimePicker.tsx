'use client'

import { useMemo } from 'react'
import Button from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Sunrise, Sun, Sunset } from 'lucide-react'

function getISTTodayString(): string {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const istOffset = 5.5 * 60 * 60 * 1000
  return new Date(utc + istOffset).toISOString().slice(0,10)
}

function getISTNowDate(): Date {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const istOffset = 5.5 * 60 * 60 * 1000
  return new Date(utc + istOffset)
}

interface TimePickerProps {
  date: string
  value: string
  onChange: (time: string) => void
  minTime?: string
  maxTime?: string
  stepMinutes?: number
  label?: string
  helperText?: string
  className?: string
  disabledTimes?: string[]
}

export function TimePicker({
  date,
  value,
  onChange,
  minTime = '08:00',
  maxTime = '20:00',
  stepMinutes = 60,
  label,
  helperText,
  className,
  disabledTimes = [],
}: TimePickerProps) {
  const timeGroups = useMemo(() => {
    const times: string[] = []
    const [minHour, minMinute] = minTime.split(':').map(Number)
    const [maxHour, maxMinute] = maxTime.split(':').map(Number)

    const minTotalMinutes = minHour * 60 + minMinute
    const maxTotalMinutes = maxHour * 60 + maxMinute

    for (let totalMinutes = minTotalMinutes; totalMinutes <= maxTotalMinutes; totalMinutes += stepMinutes) {
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      times.push(`${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}`)
    }

    const today = getISTTodayString()
    let availableTimes = times

    if (date === today) {
      const now = getISTNowDate()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentTotalMinutes = currentHour * 60 + currentMinute
      const roundedCurrentMinutes = Math.ceil(currentTotalMinutes / stepMinutes) * stepMinutes

      availableTimes = times.filter((time) => {
        const [hour, minute] = time.split(':').map(Number)
        const timeTotalMinutes = hour * 60 + minute
        return timeTotalMinutes >= roundedCurrentMinutes
      })
    }

    const morning = availableTimes.filter(time => { const hour = parseInt(time.split(':')[0]); return hour >= 5 && hour < 12 })
    const afternoon = availableTimes.filter(time => { const hour = parseInt(time.split(':')[0]); return hour >= 12 && hour < 17 })
    const evening = availableTimes.filter(time => { const hour = parseInt(time.split(':')[0]); return hour >= 17 })

    return { morning, afternoon, evening }
  }, [date, minTime, maxTime, stepMinutes])

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return `${displayHours}:${minutes.toString().padStart(2,'0')} ${period}`
  }

  const isTimeDisabled = (time: string) => disabledTimes.includes(time)

  const renderTimeGroup = (times: string[], title: string, icon: React.ReactNode) => {
    if (times.length === 0) return null

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-text-muted">{icon}<span>{title}</span></div>
        <div className="flex flex-wrap gap-2">
          {times.map((time) => {
            const disabled = isTimeDisabled(time)
            return (
              <Button
                key={time}
                variant={value === time ? 'default' : 'ghost'}
                size="sm"
                onClick={() => !disabled && onChange(time)}
                disabled={disabled}
                className={cn('min-w-[100px]', value === time && 'shadow-lg shadow-accent-blue/30', disabled && 'opacity-40 cursor-not-allowed')}
              >
                {formatTime(time)}
              </Button>
            )
          })}
        </div>
      </div>
    )
  }

  const hasAnyTimes = timeGroups.morning.length + timeGroups.afternoon.length + timeGroups.evening.length > 0

  return (
    <div className={cn('space-y-4', className)}>
      {label && <label className="text-sm font-medium text-text-main">{label}</label>}
      {helperText && <p className="text-xs text-text-muted">{helperText}</p>}

      {!hasAnyTimes ? (
        <p className="text-sm text-text-muted py-4">No available times for this date</p>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto p-1">
          {renderTimeGroup(timeGroups.morning, 'Morning', <Sunrise className="h-4 w-4" />)}
          {renderTimeGroup(timeGroups.afternoon, 'Afternoon', <Sun className="h-4 w-4" />)}
          {renderTimeGroup(timeGroups.evening, 'Evening', <Sunset className="h-4 w-4" />)}
        </div>
      )}
    </div>
  )
}

export default TimePicker
