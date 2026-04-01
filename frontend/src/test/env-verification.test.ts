import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { Quasar } from 'quasar';

describe('Frontend Test Environment Verification', () => {
    it('should be able to mount a simple component with Quasar', async () => {
        const TestComponent = {
            template: '<q-btn label="Test Button" />'
        };

        const wrapper = mount(TestComponent, {
            global: {
                plugins: [Quasar]
            }
        });

        expect(wrapper.text()).toContain('Test Button');
    });

    it('should have access to global variables from Vitest', () => {
        expect(vi).toBeDefined();
        expect(describe).toBeDefined();
    });
});
