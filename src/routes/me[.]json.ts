import { createFileRoute } from '@tanstack/react-router'

import userData from '~/content/data/user.json'

export const Route = createFileRoute('/me.json')({
  server: {
    handlers: {
      GET: () =>
        Response.json(userData, {
          headers: {
            'Cache-Control': 'public, max-age=3600, must-revalidate',
          },
        }),
    },
  },
})
