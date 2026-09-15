export function DateGroupHeader({ header, dateKey, unavailable, onToggleUnavailable }: { header: string; dateKey: string; unavailable: boolean; onToggleUnavailable: (dateKey: string) => void }) {
  const toggle = () => onToggleUnavailable(dateKey)

  return (
    <div className={`date-group-header${unavailable ? ' date-group-header-unavailable' : ''}`} data-testid="date-group-header">
      <span className="date-group-header-text">{header}</span>
      <span
        role="checkbox"
        aria-checked={unavailable}
        tabIndex={0}
        data-testid="unavailable-date-toggle"
        className={`unavailable-toggle${unavailable ? ' unavailable-toggle-on' : ''}`}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
          }
        }}
      >
        {unavailable ? '\u2713 unavailable' : 'unavailable'}
      </span>
    </div>
  )
}