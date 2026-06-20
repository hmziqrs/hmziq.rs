import { Section } from '~/components/layout/Section'
import { Card } from '~/components/ui/Card'
import { TechIcon } from '~/components/ui/TechIcon'
import userData from '~/content/data/user.json'

export default function Skills() {
  const skills = userData.skills

  return (
    <Section id="skills" ariaLabel="Skills" className="relative py-20">
      <div className="skills-marquee">
        {/*
          Two identical groups: translating the track by -50% advances
          exactly one group width, so the loop is seamless. The second
          group is decorative and hidden from assistive tech.
        */}
        <div className="skills-marquee__track">
          <ul className="skills-marquee__group">
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
          <ul className="skills-marquee__group" aria-hidden="true">
            {skills.map((skill) => (
              <li key={`${skill}-dup`}>
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
        </div>
      </div>
    </Section>
  )
}
