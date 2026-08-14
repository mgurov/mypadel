import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import Button from '@mui/material/Button'
import { useAuth } from '../authContext'

export function FetchButton() {
  const queryClient = useQueryClient()
  const { credentialsComplete } = useAuth()
  const fetchingEvents = useIsFetching({ queryKey: ['events'] }) > 0
  const fetchingMeetup = useIsFetching({ queryKey: ['meetupEvents'] }) > 0
  const fetching = fetchingEvents || fetchingMeetup

  const fetchQueries = async (queryKey: string[], type: 'active' | 'all' = 'all') => {
    const queries = queryClient.getQueryCache().findAll({ queryKey, type })
    await Promise.allSettled(queries.map((query) => query.fetch()))
  }

  const handleFetch = async () => {
    void fetchQueries(['meetupEvents'])
    await fetchQueries(['events'])
    void fetchQueries(['eventDetail'], 'active')
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
