import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'

export function OnlyNewToggle({ active, disabled, onToggle }: { active: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <FormControlLabel
      control={<Switch data-testid="only-new-toggle" checked={active} disabled={disabled} onChange={onToggle} />}
      label="Show new"
    />
  )
}
