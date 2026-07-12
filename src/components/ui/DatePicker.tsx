'use client'

import * as React from "react"
import { format } from "date-fns"
import { CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { Calendar } from "@/components/ui/Calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value: Date | string | null
  onChange: (date: Date | string) => void
  minDate?: Date | string
  maxDate?: Date | string
  placeholder?: string
  className?: string
  returnFormat?: 'date' | 'string'
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Select date",
  className = "",
  returnFormat = "date",
}: DatePickerProps) {
  // Parse incoming value to a Date object
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    const parsed = Date.parse(value)
    if (isNaN(parsed)) return undefined
    return new Date(parsed)
  }, [value])

  const parsedMinDate = React.useMemo(() => {
    if (!minDate) return undefined
    if (minDate instanceof Date) return minDate
    const parsed = Date.parse(minDate)
    return isNaN(parsed) ? undefined : new Date(parsed)
  }, [minDate])

  const parsedMaxDate = React.useMemo(() => {
    if (!maxDate) return undefined
    if (maxDate instanceof Date) return maxDate
    const parsed = Date.parse(maxDate)
    return isNaN(parsed) ? undefined : new Date(parsed)
  }, [maxDate])

  const handleSelect = (date: Date | undefined) => {
    if (!date) return
    if (returnFormat === "string") {
      const yyyy = date.getFullYear()
      const mm = String(date.getMonth() + 1).padStart(2, "0")
      const dd = String(date.getDate()).padStart(2, "0")
      onChange(`${yyyy}-${mm}-${dd}`)
    } else {
      onChange(date)
    }
  }

  // Check if a day is disabled
  const disabledDays = React.useCallback(
    (day: Date) => {
      if (parsedMinDate) {
        const checkDay = new Date(day)
        checkDay.setHours(0, 0, 0, 0)
        const checkMin = new Date(parsedMinDate)
        checkMin.setHours(0, 0, 0, 0)
        if (checkDay < checkMin) return true
      }
      if (parsedMaxDate) {
        const checkDay = new Date(day)
        checkDay.setHours(23, 59, 59, 999)
        const checkMax = new Date(parsedMaxDate)
        checkMax.setHours(23, 59, 59, 999)
        if (day > checkMax) return true
      }
      return false
    },
    [parsedMinDate, parsedMaxDate]
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal h-11 rounded-xl border bg-secondary/30 border-border/50 text-sm hover:bg-secondary/40 text-foreground",
            !selectedDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
          {selectedDate ? format(selectedDate, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border border-border/50 bg-background rounded-xl" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={disabledDays}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export default DatePicker
