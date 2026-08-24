import { useState } from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import { useQuery } from '@tanstack/react-query'
import { eloDeltaForPlayer, fetchEventMatchTable } from '../api'
import type { ProfileRegistration } from '../api'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-UK', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`
}

export function EloHistoryRow({ registration, userId }: { registration: ProfileRegistration; userId: string }) {
  const [revealed, setRevealed] = useState(false)

  const { data: matchTable, isFetching } = useQuery({
    queryKey: ['eventMatchTable', registration.eventId],
    queryFn: () => fetchEventMatchTable(registration.eventId),
    enabled: revealed,
  })

  const delta = matchTable ? eloDeltaForPlayer(matchTable, userId) : null

  return (
    <li className="table-row elo-history-row" data-testid="elo-history-row" onClick={() => setRevealed(true)}>
      <div className="column">
        {formatDate(registration.event.endDate)}
        <div className="elo-history-title">{registration.event.title}</div>
      </div>
      <div className="column text-align-right no-grow margin-left-16">
        {isFetching && <CircularProgress size={14} data-testid="elo-history-row-loading" />}
        {!isFetching && delta != null && (
          <span
            data-testid="elo-history-delta"
            className={delta > 0 ? 'elo-delta-positive' : delta < 0 ? 'elo-delta-negative' : 'elo-delta-zero'}
          >
            {formatDelta(delta)}
          </span>
        )}
      </div>
    </li>
  )
}
