import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { QSlider } from 'quasar'
import { i18n } from '@/locales/i18n'
import AirspaceGimbalControl from './AirspaceGimbalControl.vue'

function render(canControl: boolean) {
  return mount(AirspaceGimbalControl, {
    props: {
      gimbal: { pan: 12.4, tilt: 33.6, targetId: null, mode: 'auto', commandSeq: 2 },
      pending: { seq: 3, mode: 'home' },
      canControl,
      busy: false,
    },
    global: { plugins: [i18n], components: { QSlider } },
  })
}

describe('AirspaceGimbalControl', () => {
  it('emits commands for auto, home and the slider pose', async () => {
    const wrapper = render(true)
    await wrapper.find('[data-test="airspace-gimbal-auto"]').trigger('click')
    await wrapper.find('[data-test="airspace-gimbal-home"]').trigger('click')
    await wrapper.find('[data-test="airspace-gimbal-manual"]').trigger('click')
    expect(wrapper.emitted('command')).toEqual([[{ mode: 'auto' }], [{ mode: 'home' }], [{ mode: 'manual', pan: 12, tilt: 34 }]])
    expect(wrapper.find('[data-test="airspace-gimbal-pending"]').text()).toContain('3')
  })

  it('disables control without login', () => {
    const wrapper = render(false)
    expect(wrapper.find('[data-test="airspace-gimbal-auto"]').attributes('disabled')).toBeDefined()
  })
})
