import { GlowTile } from '~/components/GlowTile'
import { Section, useSectionItemVariants } from '~/components/Section'
import { userProfile } from '~/lib/content/UserProfile'
import { getTechIcon } from '~/lib/techIcons'

export default function Skills() {
  const { prefersReducedMotion } = useSectionItemVariants()
  const skills = userProfile.skills

  return (
    <Section
      id="skills"
      heading="Skills"
      className="relative flex items-center justify-center px-6 py-20"
    >
      <ul className="flex max-w-6xl list-none flex-row flex-wrap justify-center gap-4">
        {skills.map((skill) => (
          <li key={skill}>
            <GlowTile
              icon={<SkillIcon skill={skill} />}
              label={skill}
              direction="row"
              className="to-white/[0.03] px-4 py-3 backdrop-blur-xl hover:to-white/[0.05]"
              prefersReducedMotion={prefersReducedMotion}
            />
          </li>
        ))}
      </ul>
    </Section>
  )
}

function SkillIcon({ skill }: { skill: string }) {
  const entry = getTechIcon(skill)
  const IconComponent = entry.icon

  if (!IconComponent) {
    if (entry.abbr) {
      return (
        <span
          className="flex h-5 w-5 items-center justify-center text-[10px] leading-none font-bold"
          style={{ color: entry.color }}
          aria-hidden="true"
        >
          {entry.abbr}
        </span>
      )
    }
    return null
  }

  return <IconComponent size={20} color={entry.color} aria-hidden="true" />
}
