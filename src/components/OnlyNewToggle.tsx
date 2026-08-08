import Button from '@mui/material/Button'

export function OnlyNewToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <Button
      data-testid="only-new-toggle"
      size="small"
      variant={active ? 'contained' : 'outlined'}
      color="error"
      aria-pressed={active}
      onClick={onToggle}
    >
      {active ? 'Showing only new' : 'Only new'}
    </Button>
  )
}
