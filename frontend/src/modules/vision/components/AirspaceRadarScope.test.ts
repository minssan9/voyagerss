import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/locales/i18n'
import AirspaceRadarScope from './AirspaceRadarScope.vue'
import type { AirspaceTrack } from '@/modules/vision/api/api-airspace'

function track(over: Partial<AirspaceTrack>): AirspaceTrack {
  return {
    id: 1,
    status: 'confirmed',
    label: 'aerial',
    azimuth: 0,
    elevation: 0,
    range: 75,
    radialVelocity: 0,
    sources: ['radar'],
    threat: 'LOW',
    threatScore: 0.2,
    ...over,
  }
}

function render(tracks: AirspaceTrack[], targetId: number | null = null) {
  return mount(AirspaceRadarScope, {
    props: { tracks, pan: 0, hfov: 66, targetId, maxRange: 150 },
    global: { plugins: [i18n] },
  })
}

describe('AirspaceRadarScope', () => {
  it('places a ranged track by ground range and azimuth (up = ahead, right = +)', () => {
    const circle = render([track({ azimuth: 90, range: 75 })]).find('.airspace-scope__track circle')
    expect(Number(circle.attributes('cx'))).toBeCloseTo(0.5, 3)
    expect(Number(circle.attributes('cy'))).toBeCloseTo(0, 3)
  })

  it('uses ground range, so a high target sits closer to the centre', () => {
    const circle = render([track({ azimuth: 0, elevation: 60, range: 150 })]).find('.airspace-scope__track circle')
    expect(Number(circle.attributes('cy'))).toBeCloseTo(-0.5, 3)
  })

  it('draws camera-only tracks as bearing ticks and hides tentative tracks', () => {
    const wrapper = render([
      track({ id: 2, range: null, azimuth: -45 }),
      track({ id: 3, status: 'tentative' }),
    ])
    expect(wrapper.findAll('.airspace-scope__bearing')).toHaveLength(1)
    expect(wrapper.text()).toContain('T2')
    expect(wrapper.text()).not.toContain('T3')
  })

  it('colours by threat and marks the followed target', () => {
    const wrapper = render([track({ id: 5, threat: 'HIGH' })], 5)
    expect(wrapper.find('.airspace-scope__track--high').exists()).toBe(true)
    expect(wrapper.find('.airspace-scope__track-target').exists()).toBe(true)
  })
})
