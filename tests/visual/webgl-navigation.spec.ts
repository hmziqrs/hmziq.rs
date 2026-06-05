import { expect, test } from '@playwright/test'

test('keeps the persistent starfield context while navigating projects back home', async ({
  page,
}) => {
  test.setTimeout(60_000)

  const renderingErrors: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    if (text.includes('THREE.WebGLAttributes') || text.includes('StarField frame error')) {
      renderingErrors.push(text)
    }
  })

  await page.addInitScript(() => {
    type WebGLEventRecord = {
      label: string
      path: string
      type: string
      width: number
      height: number
      clientWidth: number
      clientHeight: number
    }

    const browserWindow = window as Window & {
      __webglEvents?: WebGLEventRecord[]
      __attachWebGLProbe?: () => void
    }

    browserWindow.__webglEvents = []

    const attach = (canvas: HTMLCanvasElement) => {
      const trackedCanvas = canvas as HTMLCanvasElement & { __webglProbeAttached?: boolean }
      if (trackedCanvas.__webglProbeAttached) return
      trackedCanvas.__webglProbeAttached = true

      canvas.addEventListener('webglcontextlost', () => {
        browserWindow.__webglEvents?.push({
          label: canvas.dataset.webglCanvas ?? '',
          path: window.location.pathname,
          type: 'lost',
          width: canvas.width,
          height: canvas.height,
          clientWidth: canvas.clientWidth,
          clientHeight: canvas.clientHeight,
        })
      })
    }

    browserWindow.__attachWebGLProbe = () => {
      document.querySelectorAll('canvas').forEach((canvas) => attach(canvas))
    }

    const observer = new MutationObserver(() => browserWindow.__attachWebGLProbe?.())
    observer.observe(document.documentElement, { childList: true, subtree: true })
    browserWindow.__attachWebGLProbe()
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('canvas[data-webgl-canvas="starfield"]')).toBeVisible()

  for (let i = 0; i < 3; i += 1) {
    await page.getByRole('link', { name: 'View all projects' }).click()
    await page.waitForURL('**/projects')
    await expect(page.locator('canvas[data-webgl-canvas="starfield"]')).toBeVisible()

    await page.goBack()
    await page.waitForURL('**/')
    await expect(page.locator('canvas[data-webgl-canvas="starfield"]')).toBeVisible()
  }

  await expect(page.locator('canvas[data-webgl-canvas="scatter-text"]')).toBeVisible()

  const status = await page.evaluate(() => {
    const starfieldCanvas = document.querySelector<HTMLCanvasElement>(
      'canvas[data-webgl-canvas="starfield"]'
    )
    const starfieldContext = starfieldCanvas?.getContext('webgl2')

    const events = (
      (
        window as Window & {
          __webglEvents?: Array<{
            label: string
            width: number
            height: number
            clientWidth: number
            clientHeight: number
          }>
        }
      ).__webglEvents ?? []
    ).filter(
      (event) =>
        event.label === 'starfield' ||
        (event.width >= window.innerWidth * 0.8 && event.height >= window.innerHeight * 0.8)
    )

    return {
      isContextLost: starfieldContext?.isContextLost() ?? true,
      starfieldLostEvents: events,
    }
  })

  expect(status.isContextLost).toBe(false)
  expect(status.starfieldLostEvents).toEqual([])
  expect(renderingErrors).toEqual([])
})
