import { type ReactElement, type ReactNode } from 'react'

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  content: ReactNode
  side?: TooltipSide
  className?: string
  children: ReactElement
}

const sideClasses: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

export function Tooltip({ content, side = 'top', className = '', children }: TooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`text-fg-meta/90 pointer-events-none absolute z-50 rounded bg-neutral-900 px-2 py-1 text-xs whitespace-nowrap opacity-0 shadow-lg transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none ${sideClasses[side]} ${className}`}
      >
        {content}
      </span>
    </span>
  )
}
