import { mount, VueWrapper } from '@vue/test-utils';
import { Quasar, QLayout, QPageContainer } from 'quasar';
import { defineComponent, h } from 'vue';

/**
 * Custom mount helper for Quasar components that need QLayout context (like QPage)
 */
export function mountQuasar(component: any, options: any = {}): VueWrapper<any> {
    const { global = {}, props = {}, ...rest } = options;

    const rootComponent = defineComponent({
        name: 'QuasarTestRoot',
        setup() {
            return { component, props };
        },
        render() {
            return h(QLayout, null, {
                default: () => h(QPageContainer, null, {
                    default: () => h(this.component, this.props)
                })
            });
        }
    });

    return mount(rootComponent, {
        global: {
            ...global,
            plugins: [Quasar, ...(global.plugins || [])],
        },
        ...rest
    });
}
