import { Section } from '~/components/layout/Section'
import { GlassCard } from '~/components/ui/GlassCard'
import { TechIcon } from '~/components/ui/TechIcon'
import userData from '~/content/data/user.json'
import { useReducedMotion } from '~/hooks/useReducedMotion'

export default function Skills() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <Section
      id="skills"
      heading="Skills"
      className="relative flex items-center justify-center px-6 py-20"
    >
      <ul className="flex max-w-6xl list-none flex-row flex-wrap justify-center gap-4">
        {userData.skills.map((skill) => (
          <li key={skill}>
            <GlassCard
              className={`flex items-center gap-3 px-4 py-3 ${
                prefersReducedMotion
                  ? ''
                  : 'transition-transform duration-300 hover:scale-[1.15] hover:rotate-[3deg]'
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center">
                <TechIcon tech={skill} size={20} />
              </span>
              <span className="font-mono text-sm font-medium tracking-wide text-white">
                {skill}
              </span>
            </GlassCard>
          </li>
        ))}
      </ul>
    </Section>
  )
}
