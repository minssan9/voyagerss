import type { Router } from 'vue-router'
import { Notify } from 'quasar'

type VueInternal = {
  type?: { __file?: string; __name?: string; name?: string }
  parent?: VueInternal | null
  vnode?: { el?: Node | null }
}

function toRepoPath(file: string): string {
  const marker = '/frontend/'
  const index = file.indexOf(marker)
  if (index >= 0) return file.slice(index + 1)
  return file
}

function fileOf(internal: VueInternal | null | undefined): string | undefined {
  const file = internal?.type?.__file
  if (!file || file.includes('node_modules')) return undefined
  return toRepoPath(file)
}

function labelOf(internal: VueInternal | null | undefined): string {
  return fileOf(internal) || internal?.type?.__name || internal?.type?.name || 'unknown'
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text)
  Notify.create({ type: 'info', message: text, timeout: 2000, position: 'top' })
}

function routeComponentLabel(router: Router): string {
  const matched = router.currentRoute.value.matched
  const leaf = matched[matched.length - 1]
  const instance = leaf?.instances?.default as { $?: VueInternal } | undefined
  const fromInstance = fileOf(instance?.$)
  if (fromInstance) return fromInstance

  const component = leaf?.components?.default as { __file?: string; __name?: string; name?: string } | undefined
  if (component?.__file) return toRepoPath(component.__file)
  const name = leaf?.name
  if (typeof name === 'string' && name) return name
  return component?.__name || component?.name || router.currentRoute.value.path
}

function clickedComponentLabel(target: EventTarget | null): string | undefined {
  const element = target instanceof Element ? target : null
  let current = (element as (Element & { __vueParentComponent?: VueInternal }) | null)?.__vueParentComponent
  while (current) {
    const file = fileOf(current)
    if (file) return file
    current = current.parent
  }
  return undefined
}

export function installComponentClipboard(router: Router) {
  if (!import.meta.env.DEV) return

  const onKeyDown = (event: KeyboardEvent) => {
    if (!event.ctrlKey || !event.shiftKey || event.metaKey || event.altKey) return
    if (event.key.toLowerCase() !== 'c') return
    event.preventDefault()
    void copyText(routeComponentLabel(router))
  }

  const onClick = (event: MouseEvent) => {
    if (!event.ctrlKey || !event.shiftKey || event.metaKey || event.altKey) return
    const label = clickedComponentLabel(event.target)
    if (!label) return
    event.preventDefault()
    event.stopPropagation()
    void copyText(label)
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('click', onClick, true)

  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('click', onClick, true)
  }
}
