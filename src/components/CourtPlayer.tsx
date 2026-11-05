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

  const displayName = participantName(participant)
  // The API no longer always provides firstName/lastName — never reveal a blank name.
  const revealedName = participantFullName(participant) || displayName

  return (
    <li
      className={`court-player${showFullName ? ' court-player-revealed' : ''}`}
      data-testid={`court-player-${participant.id}`}
      onClick={toggle}
    >
      <span className="court-player-name">
        {showFullName ? (
          <a
            className="court-player-name-link"
            href={`https://sunsetpadel.at/players/${participant.userId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {revealedName}
          </a>
        ) : (
          <button
            type="button"
            className="court-player-name-toggle"
            onClick={(e) => {
              e.stopPropagation()
              toggle()
            }}
          >
            {displayName}
          </button>
        )}
        {participant.premiumSubscriptionId != null && (
          <span className="premium-badge" data-testid="premium-badge" title="Premium subscription">&#9733;</span>
        )}
      </span>
      <span className="court-player-elo">{participant.user?.elo}</span>
    </li>
  )
}
