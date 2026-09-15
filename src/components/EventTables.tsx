import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import CircularProgress from '@mui/material/CircularProgress'
import type { Event, MeetupEvent, User } from '../api'
import { addKnownKeys, eventKey, loadForcedAttendance, setForcedAttendance as persistForcedAttendance, trackFetchedKeys, type FetchedKey, type ForcedAttendance } from '../eventTracking'
import { loadUnavailableDates, setUnavailableDate } from '../unavailableDates'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>('sunset')
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(() => new Set())
  const [showOnlyNew, setShowOnlyNew] = useState<ReadonlySet<TabId>>(() => new Set())
  const [showOnlyAttending, setShowOnlyAttending] = useState(false)
  const [forcedAttendance, setForcedAttendance] = useState<ReadonlyMap<string, ForcedAttendance>>(() => new Map())
  const [unavailableDates, setUnavailableDates] = useState<ReadonlySet<string>>(() => new Set())

  const selectedKey = searchParams.get('selected') ?? undefined
  const selectEvent = (key: string) => {
    setSearchParams((prev) => {
      prev.set('selected', key)
      return prev
    }, { replace: true })
  }

  useEffect(() => {
    let active = true
    void loadForcedAttendance().then((found) => {
      if (active) setForcedAttendance(found)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    void loadUnavailableDates().then((found) => {
      if (active) setUnavailableDates(found)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (sunsetEvents === undefined || meetupEvents === undefined) return
    const fetchedKeys: FetchedKey[] = [
      ...sunsetEvents.map((event) => ({ key: eventKey('sunset', event.id) })),
      ...meetupEvents.filter(isVisibleMeetup).map((event) => ({ key: eventKey('meetup', event.id), rsvpState: event.rsvpState })),
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

  const forcedAttendanceFor = (event: MeetupEvent): ForcedAttendance | undefined =>
    forcedAttendance.get(eventKey('meetup', event.id))

  const isEffectiveAttending = (event: MeetupEvent): boolean => {
    const forced = forcedAttendanceFor(event)
    return forced !== undefined ? forced === 'yes' : isMyRsvp(event)
  }

  const sunsetList = showOnlyAttending ? (sunsetEvents ?? []).filter((event) => attendingSunsetIds.has(event.id)) : (sunsetEvents ?? [])
  const wolfgangList = showOnlyAttending ? wolfgangEvents.filter(isEffectiveAttending) : wolfgangEvents
  const meetupList = showOnlyAttending ? otherMeetupEvents.filter(isEffectiveAttending) : otherMeetupEvents

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
  const joinedWolfgang = wolfgangEvents.filter(isEffectiveAttending)
  const joinedMeetup = otherMeetupEvents.filter(isEffectiveAttending)

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

  const ackItems = (items: FetchedKey[]) => {
    if (items.length === 0) return
    const keys = items.map(({ key }) => key)
    setNewIds((prev) => {
      if (!keys.some((key) => prev.has(key))) return prev
      const next = new Set(prev)
      keys.forEach((key) => next.delete(key))
      return next
    })
    void addKnownKeys(items)
  }

  const setForcedAttendanceFor = (key: string, value: ForcedAttendance | undefined) => {
    setForcedAttendance((prev) => {
      const next = new Map(prev)
      if (value === undefined) next.delete(key)
      else next.set(key, value)
      return next
    })
    void persistForcedAttendance(key, value)
  }

  const toggleUnavailableDate = (dateKey: string) => {
    const turningOff = unavailableDates.has(dateKey)
    void setUnavailableDate(dateKey, !turningOff)
    setUnavailableDates((prev) => {
      const next = new Set(prev)
      if (turningOff) next.delete(dateKey)
      else next.add(dateKey)
      return next
    })
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

  const entryRsvpState = (entry: CombinedEntry): string | undefined =>
    entry.source === 'sunset' ? undefined : entry.event.rsvpState

  const ackEntry = (entry: CombinedEntry) => ackItems([{ key: entryKey(entry), rsvpState: entryRsvpState(entry) }])
  const ackSunsetEvent = (event: Event) => ackItems([{ key: eventKey('sunset', event.id) }])
  const ackMeetupEvent = (event: MeetupEvent) => ackItems([{ key: eventKey('meetup', event.id), rsvpState: event.rsvpState }])

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
            <AckAllButton count={tabNewCounts[activeTab]} onAckAll={() => ackItems(newEntries[activeTab].map((entry) => ({ key: entryKey(entry), rsvpState: entryRsvpState(entry) })))} />
          </>
        )}
      </div>

      {activeTab === 'combined' && combinedEntries.length > 0 && (
        <CombinedTable entries={filterActive('combined') ? newEntries.combined : combinedEntries} newIds={newIds} onAck={ackEntry} selectedKey={selectedKey} onSelect={selectEvent} forcedAttendance={forcedAttendance} onForcedAttendance={setForcedAttendanceFor} unavailableDates={unavailableDates} onToggleUnavailable={toggleUnavailableDate} />
      )}

      {activeTab === 'sunset' && sunsetList.length > 0 && (
        <EventsTable events={filterActive('sunset') ? newSunset : sunsetList} newIds={newIds} onAck={ackSunsetEvent} selectedKey={selectedKey} onSelect={selectEvent} unavailableDates={unavailableDates} onToggleUnavailable={toggleUnavailableDate} />
      )}

      {activeTab === 'wolfgang' && wolfgangList.length > 0 && (
        <MeetupTable events={filterActive('wolfgang') ? newWolfgang : wolfgangList} newIds={newIds} onAck={ackMeetupEvent} selectedKey={selectedKey} onSelect={selectEvent} forcedAttendance={forcedAttendance} onForcedAttendance={setForcedAttendanceFor} unavailableDates={unavailableDates} onToggleUnavailable={toggleUnavailableDate} />
      )}

      {activeTab === 'meetup' && meetupList.length > 0 && (
        <MeetupTable events={filterActive('meetup') ? newOtherMeetup : meetupList} newIds={newIds} onAck={ackMeetupEvent} selectedKey={selectedKey} onSelect={selectEvent} forcedAttendance={forcedAttendance} onForcedAttendance={setForcedAttendanceFor} unavailableDates={unavailableDates} onToggleUnavailable={toggleUnavailableDate} />
      )}
    </>
  )
}
