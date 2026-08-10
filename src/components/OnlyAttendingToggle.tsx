import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'

export function OnlyAttendingToggle({ active, disabled, onToggle }: { active: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <FormControlLabel
      control={<Switch data-testid="only-attending-toggle" checked={active} disabled={disabled} onChange={onToggle} />}
      label="Joined"
    />
  )
}
