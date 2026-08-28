const LEVELS = [0, 1, 2, 3, 4, 5]

interface SpicePillsProps {
  selected?: number
  onSelect: (level: number) => void
  className?: string
}

export function SpicePills({ selected, onSelect, className = '' }: SpicePillsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
        Level
      </span>
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onSelect(level)}
          aria-label={`Level kepedasan ${level}`}
          className={`h-8 min-w-8 rounded-md border px-2 font-num text-caption font-bold transition-colors ${
            selected === level
              ? 'border-accent-primary bg-accent-primary text-text-on-accent'
              : 'border-border-subtle bg-bg-surface text-text-primary hover:bg-accent-tint hover:text-accent-primary'
          }`}
        >
          {level}
        </button>
      ))}
    </div>
  )
}
