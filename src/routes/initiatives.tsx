import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'

import { PageContainer } from '~/components/layout/PageContainer'
import { InitiativeCard } from '~/components/initiatives/InitiativeCard'
import { BackLink } from '~/components/ui/BackLink'
import { ErrorBoundary } from '~/components/ui/ErrorBoundary'
import { initiatives } from '~/content/initiatives'

export const Route = createFileRoute('/initiatives')({
  component: InitiativesPage,
  head: () => ({ meta: [{ title: 'Initiatives - hmziq.rs' }] }),
})

function InitiativesPage() {
  if (useLocation().pathname === '/initiatives') {
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
            <header className="mb-12">
              <div className="mb-6">
                <BackLink to="/">Back home</BackLink>
              </div>
              <h1 className="font-mono text-2xl font-bold tracking-wider text-white md:text-3xl">
                Initiatives
              </h1>
              <p className="mt-2 font-mono text-sm text-white/55">
                {initiatives.length} initiatives
              </p>
            </header>
            <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {initiatives.map((initiative) => (
                <InitiativeCard key={initiative.slug} initiative={initiative} />
              ))}
            </ul>
          </div>
        </ErrorBoundary>
      </PageContainer>
    )
  }

  return (
    <ErrorBoundary
      fallback={
        <PageContainer contentClassName="flex min-h-screen items-center justify-center">
          <div className="text-white" role="alert">
            Something went wrong
          </div>
        </PageContainer>
      }
    >
      <Outlet />
    </ErrorBoundary>
  )
}
