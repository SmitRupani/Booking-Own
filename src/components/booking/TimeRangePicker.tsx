'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { POLICIES } from '@/lib/policies-constants';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, ChevronDown, Zap, Clock, Sparkles } from 'lucide-react';

export interface BusySlot {
    start: string; // HH:MM format
    end: string;
    /** When set, block slots are shown separately from bookings (reason shown in UI). */
    source?: 'booking' | 'block';
    reason?: string;
    blockType?: 'MAINTENANCE' | 'EVENT';
}

interface TimeRangePickerProps {
    date: string; // YYYY-MM-DD
    busySlots: BusySlot[];
    workingHours: { start: string; end: string }; // HH:MM format
    onSelect: (start: Date, end: Date) => void;
    isGroupBooking?: boolean;
    /** Minimum minutes before start that a slot can be booked (e.g. 30). */
    minLeadMinutes?: number;
}

type ClientPolicies = Partial<
    Record<
        'MIN_BOOKING_DURATION_MINUTES' | 'MAX_BOOKING_DURATION_MINUTES',
        number
    >
>;

function formatDurationLabel(minutes: number): string {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h} hour${h === 1 ? '' : 's'}`;
    return `${h}h ${m}m`;
}

function buildDurationOptions(minMinutes: number, maxMinutes: number) {
    const presets = [
        15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300, 360, 420, 480, 540, 600,
    ];
    const values = presets
        .filter((v) => v >= minMinutes && v <= maxMinutes)
        .sort((a, b) => a - b);

    if (!values.includes(minMinutes)) values.unshift(minMinutes);
    if (!values.includes(maxMinutes)) values.push(maxMinutes);

    const unique = Array.from(new Set(values));

    return unique.map((value) => ({
        value,
        label: formatDurationLabel(value),
        icon:
            value <= 15 ? '⚡' :
                value <= 30 ? '🕐' :
                    value <= 60 ? '⏰' :
                        value <= 120 ? '🕓' :
                            '🕘',
    }));
}

// Get current IST time in minutes since midnight
function getISTCurrentTimeMinutes(): number {
    const now = new Date();
    const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istString);
    return istDate.getHours() * 60 + istDate.getMinutes();
}

// Get today's date in IST as YYYY-MM-DD
function getISTTodayString(): string {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    return formatter.format(now);
}

export default function TimeRangePicker({
    date,
    busySlots,
    workingHours,
    onSelect,
    isGroupBooking = false,
    minLeadMinutes = 0,
}: TimeRangePickerProps) {
    const [selectedStartTime, setSelectedStartTime] = useState<number | null>(null);
    const [selectedDuration, setSelectedDuration] = useState<number>(30);
    const [showStartDropdown, setShowStartDropdown] = useState(false);
    const [showDurationDropdown, setShowDurationDropdown] = useState(false);
    const [noSlotsAvailable, setNoSlotsAvailable] = useState<boolean>(false);
    const [clientPolicies, setClientPolicies] = useState<ClientPolicies>({});

    // Reset selection when date changes
    useEffect(() => {
        setSelectedStartTime(null);
        setNoSlotsAvailable(false);
    }, [date]);

    // Fetch dynamic policy values so UI matches admin settings
    useEffect(() => {
        const loadPolicies = async () => {
            try {
                const res = await fetch('/api/policies/client');
                if (!res.ok) return;
                const data = await res.json();
                setClientPolicies(data.policies || {});
            } catch {
                // Non-fatal: UI falls back to static POLICIES defaults
            }
        };
        loadPolicies();
    }, []);

    const startDropdownRef = useRef<HTMLDivElement>(null);
    const durationDropdownRef = useRef<HTMLDivElement>(null);
    const onSelectRef = useRef(onSelect);

    // Keep onSelectRef up to date
    useEffect(() => {
        onSelectRef.current = onSelect;
    }, [onSelect]);

    // State for current time that updates periodically
    const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(getISTCurrentTimeMinutes);

    // Update current time every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTimeMinutes(getISTCurrentTimeMinutes());
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (startDropdownRef.current && !startDropdownRef.current.contains(event.target as Node)) {
                setShowStartDropdown(false);
            }
            if (durationDropdownRef.current && !durationDropdownRef.current.contains(event.target as Node)) {
                setShowDurationDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Convert HH:MM to minutes since midnight
    const parseTime = (timeStr: string): number => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // Convert minutes since midnight to HH:MM in 12-hour format
    const formatTime12 = (minutes: number): string => {
        const hours24 = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const hours12 = hours24 % 12 || 12;
        const ampm = hours24 < 12 ? 'AM' : 'PM';
        return `${hours12}:${mins.toString().padStart(2, '0')} ${ampm}`;
    };

    // Convert minutes to HH:MM format
    const formatTimeHHMM = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const workStart = parseTime(workingHours.start);
    const workEnd = parseTime(workingHours.end);
    const totalMinutes = workEnd - workStart;

    const effectiveMinDuration =
        clientPolicies.MIN_BOOKING_DURATION_MINUTES ?? POLICIES.MIN_BOOKING_DURATION_MINUTES;
    const effectiveMaxDuration =
        clientPolicies.MAX_BOOKING_DURATION_MINUTES ?? POLICIES.MAX_BOOKING_DURATION_MINUTES;

    const durationOptions = useMemo(
        () => buildDurationOptions(effectiveMinDuration, effectiveMaxDuration),
        [effectiveMinDuration, effectiveMaxDuration]
    );

    // Check if date is today in IST
    const isToday = useMemo(() => {
        const todayIST = getISTTodayString();
        return date === todayIST;
    }, [date]);

    // Calculate the earliest bookable time
    const earliestBookableTime = useMemo(() => {
        if (!isToday) return workStart;

        const gracePeriod = 2;
        const earliestTime = Math.ceil((currentTimeMinutes + gracePeriod + minLeadMinutes) / 15) * 15;

        if (earliestTime >= workEnd) {
            return workEnd + 1; // No slots available
        }

        return Math.max(earliestTime, workStart);
    }, [isToday, currentTimeMinutes, workStart, workEnd, minLeadMinutes]);

    // Calculate position percentage for timeline
    const getPosition = (minutes: number): number => {
        return ((minutes - workStart) / totalMinutes) * 100;
    };

    // Check if a range overlaps with busy slots or past time
    const isRangeValid = (start: number, end: number): boolean => {
        if (start < workStart || end > workEnd) return false;
        if (end - start < effectiveMinDuration) return false;
        if (end - start > effectiveMaxDuration) return false;

        if (earliestBookableTime > workEnd) return false;
        if (start < earliestBookableTime) return false;

        for (const slot of busySlots) {
            const slotStart = parseTime(slot.start);
            const slotEnd = parseTime(slot.end);
            if (start < slotEnd && end > slotStart) return false;
        }

        return true;
    };

    // Generate available start times (15-minute increments)
    const availableStartTimes = useMemo(() => {
        const times: number[] = [];

        if (earliestBookableTime > workEnd) {
            return times;
        }

        for (let t = earliestBookableTime; t <= workEnd - effectiveMinDuration; t += 15) {
            let isValid = true;
            const end = t + effectiveMinDuration;

            for (const slot of busySlots) {
                const slotStart = parseTime(slot.start);
                const slotEnd = parseTime(slot.end);
                if (t < slotEnd && end > slotStart) {
                    isValid = false;
                    break;
                }
            }

            if (isValid) {
                times.push(t);
            }
        }

        return times;
    }, [busySlots, earliestBookableTime, workEnd, effectiveMinDuration]);

    // Get available durations for the selected start time
    const availableDurations = useMemo(() => {
        if (selectedStartTime === null) return durationOptions;

        return durationOptions.filter(option => {
            const end = selectedStartTime + option.value;
            return end <= workEnd && isRangeValid(selectedStartTime, end);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStartTime, durationOptions, workEnd, earliestBookableTime]);

    // Generate quick slots (pre-computed available time ranges)
    const quickSlots = useMemo(() => {
        const slots: Array<{ start: number; end: number }> = [];

        if (earliestBookableTime > workEnd) {
            return slots;
        }

        const sortedBusy = [...busySlots]
            .map(s => ({ start: parseTime(s.start), end: parseTime(s.end) }))
            .sort((a, b) => a.start - b.start);

        let searchStart = earliestBookableTime;

        const busyWithEnd = [...sortedBusy, { start: workEnd, end: workEnd }];

        for (const busy of busyWithEnd) {
            if (searchStart < busy.start) {
                let slotStart = searchStart;
                while (slotStart + effectiveMinDuration <= busy.start && slots.length < 6) {
                    let slotDuration = Math.min(60, effectiveMaxDuration);
                    if (slotStart + slotDuration > busy.start) {
                        slotDuration = Math.min(30, effectiveMaxDuration);
                    }
                    if (slotStart + slotDuration > busy.start) {
                        slotDuration = effectiveMinDuration;
                    }

                    const end = slotStart + slotDuration;
                    if (end <= workEnd && end - slotStart >= effectiveMinDuration) {
                        let isValid = true;
                        for (const s of busySlots) {
                            const sStart = parseTime(s.start);
                            const sEnd = parseTime(s.end);
                            if (slotStart < sEnd && end > sStart) {
                                isValid = false;
                                break;
                            }
                        }
                        if (isValid) {
                            slots.push({ start: slotStart, end });
                        }
                    }
                    slotStart += slotDuration;
                }
            }
            searchStart = Math.max(searchStart, busy.end);
        }

        return slots.slice(0, 6);
    }, [busySlots, earliestBookableTime, workEnd, effectiveMinDuration, effectiveMaxDuration]);

    // Auto-select first available slot on mount
    useEffect(() => {
        if (availableStartTimes.length > 0 && selectedStartTime === null) {
            const firstStart = availableStartTimes[0];
            setSelectedStartTime(firstStart);

            const validDurations = durationOptions.filter(d => isRangeValid(firstStart, firstStart + d.value));
            if (validDurations.length > 0) {
                const preferred = validDurations.find(d => d.value === 30) || validDurations[0];
                setSelectedDuration(preferred.value);
            }
            setNoSlotsAvailable(false);
        } else if (availableStartTimes.length === 0) {
            setNoSlotsAvailable(true);
            setSelectedStartTime(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableStartTimes, durationOptions]);

    // When duration changes, validate and adjust if needed
    useEffect(() => {
        if (selectedStartTime !== null) {
            if (!isRangeValid(selectedStartTime, selectedStartTime + selectedDuration)) {
                const validDuration = availableDurations[0];
                if (validDuration) {
                    setSelectedDuration(validDuration.value);
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStartTime, selectedDuration, availableDurations]);

    // Notify parent when selection changes
    useEffect(() => {
        if (selectedStartTime !== null && isRangeValid(selectedStartTime, selectedStartTime + selectedDuration)) {
            const startDate = new Date(`${date}T${formatTimeHHMM(selectedStartTime)}:00+05:30`);
            const endDate = new Date(`${date}T${formatTimeHHMM(selectedStartTime + selectedDuration)}:00+05:30`);
            onSelectRef.current(startDate, endDate);
        }
    }, [selectedStartTime, selectedDuration, date]);

    const handleQuickSlotSelect = (start: number, end: number) => {
        setSelectedStartTime(start);
        setSelectedDuration(end - start);
    };

    const hourMarkers = [];
    for (let hour = Math.ceil(workStart / 60); hour <= Math.floor(workEnd / 60); hour++) {
        const minutes = hour * 60;
        if (minutes >= workStart && minutes <= workEnd) {
            hourMarkers.push({
                minutes,
                position: getPosition(minutes),
                label: formatTime12(minutes).replace(':00 ', ' '),
            });
        }
    }

    const selectedEnd = selectedStartTime !== null ? selectedStartTime + selectedDuration : null;
    const isCurrentSelectionValid = selectedStartTime !== null && selectedEnd !== null && isRangeValid(selectedStartTime, selectedEnd);

    const timelineEarliestBookable = Math.min(earliestBookableTime, workEnd);

    const selectionIssueMessage = useMemo((): string | null => {
        if (selectedStartTime === null) return null;
        const start = selectedStartTime;
        const end = selectedStartTime + selectedDuration;
        if (start < workStart || end > workEnd) return 'Selection is outside working hours.';
        if (end - start < effectiveMinDuration) {
            return `Bookings must be at least ${effectiveMinDuration} minutes.`;
        }
        if (end - start > effectiveMaxDuration) {
            return `Bookings cannot exceed ${formatDurationLabel(effectiveMaxDuration)}.`;
        }
        if (earliestBookableTime > workEnd) return 'Working hours have ended for today.';
        if (start < earliestBookableTime) return 'Start time is too soon or in the past.';
        for (const slot of busySlots) {
            const slotStart = parseTime(slot.start);
            const slotEnd = parseTime(slot.end);
            if (start < slotEnd && end > slotStart) {
                if (slot.source === 'block') {
                    const label = slot.blockType === 'MAINTENANCE' ? 'Maintenance' : 'Event';
                    return slot.reason?.trim()
                        ? `${label} block: ${slot.reason.trim()}`
                        : `Blocked (${label.toLowerCase()}) — this time is not available.`;
                }
                return 'This time overlaps an existing booking.';
            }
        }
        return 'Adjust start time or duration.';
    }, [
        selectedStartTime,
        selectedDuration,
        workStart,
        workEnd,
        effectiveMinDuration,
        effectiveMaxDuration,
        earliestBookableTime,
        busySlots,
    ]);

    const noSlotsDetail = useMemo(() => {
        if (!noSlotsAvailable) return null;
        if (earliestBookableTime > workEnd) {
            return {
                title: 'No available slots',
                subtitle: isToday
                    ? 'Working hours have ended. Try a different date.'
                    : 'Outside working hours for this date.',
            };
        }
        const blockSlots = busySlots.filter((s) => s.source === 'block');
        const hasBookings = busySlots.some((s) => s.source !== 'block');
        const uniqueReasons = [
            ...new Set(blockSlots.map((b) => b.reason).filter((r): r is string => Boolean(r?.trim()))),
        ];
        const reasonText =
            uniqueReasons.length > 0
                ? uniqueReasons.join(' · ')
                : 'This resource is blocked for maintenance or an event.';

        if (blockSlots.length > 0) {
            if (!hasBookings) {
                return {
                    title: 'Blocked — no booking slots',
                    subtitle: reasonText,
                };
            }
            return {
                title: 'No available slots',
                subtitle: `${reasonText} Remaining times may already be booked.`,
            };
        }

        return {
            title: 'No available slots',
            subtitle: isToday
                ? 'Working hours have ended. Try a different date.'
                : 'All slots are booked. Try another date.',
        };
    }, [noSlotsAvailable, earliestBookableTime, workEnd, isToday, busySlots]);

    const hasBlockSlots = useMemo(() => busySlots.some((s) => s.source === 'block'), [busySlots]);

    return (
        <div className="space-y-5">
            {/* Timeline */}
            <div className="relative">
                <div className="relative bg-gradient-to-br from-slate-950/90 via-slate-950/80 to-black/92 rounded-2xl p-5 border border-white/[0.06] backdrop-blur-xl shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-white">Availability</h3>
                                <p className="text-xs text-slate-400">{formatTime12(workStart)} – {formatTime12(workEnd)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
                            <div className="flex sm:hidden flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400"></span>Free</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span>Booked</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span>Blocked</span>
                            </div>
                            <div className="hidden sm:flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                                <span className="text-xs text-slate-400">Available</span>
                            </div>
                            <div className="hidden sm:flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                <span className="text-xs text-slate-400">Booked</span>
                            </div>
                            <div className="hidden sm:flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                <span className="text-xs text-slate-400">Blocked</span>
                            </div>
                            <div className="hidden sm:flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                                <span className="text-xs text-slate-400">Past</span>
                            </div>
                        </div>
                    </div>

                    {/* Hour labels */}
                    <div className="relative h-6 mb-2 mx-1">
                        {hourMarkers.filter((_, i) => i % 2 === 0 || hourMarkers.length <= 7).map((marker, i) => (
                            <div
                                key={i}
                                className="absolute transform -translate-x-1/2"
                                style={{ left: `${marker.position}%` }}
                            >
                                <span className="text-xs font-medium text-slate-500">{marker.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Main Timeline Bar */}
                    <div className="relative h-12 rounded-sm bg-slate-900/60 border border-slate-800/60 overflow-hidden">
                        {/* Available zone */}
                        {earliestBookableTime <= workEnd && (
                            <div
                                className="absolute inset-y-0 bg-green-600/50 transition-all duration-500"
                                style={{
                                    left: isToday ? `${getPosition(timelineEarliestBookable)}%` : '0%',
                                    right: '0%',
                                    borderLeft: isToday ? '2px solid rgb(34, 197, 94)' : 'none',
                                }}
                            />
                        )}

                        {/* Past zone */}
                        {isToday && (
                            <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-slate-950/85 via-slate-900/80 to-slate-900/60"
                                style={{ width: earliestBookableTime > workEnd ? '100%' : `${getPosition(timelineEarliestBookable)}%` }}
                            >
                                <div className="absolute inset-0" style={{
                                    backgroundImage: 'repeating-linear-gradient(60deg, transparent, transparent 4px, rgba(100,116,139,0.12) 4px, rgba(100,116,139,0.12) 8px)'
                                }} />
                            </div>
                        )}

                        {/* Busy slots */}
                        {busySlots.map((slot, index) => {
                            const slotStart = parseTime(slot.start);
                            const slotEnd = parseTime(slot.end);
                            const left = getPosition(slotStart);
                            const width = getPosition(slotEnd) - left;
                            const isBlock = slot.source === 'block';
                            return (
                                <div
                                    key={index}
                                    title={
                                        isBlock
                                            ? [slot.blockType === 'MAINTENANCE' ? 'Maintenance' : 'Event', slot.reason?.trim()]
                                                  .filter(Boolean)
                                                  .join(': ') || 'Blocked'
                                            : 'Booked'
                                    }
                                    className={cn(
                                        'absolute inset-y-1 rounded-sm border',
                                        isBlock
                                            ? 'bg-amber-500/70 border-amber-400/90'
                                            : 'bg-red-500/70 border-red-400'
                                    )}
                                    style={{ left: `${left}%`, width: `${width}%` }}
                                />
                            );
                        })}

                        {/* Grid lines */}
                        {hourMarkers.map((marker, i) => (
                            <div key={i} className="absolute inset-y-0" style={{ left: `${marker.position}%` }}>
                                <div className="w-px h-full bg-slate-700/40" />
                            </div>
                        ))}

                        {/* Current time indicator */}
                        {isToday && currentTimeMinutes >= workStart && currentTimeMinutes <= workEnd && (
                            <div className="absolute inset-y-0 z-20" style={{ left: `${getPosition(currentTimeMinutes)}%` }}>
                                <div className="absolute inset-y-0 w-0.5 bg-gradient-to-b from-amber-300 via-amber-400 to-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
                                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
                                    <span className="text-[9px] font-bold text-amber-400 bg-slate-900/90 px-1.5 py-0.5 rounded-sm">NOW</span>
                                </div>
                            </div>
                        )}

                        {/* Selected Range */}
                        {selectedStartTime !== null && selectedEnd !== null && (
                            <div
                                className={cn(
                                    'absolute inset-y-1 rounded-sm transition-all duration-300 z-10',
                                    isCurrentSelectionValid
                                        ? 'bg-gradient-to-r from-cyan-500/28 via-blue-500/24 to-cyan-500/28 border-2 border-cyan-400/55 shadow-[0_0_14px_rgba(34,211,238,0.2)]'
                                        : 'bg-gradient-to-r from-amber-500/30 via-orange-500/24 to-amber-500/30 border-2 border-amber-400/55'
                                )}
                                style={{
                                    left: `${getPosition(selectedStartTime)}%`,
                                    width: `${getPosition(selectedEnd) - getPosition(selectedStartTime)}%`,
                                }}
                            >
                                {isCurrentSelectionValid && (
                                    <div className="absolute inset-0 rounded-sm overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent animate-shimmer" />
                                    </div>
                                )}
                                <div className="absolute inset-x-0 -bottom-5 flex justify-between px-0.5">
                                    <span className="text-[8px] font-bold text-cyan-300 bg-slate-950/90 px-1 rounded-sm">{formatTime12(selectedStartTime).replace(' ', '')}</span>
                                    <span className="text-[8px] font-bold text-cyan-300 bg-slate-950/90 px-1 rounded-sm">{formatTime12(selectedEnd).replace(' ', '')}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Timeline ticks */}
                    <div className="relative h-2 mt-1 mx-1">
                        {hourMarkers.map((marker, i) => (
                            <div key={i} className="absolute top-0 w-px h-1.5 bg-slate-700" style={{ left: `${marker.position}%` }} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Time Selection Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Start Time Dropdown */}
                <div className="relative" ref={startDropdownRef}>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                        Start Time
                    </label>
                    <button
                        onClick={() => setShowStartDropdown(!showStartDropdown)}
                        disabled={noSlotsAvailable}
                        className={cn(
                            'w-full flex items-center justify-between px-4 py-3 rounded-xl border backdrop-blur-sm transition-all duration-300 group',
                            showStartDropdown
                                ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                                : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20',
                            noSlotsAvailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Clock className={cn('w-4 h-4', selectedStartTime !== null ? 'text-blue-400' : 'text-slate-500')} />
                            <span className={cn('font-semibold', selectedStartTime !== null ? 'text-white' : 'text-slate-400')}>
                                {selectedStartTime !== null ? formatTime12(selectedStartTime) : 'Select...'}
                            </span>
                        </div>
                        <ChevronDown className={cn('h-4 w-4 text-slate-500 transition-transform duration-300', showStartDropdown ? 'rotate-180 text-blue-400' : 'group-hover:text-slate-400')} />
                    </button>

                    {showStartDropdown && availableStartTimes.length > 0 && (
                        <div className="absolute z-50 w-full mt-2 py-1 bg-gray-900/95 border border-white/10 rounded-xl shadow-2xl max-h-52 overflow-y-auto backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                            {availableStartTimes.map((time, i) => (
                                <button
                                    key={time}
                                    onClick={() => {
                                        setSelectedStartTime(time);
                                        setShowStartDropdown(false);
                                    }}
                                    className={cn(
                                        'w-full px-4 py-2 text-left transition-all duration-150 flex items-center justify-between',
                                        selectedStartTime === time
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : 'text-white hover:bg-white/5',
                                        i === 0 ? 'rounded-t-lg' : '',
                                        i === availableStartTimes.length - 1 ? 'rounded-b-lg' : ''
                                    )}
                                >
                                    <span className="font-medium">{formatTime12(time)}</span>
                                    {selectedStartTime === time && (
                                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Duration Dropdown */}
                <div className="relative" ref={durationDropdownRef}>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                        Duration
                    </label>
                    <button
                        onClick={() => setShowDurationDropdown(!showDurationDropdown)}
                        disabled={noSlotsAvailable || selectedStartTime === null}
                        className={cn(
                            'w-full flex items-center justify-between px-4 py-3 rounded-xl border backdrop-blur-sm transition-all duration-300 group',
                            showDurationDropdown
                                ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                                : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20',
                            (noSlotsAvailable || selectedStartTime === null) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-base">{durationOptions.find(d => d.value === selectedDuration)?.icon || '🕐'}</span>
                            <span className="font-semibold text-white">
                                {durationOptions.find(d => d.value === selectedDuration)?.label || `${selectedDuration} min`}
                            </span>
                        </div>
                        <ChevronDown className={cn('h-4 w-4 text-slate-500 transition-transform duration-300', showDurationDropdown ? 'rotate-180 text-purple-400' : 'group-hover:text-slate-400')} />
                    </button>

                    {showDurationDropdown && (
                        <div className="absolute z-50 w-full mt-2 py-1 bg-gray-900/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                            {availableDurations.length > 0 ? availableDurations.map((option, i) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setSelectedDuration(option.value);
                                        setShowDurationDropdown(false);
                                    }}
                                    className={cn(
                                        'w-full px-4 py-2 text-left transition-all duration-150 flex items-center justify-between',
                                        selectedDuration === option.value
                                            ? 'bg-purple-500/20 text-purple-400'
                                            : 'text-white hover:bg-white/5',
                                        i === 0 ? 'rounded-t-lg' : '',
                                        i === availableDurations.length - 1 ? 'rounded-b-lg' : ''
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{option.icon}</span>
                                        <span className="font-medium">{option.label}</span>
                                    </div>
                                    {selectedDuration === option.value && (
                                        <CheckCircle2 className="w-4 h-4 text-purple-400" />
                                    )}
                                </button>
                            )) : (
                                <div className="px-4 py-3 text-slate-400 text-sm text-center">
                                    No durations available
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Slots */}
            {quickSlots.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-400" />
                        <span className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Quick Pick</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap scrollbar-hide">
                        {quickSlots.map((slot, i) => {
                            const isSelected = selectedStartTime === slot.start && selectedDuration === (slot.end - slot.start);
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleQuickSlotSelect(slot.start, slot.end)}
                                    className={cn(
                                        'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300',
                                        isSelected
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 scale-105'
                                            : 'bg-white/[0.03] text-white border border-white/10 hover:bg-white/[0.08] hover:border-amber-500/30 hover:text-amber-400'
                                    )}
                                >
                                    {formatTime12(slot.start)} – {formatTime12(slot.end)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Selection Summary Card */}
            {selectedStartTime !== null && selectedEnd !== null ? (
                <div className={cn(
                    'relative overflow-hidden rounded-2xl p-4 transition-all duration-500',
                    isCurrentSelectionValid
                        ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20'
                        : 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20'
                )}>
                    <div className={cn(
                        'absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl',
                        isCurrentSelectionValid ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                    )} />

                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                'w-12 h-12 rounded-xl flex items-center justify-center',
                                isCurrentSelectionValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                            )}>
                                {isCurrentSelectionValid ? (
                                    <Sparkles className="w-6 h-6" />
                                ) : (
                                    <AlertCircle className="w-6 h-6" />
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">
                                    {isCurrentSelectionValid ? 'Your Booking' : 'Cannot book this time'}
                                </p>
                                <p className="text-xl font-bold text-white">
                                    {formatTime12(selectedStartTime)} – {formatTime12(selectedEnd)}
                                </p>
                                {!isCurrentSelectionValid && selectionIssueMessage && (
                                    <p className="text-sm text-amber-200/90 mt-2 leading-snug">
                                        {selectionIssueMessage}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="text-left sm:text-right">
                            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Duration</p>
                            <p className={cn('text-3xl font-black', isCurrentSelectionValid ? 'text-emerald-400' : 'text-amber-400')}>
                                {selectedDuration >= 60
                                    ? `${Math.floor(selectedDuration / 60)}h${selectedDuration % 60 > 0 ? ` ${selectedDuration % 60}m` : ''}`
                                    : `${selectedDuration}m`
                                }
                            </p>
                        </div>
                    </div>
                </div>
            ) : noSlotsAvailable && noSlotsDetail ? (
                <div
                    className={cn(
                        'relative overflow-hidden rounded-2xl p-4 border',
                        hasBlockSlots
                            ? 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/25'
                            : 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-500/20'
                    )}
                >
                    <div
                        className={cn(
                            'absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl',
                            hasBlockSlots ? 'bg-amber-500/10' : 'bg-red-500/10'
                        )}
                    />
                    <div className="relative flex items-center gap-3">
                        <div
                            className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center',
                                hasBlockSlots ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                            )}
                        >
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p
                                className={cn(
                                    'text-sm font-semibold',
                                    hasBlockSlots ? 'text-amber-200' : 'text-red-300'
                                )}
                            >
                                {noSlotsDetail.title}
                            </p>
                            <p
                                className={cn(
                                    'text-xs mt-0.5 leading-relaxed',
                                    hasBlockSlots ? 'text-amber-200/70' : 'text-red-400/60'
                                )}
                            >
                                {noSlotsDetail.subtitle}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl p-4 bg-gradient-to-br from-gray-500/10 to-transparent border border-white/5 text-center">
                    <p className="text-sm text-slate-500">
                        Select a start time and duration above
                    </p>
                </div>
            )}

            {/* Booking Rules */}
            <div className="flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-slate-700/50 backdrop-blur-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6l4 2" /></svg>
                    </div>
                    <span className="text-xs font-medium text-slate-300">Min <span className="text-emerald-400 font-semibold">{effectiveMinDuration}m</span></span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-slate-700/50 backdrop-blur-sm">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <span className="text-xs font-medium text-slate-300">Max <span className="text-blue-400 font-semibold">{formatDurationLabel(effectiveMaxDuration)}</span></span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-slate-700/50 backdrop-blur-sm">
                    <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <svg className="w-3 h-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <span className="text-xs font-medium text-slate-300">Hours <span className="text-violet-400 font-semibold">{formatTime12(workStart).replace(':00 ', '')} – {formatTime12(workEnd).replace(':00 ', '')}</span></span>
                </div>
                {isGroupBooking && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 backdrop-blur-sm">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                        <span className="text-xs font-medium text-amber-300">{POLICIES.GROUP_BOOKING_CUTOFF_MINUTES}m advance notice</span>
                    </div>
                )}
            </div>
        </div>
    );
}
