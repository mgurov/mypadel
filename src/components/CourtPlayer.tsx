import { useState } from 'react'
import type { Participant } from '../api'

function participantName(p: Participant): string {
  const full = p.user?.name?.trim()
  if (full) return full
  return participantFullName(p)
}

function participantFullName(p: Participant): string {
  return [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim()
}

export function CourtPlayer({ participant }: { participant: Participant }) {
  const [showFullName, setShowFullName] = useState(false)

  const toggle = () => setShowFullName((v) => !v)

  return (
    <li
      className={`court-player${showFullName ? ' court-player-revealed' : ''}`}
      data-testid={`court-player-${participant.id}`}
      role="button"
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggle()
        }
      }}
    >
      <span className="court-player-name">
        {showFullName ? participantFullName(participant) : participantName(participant)}
        {participant.premiumSubscriptionId != null && (
          <span className="premium-badge" data-testid="premium-badge" title="Premium subscription">&#9733;</span>
        )}
      </span>
      <span className="court-player-elo">{participant.user?.elo}</span>
    </li>
  )
}
