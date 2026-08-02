import Button from '@mui/material/Button'
import { buildEventIcs, eventIcsFilename } from '../ics'
import type { Event } from '../api'

export function AddToCalendarButton({ event }: { event: Event }) {
  const download = () => {
    const blob = new Blob([buildEventIcs(event)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = eventIcsFilename(event)
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outlined" size="small" onClick={download}>
      Add to Calendar
    </Button>
  )
}
