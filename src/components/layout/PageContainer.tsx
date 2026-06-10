import type { CSSProperties, ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  className?: string
  contentClassName?: string
  contentStyle?: CSSProperties
}

export function PageContainer({
  children,
  className,
  contentClassName,
  contentStyle,
}: PageContainerProps) {
  const mainClassName = className ? `relative min-h-screen ${className}` : 'relative min-h-screen'
  const innerClassName = contentClassName ? `relative ${contentClassName}` : 'relative'

  return (
    <main className={mainClassName}>
      <div className={innerClassName} style={{ zIndex: 10, ...contentStyle }}>
        {children}
      </div>
    </main>
  )
}
