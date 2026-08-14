import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import CircularProgress from '@mui/material/CircularProgress'
import type { Event, MeetupEvent, User } from '../api'
import { eventKey } from '../eventTracking'
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
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  user: User | null
  tabCounts: Record<TabId, number>
  tabNewCounts: Record<TabId, number>
  tabHasData: Record<TabId, boolean>
  tabFetching: Record<TabId, boolean>
  joinedCounts: Record<TabId, number>
  showOnlyAttending: boolean
  onToggleAttending: () => void
  showOnlyNew: ReadonlySet<TabId>
  onToggleOnlyNew: (id: TabId) => void
  newIds: ReadonlySet<string>
  combinedEntries: CombinedEntry[]
  newEntries: Record<TabId, CombinedEntry[]>
  sunsetEvents: Event[]
  newSunsetEvents: Event[]
  wolfgangEvents: MeetupEvent[]
  newWolfgangEvents: MeetupEvent[]
  meetupEvents: MeetupEvent[]
  newMeetupEvents: MeetupEvent[]
  onAckKeys: (keys: string[]) => void
}

export function EventTables({
  activeTab,
  onTabChange,
  user,
  tabCounts,
  tabNewCounts,
  tabHasData,
  tabFetching,
  joinedCounts,
  showOnlyAttending,
  onToggleAttending,
  showOnlyNew,
  onToggleOnlyNew,
  newIds,
  combinedEntries,
  newEntries,
  sunsetEvents,
  newSunsetEvents,
  wolfgangEvents,
  newWolfgangEvents,
  meetupEvents,
  newMeetupEvents,
  onAckKeys,
}: EventTablesProps) {
  const filterActive = (id: TabId) => showOnlyNew.has(id) && tabNewCounts[id] > 0

  const entryKey = (entry: CombinedEntry): string =>
    eventKey(entry.source === 'sunset' ? 'sunset' : 'meetup', entry.event.id)

  const ackEntry = (entry: CombinedEntry) => onAckKeys([entryKey(entry)])
  const ackSunsetEvent = (event: Event) => onAckKeys([eventKey('sunset', event.id)])
  const ackMeetupEvent = (event: MeetupEvent) => onAckKeys([eventKey('meetup', event.id)])

  return (
    <>
      <Tabs
        value={activeTab}
        onChange={(_e, value: TabId) => onTabChange(value)}
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
          <OnlyAttendingToggle active={showOnlyAttending} disabled={user === null} onToggle={onToggleAttending} />
        )}
        {tabNewCounts[activeTab] > 0 && (
          <>
            <OnlyNewToggle active={filterActive(activeTab)} onToggle={() => onToggleOnlyNew(activeTab)} />
            <AckAllButton count={tabNewCounts[activeTab]} onAckAll={() => onAckKeys(newEntries[activeTab].map(entryKey))} />
          </>
        )}
      </div>

      {activeTab === 'combined' && combinedEntries.length > 0 && (
        <CombinedTable entries={filterActive('combined') ? newEntries.combined : combinedEntries} newIds={newIds} onAck={ackEntry} />
      )}

      {activeTab === 'sunset' && sunsetEvents.length > 0 && (
        <EventsTable events={filterActive('sunset') ? newSunsetEvents : sunsetEvents} newIds={newIds} onAck={ackSunsetEvent} />
      )}

      {activeTab === 'wolfgang' && wolfgangEvents.length > 0 && (
        <MeetupTable events={filterActive('wolfgang') ? newWolfgangEvents : wolfgangEvents} newIds={newIds} onAck={ackMeetupEvent} />
      )}

      {activeTab === 'meetup' && meetupEvents.length > 0 && (
        <MeetupTable events={filterActive('meetup') ? newMeetupEvents : meetupEvents} newIds={newIds} onAck={ackMeetupEvent} />
      )}
    </>
  )
}
