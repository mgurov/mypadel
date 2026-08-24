import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useNavigate, useParams } from 'react-router-dom'

export function SunsetParticipantPage() {
  const navigate = useNavigate()
  const { uid } = useParams()

  return (
    <div data-testid="sunset-participant-page">
      <div className="elo-history-header">
        <Button onClick={() => navigate('/')}>Back</Button>
        <Typography variant="subtitle1">Participant</Typography>
      </div>
      <Typography variant="body2" color="text.secondary" data-testid="sunset-participant-uid">
        {uid}
      </Typography>
    </div>
  )
}
