interface ErrorBannerProps {
  message: string
  variant?: 'inline' | 'toast'
  className?: string
}

export function ErrorBanner({ message, variant = 'inline', className = '' }: ErrorBannerProps) {
  if (variant === 'toast') {
    return (
      <div
        className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-status-danger px-4 py-2 text-body font-semibold text-text-on-accent shadow-dropdown ${className}`.trim()}
      >
        {message}
      </div>
    )
  }
  return (
    <div
      className={`rounded-lg bg-status-danger/15 px-4 py-2 text-body font-semibold text-status-danger ${className}`.trim()}
    >
      {message}
    </div>
  )
}