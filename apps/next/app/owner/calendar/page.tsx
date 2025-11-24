'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@booktractor/app/lib/auth-client'
import { useTRPC } from '@booktractor/app/lib/trpc'
import { useQuery } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@booktractor/trpc/routers'
import {
  createFilterBuilder,
  serializeFilters,
} from '@booktractor/utils/drizzler'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Filter, Loader2, RefreshCw, View, Calendar } from 'lucide-react'
import '@svar-ui/react-gantt/style.css'
import type { ITask, IApi } from '@svar-ui/react-gantt'

const Gantt = dynamic(
  async () => {
    const mod = await import('@svar-ui/react-gantt')
    return mod.Gantt
  },
  { ssr: false },
)

const Willow = dynamic(
  async () => {
    const mod = await import('@svar-ui/react-gantt')
    return mod.Willow
  },
  { ssr: false },
)
const Toolbar = dynamic(
  async () => {
    const mod = await import('@svar-ui/react-gantt')
    return mod.Toolbar
  },
  { ssr: false },
)
const Fullscreen = dynamic(
  async () => {
    const mod = await import('@svar-ui/react-gantt')
    return mod.Fullscreen
  },
  { ssr: false },
)

type AppRouterOutputs = inferRouterOutputs<AppRouter>
type BookingList = AppRouterOutputs['owner']['bookings']['listAll']
type BookingRow = BookingList[number]

const timelineOptions = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
] as const

const statusPalette: Record<string, { label: string; color: string }> = {
  pending_renter_approval: { label: 'Pending', color: '#fbbf24' },
  approved_by_renter: { label: 'Approved', color: '#22c55e' },
  sent_back_to_client: { label: 'Needs Updates', color: '#60a5fa' },
  rejected_by_renter: { label: 'Rejected', color: '#f87171' },
  canceled_by_client: { label: 'Canceled', color: '#94a3b8' },
}

