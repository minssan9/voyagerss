import type { Composer } from 'vue-i18n'

/**
 * tm() 로 가져온 배열/객체 메시지를 일반 문자열 구조로 변환
 * 예) const items = resolveMessages<{ q: string; a: string }[]>(tm, rt, 'consulting.faq.items')
 */
export function resolveMessages<T>(tm: Composer['tm'], rt: Composer['rt'], key: string): T {
  const toPlain = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(toPlain)
    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
      return typeof node === 'string' ? rt(node) : node
    }
    if (node && typeof node === 'object' && !('type' in (node as object)) && !('b' in (node as object))) {
      return Object.fromEntries(Object.entries(node as object).map(([k, v]) => [k, toPlain(v)]))
    }
    return rt(node as Parameters<Composer['rt']>[0])
  }
  return toPlain(tm(key)) as T
}
