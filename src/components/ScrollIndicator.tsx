interface ScrollIndicatorProps {
  scrollText: string
  prefersReducedMotion: boolean
}

export function ScrollIndicator({ scrollText, prefersReducedMotion }: ScrollIndicatorProps) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 transform">
      <span className="sr-only">{scrollText}</span>
      <div className="flex flex-col items-center" aria-hidden="true">
        <div
          className="-right-1 flex h-10 w-6 justify-center rounded-full border-2 border-gray-400 transition-[border-color,transform] duration-200 hover:scale-110 hover:border-white"
          style={prefersReducedMotion ? { transition: 'none' } : undefined}
        >
          <div
            className="mt-2 h-3 w-1 rounded-full bg-gray-300"
            style={
              prefersReducedMotion ? undefined : { animation: 'bounce 2s ease-in-out infinite' }
            }
          />
        </div>
        <div className="h-2" />
        <p className="text-sm tracking-widest text-gray-300">{scrollText}</p>
      </div>
    </div>
  )
}
