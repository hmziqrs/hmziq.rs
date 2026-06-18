import { Section } from '~/components/layout/Section'
import { Card } from '~/components/ui/Card'
import { TechIcon } from '~/components/ui/TechIcon'
import userData from '~/content/data/user.json'

export default function Skills() {
  const skills = userData.skills

  return (
    <Section
      id="skills"
      heading="Skills"
      className="relative flex items-center justify-center px-6 py-20"
    >
      <ul className="flex flex-wrap items-center justify-center gap-4">
        {skills.map((skill) => (
          <li key={skill}>
            <Card
              variant="glass"
              interactive
              className="text-fg-primary inline-flex items-center gap-2 px-5 py-2.5 font-mono text-sm md:text-base"
            >
              <TechIcon tech={skill} size={16} />
              {skill}
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  )
}
