import { InitiativeCard } from '~/components/initiatives/InitiativeCard'
import { MysteryCard } from '~/components/initiatives/MysteryCard'
import { Section } from '~/components/layout/Section'
import { initiatives } from '~/content/initiatives'

export default function Initiatives() {
  return (
    <Section
      id="initiatives"
      heading="Initiatives"
      className="relative flex min-h-screen items-center justify-center px-6 py-20"
    >
      <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initiatives.map((initiative) => (
          <InitiativeCard key={initiative.name} initiative={initiative} />
        ))}
        <MysteryCard />
      </ul>
    </Section>
  )
}
