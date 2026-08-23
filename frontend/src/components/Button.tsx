import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:pointer-events-none'
  const variants = {
    primary: 'bg-accent-primary text-text-on-accent hover:bg-accent-primary-hover',
    outline: 'bg-transparent border border-border-subtle text-text-primary hover:bg-bg-secondary',
    danger: 'bg-status-danger text-text-on-accent hover:bg-status-danger-hover',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-caption',
    md: 'px-5 py-3 text-body',
    lg: 'px-6 py-3.5 text-subheading',
  }
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
