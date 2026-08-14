import { useEffect, useState } from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import CircularProgress from '@mui/material/CircularProgress'
import type { Event, MeetupEvent, User } from '../api'
import { addKnownKeys, eventKey, trackFetchedKeys } from '../eventTracking'
import { isHostedByWolfgang, isMyRsvp, isVisibleMeetup } from '../meetup'
import { AckAllButton } from './AckAllButton'
import { CombinedTable, type CombinedEntry } from './CombinedTable'
import { EventsTable } from './EventsTable'
import { MeetupTable } from './MeetupTable'
import { OnlyAttendingToggle } from './OnlyAttendingToggle'
import { OnlyNewToggle } from './OnlyNewToggle'

export type TabId = 'combined' | 'sunset' | 'wolfgang' | 'meetup'

const TAB_IDS: TabId[] = ['combined', 'sunset', 'wolfgang', 'meetup']

const TAB_LABELS: Record<TabId, string> = {
  combined: 'Combined',
  sunset: 'Sunset',
  wolfgang: 'Wolfgang',
  meetup: 'Meetup',
}

const TAB_COLORS: Record<TabId, string> = {
  combined: '#6b6375',
  sunset: '#aa3bff',
  wolfgang: '#2e7d32',
  meetup: '#1976d2',
}

interface EventTablesProps {
  user: User | null
  sunsetEvents: Event[] | undefined
  meetupEvents: MeetupEvent[] | undefined
  attendingSunsetIds: ReadonlySet<string>
  tabHasData: Record<TabId, boolean>
  tabFetching: Record<TabId, boolean>
}

