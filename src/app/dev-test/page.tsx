'use client'

import React, { useState } from 'react'
import DatePicker from '@/components/ui/DatePicker'
import CompactTimePicker from '@/components/ui/CompactTimePicker'
import TimePicker from '@/components/ui/TimePicker'
import { AnimatedBackground } from '@/components/ui/AnimatedBackground'
import Calendar from '@/components/ui/Calendar'
import { Input, Textarea, SearchInput } from '@/components/ui/Input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Tooltip, TooltipSimple } from '@/components/ui/Tooltip'
import { LoadingState, InlineLoading } from '@/components/ui/LoadingState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import Modal, { ConfirmModal } from '@/components/ui/Modal'
import AnimatedCounter, { SimpleCounter } from '@/components/ui/AnimatedCounter'
import { Emoji } from '@/components/ui/Emoji'
import ErrorDisplay from '@/components/ui/ErrorDisplay'
import SuccessCelebration, { InlineSuccess } from '@/components/ui/SuccessCelebration'
import { EmptyBookings } from '@/components/ui/EmptyState'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, StatCard } from '@/components/ui/Card'
import { Toaster, toast } from '@/components/ui/Toaster'
import Badge, { StatusBadge } from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'

export default function DevTestPage() {
  const [date, setDate] = useState<string | Date | null>(null)
  const [time, setTime] = useState('09:00')
  const [compactTime, setCompactTime] = useState('10:00')
  const [showModal, setShowModal] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [tabValue, setTabValue] = useState('one')
  const [showError, setShowError] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  return (
    <div className="min-h-screen p-8 space-y-8 bg-gradient-to-b from-bg to-bg-dark">
      <AnimatedBackground />
      <h1 className="text-2xl font-bold">Component Visual Test</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">DatePicker</h2>
          <DatePicker value={date} onChange={(d) => setDate(d)} placeholder="Choose a date" />

          <h2 className="text-lg font-semibold">Calendar</h2>
          <Calendar events={[]} onDateClick={(d) => setDate(d)} />

          <h2 className="text-lg font-semibold">CompactTimePicker</h2>
          <CompactTimePicker date={typeof date === 'string' ? date : (date ? (date as Date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10))} value={compactTime} onChange={setCompactTime} />

          <h2 className="text-lg font-semibold">TimePicker</h2>
          <TimePicker date={typeof date === 'string' ? date : (date ? (date as Date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10))} value={time} onChange={setTime} />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Tabs & Tooltip</h2>
          <Tabs value={tabValue} onValueChange={setTabValue}>
            <TabsList>
              <TabsTrigger value="one">One</TabsTrigger>
              <TabsTrigger value="two">Two</TabsTrigger>
              <TabsTrigger value="three">Three</TabsTrigger>
            </TabsList>

            <TabsContent value="one">Content one <Tooltip content={<span>Helpful tip</span>}> <button className="ml-2 underline">(tip)</button> </Tooltip></TabsContent>
            <TabsContent value="two">Content two</TabsContent>
            <TabsContent value="three">Content three</TabsContent>
          </Tabs>

          <h2 className="text-lg font-semibold">Loading & Skeleton</h2>
          <LoadingState title="Loading demo" subtitle="This is a demo of loading state" compact />
          <div className="mt-4"><InlineLoading text="Fetching..." /></div>

          <h2 className="text-lg font-semibold">Skeleton</h2>
          <SkeletonCard />
          
          <h2 className="text-lg font-semibold">Animated Counter & Emoji</h2>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold"><AnimatedCounter value={12345} /></div>
            <Emoji symbol="🎉" size="lg" />
            <SimpleCounter value={42} />
          </div>

          <h2 className="text-lg font-semibold">Empty State</h2>
          <EmptyBookings />
          <h2 className="text-lg font-semibold">Inputs</h2>
          <div className="space-y-3">
            <Input placeholder="Your name" />
            <SearchInput onSearch={(v) => console.log('search', v)} />
            <Textarea placeholder="Notes" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Error / Success Examples</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowError(true)} className="px-4 py-2 bg-warning text-white rounded">Show Error</button>
          <button onClick={() => setShowSuccess(true)} className="px-4 py-2 bg-success text-white rounded">Show Success</button>
        </div>
        {showError && <ErrorDisplay message="We couldn't load your bookings. Please try again." onRetry={() => setShowError(false)} />}
        <InlineSuccess show={false} />
        <SuccessCelebration show={showSuccess} />

        <h2 className="text-lg font-semibold">Modal & Confirm</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-primary text-white rounded">Open Modal</button>
          <button onClick={() => setShowConfirm(true)} className="px-4 py-2 bg-danger text-white rounded">Open Confirm</button>
        </div>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Demo Modal"> 
          <div className="space-y-4">
            <p>This is a migrated modal. Try closing it.</p>
            <TooltipSimple text="Inline tooltip example"><button className="underline">Hover me</button></TooltipSimple>
          </div>
        </Modal>

        <ConfirmModal isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={() => { setShowConfirm(false); alert('Confirmed') }} title="Confirm Action" message="Are you sure?" />
        <Toaster />
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="p-4">
            <CardHeader>
              <CardTitle emoji="📦">Test Card</CardTitle>
              <CardDescription>Simple card preview for migration</CardDescription>
            </CardHeader>
            <CardContent>Some inner content here.</CardContent>
            <CardFooter>
              <button onClick={() => toast.success('Saved!')} className="px-3 py-1 bg-primary text-white rounded">Save</button>
            </CardFooter>
          </Card>

          <StatCard label="Active Bookings" value={12} emoji="📅" trend="up" trendValue="+4" />
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Muted</Badge>
          <StatusBadge status="confirmed" />
          <StatusBadge status="pending" />
        </div>
        <div className="mt-6">
          <h3 className="text-sm font-medium mb-2">Avatars</h3>
          <div className="flex items-center gap-4">
            <Avatar src="/images/sample-avatar.jpg" name="Alicia Keys" />
            <Avatar name="John Doe" />
            <Avatar src={null} name="S. Pandey" size="lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
