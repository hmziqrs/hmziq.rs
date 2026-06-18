import { getTechIcon } from '~/lib/techIcons'

interface TechIconProps {
  tech: string
  size?: number
}

export function TechIcon({ tech, size = 14 }: TechIconProps) {
  const { icon: Icon, color, abbr } = getTechIcon(tech)

  if (Icon) return <Icon size={size} color={color} aria-hidden="true" />
  if (!abbr) return null

  return (
    <span className="text-micro font-mono font-bold" style={{ color }} aria-hidden="true">
      {abbr}
    </span>
  )
}
