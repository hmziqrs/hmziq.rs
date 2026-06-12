import { createFileRoute } from '@tanstack/react-router'

import { PageContainer } from '~/components/layout/PageContainer'
import { InitiativeDetail } from '~/components/initiatives/InitiativeDetail'
import { BackLink } from '~/components/ui/BackLink'
import { ErrorBoundary } from '~/components/ui/ErrorBoundary'
import { findInitiativeBySlug } from '~/content/initiatives'

export const Route = createFileRoute('/initiatives/$slug')({
  head: ({ params }) => {
    const initiative = findInitiativeBySlug(params.slug)
    return {
      meta: [{ title: initiative ? `${initiative.name} - Initiatives` : 'Initiative Not Found' }],
    }
  },
  component: InitiativeDetailPage,
})

function InitiativeDetailPage() {
  const initiative = findInitiativeBySlug(Route.useParams().slug)

  if (!initiative) {
    return (
      <PageContainer contentClassName="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="font-mono text-2xl font-bold text-white">Initiative not found</h1>
          <BackLink to="/initiatives" className="mt-4">
            Back to initiatives
          </BackLink>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer contentClassName="px-6 py-20">
      <ErrorBoundary
        fallback={
          <div role="alert" className="flex min-h-screen items-center justify-center text-white">
            Something went wrong
          </div>
        }
      >
        <div className="mx-auto max-w-6xl">
          <InitiativeDetail initiative={initiative} />
        </div>
      </ErrorBoundary>
    </PageContainer>
  )
}
