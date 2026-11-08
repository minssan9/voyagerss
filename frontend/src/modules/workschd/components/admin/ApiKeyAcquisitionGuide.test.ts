import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { Quasar } from 'quasar';
import ApiKeyAcquisitionGuide from './ApiKeyAcquisitionGuide.vue';
import { API_KEY_ACQUISITION_GUIDES } from '@/modules/workschd/config/api-key-acquisition-guides';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('ApiKeyAcquisitionGuide', () => {
  it('renders official links with visible URL text and rel noopener noreferrer', () => {
    const wrapper = mount(ApiKeyAcquisitionGuide, {
      props: { configKey: 'FRED_API_KEY' },
      global: {
        plugins: [[Quasar, {}]],
      },
    });

    const links = wrapper.findAll('a');
    const guide = API_KEY_ACQUISITION_GUIDES.FRED_API_KEY;
    expect(links.length).toBe(guide.links.length);

    links.forEach((anchor, i) => {
      expect(anchor.attributes('href')).toBe(guide.links[i].href);
      expect(anchor.text()).toBe(guide.links[i].label);
      expect(anchor.attributes('target')).toBe('_blank');
      expect(anchor.attributes('rel')).toContain('noopener');
      expect(anchor.attributes('rel')).toContain('noreferrer');
    });

    expect(wrapper.text()).not.toMatch(/[a-f0-9]{32,}/i);
  });
});
