export function ParticipationCell({ participants, maxParticipants }: { participants: number | undefined; maxParticipants: number }) {
  if (maxParticipants <= 0) return <>{participants}</>
  if (participants && participants >= maxParticipants) return <>full ({maxParticipants}) </>
  return <>{participants} ({maxParticipants})</>
}
