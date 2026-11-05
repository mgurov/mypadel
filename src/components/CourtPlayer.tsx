import type { Participant } from '../api'

export function CourtPlayer({ participant }: { participant: Participant }) {
  const name = participant.user?.name?.trim() ?? ''

  return (
    <li className="court-player" data-testid={`court-player-${participant.id}`}>
      <span className="court-player-name">
        <a
          className="court-player-name-link"
          href={`https://sunsetpadel.at/players/${participant.userId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {name}
        </a>
        {participant.premiumSubscriptionId != null && (
          <span className="premium-badge" data-testid="premium-badge" title="Premium subscription">&#9733;</span>
        )}
      </span>
      <span className="court-player-elo">{participant.user?.elo}</span>
    </li>
  )
}
