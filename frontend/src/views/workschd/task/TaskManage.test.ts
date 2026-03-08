import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { Quasar } from 'quasar';
import TaskManage from './TaskManage.vue';
import apiTask from '@/api/workschd/api-task';

// Mock API
vi.mock('@/api/workschd/api-task', () => ({
    default: {
        fetchTasks: vi.fn(),
        createTask: vi.fn(),
        updateTask: vi.fn(),
        approveJoinRequest: vi.fn(),
        createTaskEmployeeRequest: vi.fn(),
    }
}));

// Mock GridDefault component
vi.mock('@/components/grid/GridDefault.vue', () => ({
    default: {
        name: 'GridDefault',
        template: '<div class="grid-default-mock"></div>'
    }
}));

// Mock TaskDialog
vi.mock('@/views/workschd/task/dialog/TaskDialog.vue', () => ({
    default: {
        name: 'TaskDialog',
        template: '<div class="task-dialog-mock"></div>',
        props: ['modelValue', 'task', 'shops', 'requests', 'isSubmitting']
    }
}));

// Mock TaskEmployeeGrid
vi.mock('@/views/workschd/task/grid/TaskEmployeeGrid.vue', () => ({
    default: {
        name: 'TaskEmployeeGrid',
        template: '<div class="task-employee-grid-mock"></div>'
    }
}));

// Mock stores
vi.mock('@/stores/common/store_user', () => ({
    useUserStore: () => ({
        user: { accountId: '1', teamId: 1 }
    })
}));

vi.mock('@/stores/workschd/store_team', () => ({
    useTeamStore: () => ({
        shops: [{ id: 1, name: 'Shop 1' }],
        loadShops: vi.fn(),
        error: null
    })
}));

// Mock i18n
vi.mock('vue-i18n', () => ({
    useI18n: () => ({
        t: (key: string) => key
    })
}));

describe('TaskManage.vue', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();

        // Setup success response for fetchTasks
        (apiTask.fetchTasks as any).mockResolvedValue({
            data: [
                { id: 1, title: 'Test Task', status: 'OPEN', teamId: 1, shopId: 1 }
            ]
        });
    });

    it('renders correctly and loads data on mount', async () => {
        const wrapper = mount(TaskManage, {
            global: {
                plugins: [[Quasar, {}]],
                stubs: {
                    'GridDefault': true,
                    'TaskDialog': true,
                    'TaskEmployeeGrid': true,
                    'q-layout': true,
                    'q-page-container': true,
                    'q-page': true,
                    'q-btn': true,
                    'q-btn-toggle': true,
                    'q-banner': true,
                    'q-icon': true,
                    'q-card': true,
                    'q-item': true,
                    'q-item-section': true,
                    'q-list': true,
                    'q-chip': true,
                    'q-dialog': true
                }
            }
        });

        expect(wrapper.text()).toContain('Task List of Today');
        expect(apiTask.fetchTasks).toHaveBeenCalled();
    });
});
