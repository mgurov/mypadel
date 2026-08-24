import { useState } from 'react'
import CircularProgress from '@mui/material/CircularProgress'
import { useQuery } from '@tanstack/react-query'
import { fetchEventMatchTable, matchTablePlayer } from '../api'
import type { MatchTablePlayer, ProfileRegistration } from '../api'

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

function detailEntries(player: MatchTablePlayer): { label: string; value: number }[] {
  return [
    { label: 'Previous ELO', value: player.previousElo },
    { label: 'New ELO', value: player.newElo },
    { label: 'Current ELO', value: player.elo },
  ]
}

export function EloHistoryRow({ registration, userId }: { registration: ProfileRegistration; userId: string }) {
  const [revealed, setRevealed] = useState(false)

  const { data: matchTable, isFetching } = useQuery({
    queryKey: ['eventMatchTable', registration.eventId],
    queryFn: () => fetchEventMatchTable(registration.eventId),
    enabled: revealed,
  })

  const player = matchTable ? matchTablePlayer(matchTable, userId) : null
  const delta = player ? player.newElo - player.previousElo : null

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
      {player && (
        <div className="elo-history-details" data-testid="elo-history-details">
          {detailEntries(player).map(({ label, value }) => (
            <div key={label} className="elo-history-detail" data-testid="elo-history-detail">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      )}
    </li>
  )
}
