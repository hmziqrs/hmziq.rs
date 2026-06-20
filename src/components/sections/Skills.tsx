import { Section } from '~/components/layout/Section'
import { Card } from '~/components/ui/Card'
import { TechIcon } from '~/components/ui/TechIcon'
import { Tooltip } from '~/components/ui/Tooltip'
import { type Skill, skills } from '~/content/skills'

function SkillItem({ skill }: { skill: Skill }) {
  return (
    <li>
      <Tooltip content={skill.short} side="top">
        <Card
          variant="glass"
          interactive
          className="text-fg-primary inline-flex items-center gap-2 px-5 py-2.5 font-mono text-sm md:text-base"
        >
          <TechIcon tech={skill.name} size={16} />
          {skill.name}
        </Card>
      </Tooltip>
    </li>
  )
}

export default function Skills() {
  return (
    <Section id="skills" ariaLabel="Skills" className="relative py-20">
      <div className="skills-marquee">
        {/*
          Two identical groups: translating the track by -50% advances
          exactly one group width, so the loop is seamless. The second
          group is decorative and hidden from assistive tech. Each card
          carries a styled tooltip with its short tagline.
        */}
        <div className="skills-marquee__track">
          <ul className="skills-marquee__group">
            {skills.map((skill) => (
              <SkillItem key={skill.slug} skill={skill} />
            ))}
          </ul>
          <ul className="skills-marquee__group" aria-hidden="true">
            {skills.map((skill) => (
              <SkillItem key={`${skill.slug}-dup`} skill={skill} />
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}
