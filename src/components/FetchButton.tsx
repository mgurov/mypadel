import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import Button from '@mui/material/Button'
import { useAuth } from '../authContext'

export function FetchButton() {
  const queryClient = useQueryClient()
  const { credentialsComplete } = useAuth()
  const fetchingEvents = useIsFetching({ queryKey: ['events'] }) > 0
  const fetchingMeetup = useIsFetching({ queryKey: ['meetupEvents'] }) > 0
  const fetching = fetchingEvents || fetchingMeetup

  const handleFetch = async () => {
    void queryClient.refetchQueries({ queryKey: ['meetupEvents'] })
    await queryClient.refetchQueries({ queryKey: ['events'] })
    void queryClient.refetchQueries({ queryKey: ['eventDetail'] })
  }

  return (
    <Button
      data-testid="fetch-events-button"
      variant={credentialsComplete ? 'contained' : 'outlined'}
      onClick={() => void handleFetch()}
      disabled={fetching}
    >
      {fetching ? 'Loading...' : 'Fetch'}
    </Button>
  )
}