export function EventTables({ user, sunsetEvents, meetupEvents, attendingSunsetIds, tabHasData, tabFetching }: EventTablesProps) {
  const [activeTab, setActiveTab] = useState<TabId>('sunset')
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(() => new Set())
  const [showOnlyNew, setShowOnlyNew] = useState<ReadonlySet<TabId>>(() => new Set())
  const [showOnlyAttending, setShowOnlyAttending] = useState(false)

  useEffect(() => {
    if (sunsetEvents === undefined || meetupEvents === undefined) return
    const fetchedKeys = [
      ...sunsetEvents.map((event) => eventKey('sunset', event.id)),
      ...meetupEvents.filter(isVisibleMeetup).map((event) => eventKey('meetup', event.id)),
    ]
    if (fetchedKeys.length === 0) return
    void trackFetchedKeys(fetchedKeys).then((found) => {
      if (found.length === 0) return
      setNewIds((prev) => {
        const next = new Set(prev)
        found.forEach((key) => next.add(key))
        return next
      })
    })
  }, [sunsetEvents, meetupEvents])

  const visibleMeetup = (meetupEvents ?? []).filter(isVisibleMeetup)
  const wolfgangEvents = visibleMeetup.filter(isHostedByWolfgang)
  const otherMeetupEvents = visibleMeetup.filter((event) => !isHostedByWolfgang(event))
  const sunsetList = showOnlyAttending ? (sunsetEvents ?? []).filter((event) => attendingSunsetIds.has(event.id)) : (sunsetEvents ?? [])
  const wolfgangList = showOnlyAttending ? wolfgangEvents.filter(isMyRsvp) : wolfgangEvents
  const meetupList = showOnlyAttending ? otherMeetupEvents.filter(isMyRsvp) : otherMeetupEvents

  const tabCounts: Record<TabId, number> = {
    combined: sunsetList.length + wolfgangList.length + meetupList.length,
    sunset: sunsetList.length,
    wolfgang: wolfgangList.length,
    meetup: meetupList.length,
  }

  const combinedEntries: CombinedEntry[] = [
    ...sunsetList.map((event) => ({ source: 'sunset' as const, event })),
    ...wolfgangList.map((event) => ({ source: 'wolfgang' as const, event })),
    ...meetupList.map((event) => ({ source: 'meetup' as const, event })),
  ]

  const newSunset = sunsetList.filter((event) => newIds.has(eventKey('sunset', event.id)))
  const newWolfgang = wolfgangList.filter((event) => newIds.has(eventKey('meetup', event.id)))
  const newOtherMeetup = meetupList.filter((event) => newIds.has(eventKey('meetup', event.id)))

  const joinedSunset = (sunsetEvents ?? []).filter((event) => attendingSunsetIds.has(event.id))
  const joinedWolfgang = wolfgangEvents.filter(isMyRsvp)
  const joinedMeetup = otherMeetupEvents.filter(isMyRsvp)

  const joinedCounts: Record<TabId, number> = {
    combined: joinedSunset.length + joinedWolfgang.length + joinedMeetup.length,
    sunset: joinedSunset.length,
    wolfgang: joinedWolfgang.length,
    meetup: joinedMeetup.length,
  }

  const newEntries: Record<TabId, CombinedEntry[]> = {
    combined: [
      ...newSunset.map((event) => ({ source: 'sunset' as const, event })),
      ...newWolfgang.map((event) => ({ source: 'wolfgang' as const, event })),
      ...newOtherMeetup.map((event) => ({ source: 'meetup' as const, event })),
    ],
    sunset: newSunset.map((event) => ({ source: 'sunset' as const, event })),
    wolfgang: newWolfgang.map((event) => ({ source: 'wolfgang' as const, event })),
    meetup: newOtherMeetup.map((event) => ({ source: 'meetup' as const, event })),
  }

  const tabNewCounts: Record<TabId, number> = {
    combined: newSunset.length + newWolfgang.length + newOtherMeetup.length,
    sunset: newSunset.length,
    wolfgang: newWolfgang.length,
    meetup: newOtherMeetup.length,
  }

  const ackKeys = (keys: string[]) => {
    if (keys.length === 0) return
    setNewIds((prev) => {
      if (!keys.some((key) => prev.has(key))) return prev
      const next = new Set(prev)
      keys.forEach((key) => next.delete(key))
      return next
    })
    void addKnownKeys(keys)
  }

  const toggleOnlyNew = (id: TabId) => {
    setShowOnlyNew((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filterActive = (id: TabId) => showOnlyNew.has(id) && tabNewCounts[id] > 0

  const entryKey = (entry: CombinedEntry): string =>
    eventKey(entry.source === 'sunset' ? 'sunset' : 'meetup', entry.event.id)

  const ackEntry = (entry: CombinedEntry) => ackKeys([entryKey(entry)])
  const ackSunsetEvent = (event: Event) => ackKeys([eventKey('sunset', event.id)])
  const ackMeetupEvent = (event: MeetupEvent) => ackKeys([eventKey('meetup', event.id)])

  return (
    <>
      <Tabs
        value={activeTab}
        onChange={(_e, value: TabId) => setActiveTab(value)}
        variant="fullWidth"
        sx={{
          width: '100%',
          maxWidth: 900,
          '& .MuiTabs-indicator': { display: 'none' },
        }}
      >
        {TAB_IDS.map((id) => (
          <Tab
            key={id}
            value={id}
            data-testid={`tab-${id}`}
            sx={{
              backgroundColor: TAB_COLORS[id],
              color: '#fff',
              opacity: activeTab === id ? 1 : 0.65,
              '&:hover': { color: '#fff', opacity: 1 },
              '&.Mui-selected': { color: '#fff', backgroundColor: TAB_COLORS[id] },
              '@media (max-width: 480px)': { padding: '6px 2px' },
            }}
            label={
              <span className="tab-label">
                <span className="tab-label-text">{`${TAB_LABELS[id]}${tabHasData[id] ? ` (${tabCounts[id]})` : ''}`}</span>
                {tabNewCounts[id] > 0 && (
                  <span data-testid={`tab-new-${id}`} className="new-badge">{tabNewCounts[id]}</span>
                )}
                {tabFetching[id] && <CircularProgress className="tab-spinner" size={12} sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />}
              </span>
            }
          />
        ))}
      </Tabs>

      <div className="tab-controls">
        {joinedCounts[activeTab] > 0 && (
          <OnlyAttendingToggle active={showOnlyAttending} disabled={user === null} onToggle={() => setShowOnlyAttending((v) => !v)} />
        )}
        {tabNewCounts[activeTab] > 0 && (
          <>
            <OnlyNewToggle active={filterActive(activeTab)} onToggle={() => toggleOnlyNew(activeTab)} />
            <AckAllButton count={tabNewCounts[activeTab]} onAckAll={() => ackKeys(newEntries[activeTab].map(entryKey))} />
          </>
        )}
      </div>

      {activeTab === 'combined' && combinedEntries.length > 0 && (
        <CombinedTable entries={filterActive('combined') ? newEntries.combined : combinedEntries} newIds={newIds} onAck={ackEntry} />
      )}

      {activeTab === 'sunset' && sunsetList.length > 0 && (
        <EventsTable events={filterActive('sunset') ? newSunset : sunsetList} newIds={newIds} onAck={ackSunsetEvent} />
      )}

      {activeTab === 'wolfgang' && wolfgangList.length > 0 && (
        <MeetupTable events={filterActive('wolfgang') ? newWolfgang : wolfgangList} newIds={newIds} onAck={ackMeetupEvent} />
      )}

      {activeTab === 'meetup' && meetupList.length > 0 && (
        <MeetupTable events={filterActive('meetup') ? newOtherMeetup : meetupList} newIds={newIds} onAck={ackMeetupEvent} />
      )}
    </>
  )
}
