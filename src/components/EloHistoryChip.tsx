import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import { useNavigate } from 'react-router-dom'
import { useSunsetUser } from '../userContext'

function getInitials(firstName: string | undefined, lastName: string | undefined): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
}

export function EloHistoryChip() {
  const navigate = useNavigate()
  const { user } = useSunsetUser()

  if (!user) return null

  return (
    <Chip
      data-testid="user-elo-chip"
      avatar={<Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>{getInitials(user.firstName, user.lastName)}</Avatar>}
      label={`${user.elo}`}
      size="small"
      sx={{ ml: 1 }}
      onClick={() => navigate('/elo-history')}
    />
  )
}
