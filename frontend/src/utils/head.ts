import type { RouteLocationNormalizedLoaded } from 'vue-router'

const SITE_NAME = 'Voyagerss'
const DEFAULT_DESCRIPTION =
  'Voyagerss — 일정·재무·항공·자동 PR을 하나의 플랫폼에서 관리하세요.'
const SITE_URL = 'https://voyagerss.com'
const DEFAULT_OG_IMAGE = `${SITE_URL}/icon-512x512.png`

function getRouteTitle(route: RouteLocationNormalizedLoaded): string {
  const meta = route.meta
  const pageTitle = meta.title ?? meta.tabTitle
  return pageTitle ? `${pageTitle} | ${SITE_NAME}` : SITE_NAME
}

function getRouteDescription(route: RouteLocationNormalizedLoaded): string {
  return route.meta.description ?? DEFAULT_DESCRIPTION
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)

  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element!.setAttribute(key, value)
  })
}

export function applyRouteHead(route: RouteLocationNormalizedLoaded) {
  const title = getRouteTitle(route)
  const description = getRouteDescription(route)
  const canonicalUrl = `${SITE_URL}${route.fullPath === '/' ? '/' : route.fullPath}`

  document.title = title

  upsertMeta('meta[name="description"]', {
    name: 'description',
    content: description
  })

  upsertMeta('meta[property="og:title"]', {
    property: 'og:title',
    content: title
  })

  upsertMeta('meta[property="og:description"]', {
    property: 'og:description',
    content: description
  })

  upsertMeta('meta[property="og:url"]', {
    property: 'og:url',
    content: canonicalUrl
  })

  upsertMeta('meta[property="og:image"]', {
    property: 'og:image',
    content: DEFAULT_OG_IMAGE
  })

  upsertMeta('meta[name="twitter:title"]', {
    name: 'twitter:title',
    content: title
  })

  upsertMeta('meta[name="twitter:description"]', {
    name: 'twitter:description',
    content: description
  })

  upsertMeta('meta[name="twitter:image"]', {
    name: 'twitter:image',
    content: DEFAULT_OG_IMAGE
  })

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.setAttribute('rel', 'canonical')
    document.head.appendChild(canonical)
  }
  canonical.setAttribute('href', canonicalUrl)
}
