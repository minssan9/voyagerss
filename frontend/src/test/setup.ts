import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { config } from '@vue/test-utils';
import {
    Quasar,
    QBtn,
    QInput,
    QCard,
    QCardSection,
    QCardActions,
    QTable,
    QTh,
    QTd,
    QTr,
    QLayout,
    QPageContainer,
    QPage,
    QBtnToggle,
    QBanner,
    QIcon,
    QChip,
    QList,
    QItem,
    QItemSection,
    QDialog,
    ClosePopup
} from 'quasar';

// Mock Window matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Configure global test environment
config.global.plugins = [[Quasar, {}]];

config.global.components = {
    QBtn,
    QInput,
    QCard,
    QCardSection,
    QCardActions,
    QTable,
    QTh,
    QTd,
    QTr,
    QLayout,
    QPageContainer,
    QPage,
    QBtnToggle,
    QBanner,
    QIcon,
    QChip,
    QList,
    QItem,
    QItemSection,
    QDialog
};

config.global.directives = {
    ClosePopup
};
