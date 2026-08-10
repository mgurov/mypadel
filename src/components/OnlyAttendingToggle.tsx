import Button from '@mui/material/Button'

export function OnlyAttendingToggle({ active, disabled, onToggle }: { active: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <Button
      data-testid="only-attending-toggle"
      size="small"
      variant={active ? 'contained' : 'outlined'}
      aria-pressed={active}
      disabled={disabled}
      onClick={onToggle}
    >
      {active ? 'Showing only attending' : 'Only attending'}
    </Button>
  )
}
