import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAirspaceAlerts } from './useAirspaceAlerts'
import type { AirspaceEvent } from '@/modules/vision/api/api-airspace'

const ev = (over: Partial<AirspaceEvent>): AirspaceEvent => ({
  seq: 1, at: '2026-10-19T00:00:00Z', sessionId: 's', type: 'threat_up', trackId: 3, threat: 'HIGH', ...over,
})

describe('useAirspaceAlerts', () => {
  const notifications: { title: string; body?: string }[] = []

  beforeEach(() => {
    localStorage.clear()
    notifications.length = 0
    class FakeNotification {
      static permission = 'granted'
      static requestPermission = vi.fn(async () => 'granted')
      constructor(title: string, opts?: { body?: string }) {
        notifications.push({ title, body: opts?.body })
      }
    }
    vi.stubGlobal('Notification', FakeNotification)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('stays quiet until enabled, then notifies only for HIGH', async () => {
    const alerts = useAirspaceAlerts((e) => `T${e.trackId}`, () => 'alert')
    expect(alerts.notify(ev({}))).toBe(false)
    await alerts.toggle(true)
    expect(alerts.notify(ev({ threat: 'MEDIUM' }))).toBe(false)
    expect(alerts.notify(ev({ type: 'track_lost' }))).toBe(false)
    expect(alerts.notify(ev({}))).toBe(true)
    expect(notifications).toEqual([{ title: 'alert', body: 'T3' }])
  })

  it('remembers the toggle in localStorage', async () => {
    const first = useAirspaceAlerts(() => '', () => '')
    await first.toggle(true)
    await Promise.resolve()
    expect(localStorage.getItem('voy-airspace-alerts')).toBe('on')
    expect(useAirspaceAlerts(() => '', () => '').enabled.value).toBe(true)
  })
})
