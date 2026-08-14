import Button from '@mui/material/Button'

export function AckAllButton({ count, onAckAll }: { count: number; onAckAll: () => void }) {
  if (count < 2) return null
  return (
    <Button
      data-testid="ack-all-button"
      size="small"
      variant="outlined"
      color="error"
      onClick={onAckAll}
    >
      Ack all {count} new events
    </Button>
  )
}