export default function OwnerGanttPage() {
  const { data: session } = useSession()
  const ownerId = session?.user?.id || ''
  const trpc = useTRPC()
  const [api, setApi] = useState<IApi | null>(null)

  const router = useRouter()
  const [timeline, setTimeline] =
    useState<(typeof timelineOptions)[number]['value']>('week')
  const [machineFilter, setMachineFilter] = useState('')
  const [search, setSearch] = useState('')

  const filterPayload = useMemo(() => {
    const builder = createFilterBuilder()
    if (search.trim()) {
      builder.contains('search', search.trim())
    }
    if (machineFilter) {
      builder.equals('machineId', machineFilter)
    }
    return serializeFilters(builder.build())
  }, [search, machineFilter])

  const bookingsQuery = useQuery({
    ...trpc.owner.bookings.listAll.queryOptions({
      ownerId,
      filtersJson: filterPayload,
      limit: 100,
    }),
    enabled: !!ownerId,
  })

  const bookings = useMemo(
    () => (bookingsQuery.data ?? []) as BookingRow[],
    [bookingsQuery.data],
  )

  const lanes = useMemo(() => {
    const laneMap = new Map<string, { name: string; rows: BookingRow[] }>()
    bookings.forEach((booking) => {
      const key = booking.templateId
      if (!laneMap.has(key)) {
        laneMap.set(key, {
          name: booking.machineName ?? booking.machineCode ?? 'Machine',
          rows: [],
        })
      }
      laneMap.get(key)?.rows.push(booking)
    })
    return Array.from(laneMap.entries()).map(([key, value]) => ({
      id: key,
      label: value.name,
      bookings: value.rows,
    }))
  }, [bookings])

  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(
    null,
  )

  const tasks: ITask[] = useMemo(() => {
    return lanes.flatMap((lane) => {
      const children = lane.bookings.map(
        (booking) =>
          ({
            id: booking.id,
            parent: lane.id,
            text: `${booking.instanceCode ?? 'Unassigned'} — ${
              booking.clientName ??
              `Client ${booking.clientAccountId.slice(0, 6)}`
            }`,
            start: new Date(booking.startTime),
            end: new Date(booking.endTime),
            status: booking.status,
            clientName: booking.clientName,
            originalData: booking,
          }) satisfies ITask,
      )
      const start = children.reduce<Date | undefined>((acc, child) => {
        if (!child.start) return acc
        if (!acc) return child.start
        return child.start < acc ? child.start : acc
      }, undefined)
      const end = children.reduce<Date | undefined>((acc, child) => {
        if (!child.end) return acc
        if (!acc) return child.end
        return child.end > acc ? child.end : acc
      }, undefined)

      return [
        {
          id: lane.id,
          text: lane.label,
          type: 'summary' as const,
          open: true,
          start,
          end,
        },
        ...children,
      ] satisfies ITask[]
    })
  }, [lanes])

  const scales = useMemo(() => {
    switch (timeline) {
      case 'week':
        return [
          { unit: 'week', step: 1, format: 'MMM d' },
          { unit: 'day', step: 1, format: 'EEE d' },
        ]
      case 'quarter':
        return [
          { unit: 'quarter', step: 1, format: "'Q'Q yyyy" },
          { unit: 'month', step: 1, format: 'MMM' },
        ]
      case 'month':
      default:
        return [
          { unit: 'month', step: 1, format: 'MMMM yyyy' },
          { unit: 'week', step: 1, format: 'w' },
        ]
    }
  }, [timeline])

  if (!ownerId) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-center text-gray-600">
        <p className="text-lg font-semibold text-gray-900">
          Owner access required
        </p>
        <p className="text-sm text-gray-500">
          Sign in with an owner account to view calendar.
        </p>
      </div>
    )
  }

  if (bookingsQuery.isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-gray-500">
        <Loader2 className="mb-3 h-6 w-6 animate-spin" />
        Loading Gantt data…
      </div>
    )
  }

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto">
      <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-600">Owner Portal</p>
          <h1 className="text-3xl font-semibold text-gray-900">
            Booking calendar
          </h1>
          <p className="text-sm text-gray-500">
            Visualize machine utilization and resolve conflicts faster.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSearch('')
              setMachineFilter('')
            }}
            disabled={!search && !machineFilter}
          >
            <Filter className="mr-2 h-4 w-4" />
            Clear filters
          </Button>
          <Button variant="outline" onClick={() => bookingsQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Timeline</CardTitle>
            <div className="flex gap-2">
              {timelineOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={timeline === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeline(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Input
              placeholder="Filter by machine ID"
              value={machineFilter}
              onChange={(event) => setMachineFilter(event.target.value)}
            />
            <Input
              placeholder="Search bookings"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status legend</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {Object.entries(statusPalette).map(([key, value]) => (
              <Badge
                key={key}
                className="gap-2"
                style={{ backgroundColor: value.color, color: '#0f172a' }}
              >
                <span className="inline-block h-2 w-2 rounded-full bg-white/70" />
                {value.label}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500">
            <View className="h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-700">No bookings to display</p>
            <p className="text-sm text-gray-500">
              Try a different time range or filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-w-[100vw]">
            <div className="min-w-full px-4">
              <Willow>
                <Gantt
                  init={setApi}
                  tasks={tasks}
                  scales={scales}
                  zoom={true}
                  readonly
                  taskTemplate={({ data }) => {
                    return (
                      <div
                        className="rounded-lg text-slate-50 cursor-pointer font-medium text-sm h-full flex items-center justify-center overflow-ellipsis whitespace-nowrap"
                        style={{
                          backgroundColor:
                            statusPalette[data.status]?.color ?? '#94a3b8',
                        }}
                        onClick={() => {
                          if (data.originalData) {
                            setSelectedBooking(data.originalData)
                          }
                        }}
                      >
                        <p
                          aria-label={data.text}
                          title={data.text}
                          className="overflow-ellipsis whitespace-nowrap"
                        >
                          {data.text}
                        </p>
                      </div>
                    )
                  }}
                />
              </Willow>
            </div>
          </div>
        )}
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setSelectedBooking(null)}
            role="button"
            aria-label="Close booking summary"
          />
          <div className="w-full max-w-lg bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Booking
                </p>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedBooking.machineName ?? 'Equipment'}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedBooking.instanceCode ?? 'Unassigned'} •{' '}
                  {statusPalette[selectedBooking.status]?.label ??
                    selectedBooking.status}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
                onClick={() => setSelectedBooking(null)}
              >
                ×
              </button>
            </div>
            <div className="space-y-4 px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoBlock
                  label="Client"
                  value={
                    selectedBooking.clientName ??
                    `Client ${selectedBooking.clientAccountId.slice(0, 6)}`
                  }
                />
                <InfoBlock
                  label="Instance"
                  value={selectedBooking.instanceCode ?? 'Auto-assigned'}
                />
                <InfoBlock
                  label="Start"
                  value={new Date(selectedBooking.startTime).toLocaleString()}
                />
                <InfoBlock
                  label="End"
                  value={new Date(selectedBooking.endTime).toLocaleString()}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedBooking(null)}
                >
                  Close
                </Button>
                <Button asChild>
                  <Link href={`/owner/bookings/${selectedBooking.id}`}>
                    Open booking
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}
