import { createFileRoute } from '@tanstack/react-router'

import { PageContainer } from '~/components/layout/PageContainer'
import { Button } from '~/components/ui/Button'
import { pageHead } from '~/lib/seo'

export const Route = createFileRoute('/$')({
  head: () => {
    const head = pageHead({
      path: '/404',
      title: 'Not found',
      description: 'The page you are looking for does not exist or has been moved.',
    })
    return {
      ...head,
      meta: [...head.meta, { name: 'robots', content: 'noindex' }],
    }
  },
  component: NotFoundPage,
})

function NotFoundPage() {
  return (
    <PageContainer contentClassName="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-fg-heading font-mono text-6xl font-bold">404</h1>
        <p className="text-fg-muted mt-4 font-mono text-sm">lost in the void</p>
        <Button variant="ghost" to="/" className="mt-8">
          Back home
        </Button>
      </div>
    </PageContainer>
  )
}
