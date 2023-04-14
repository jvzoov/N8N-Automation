import '@testing-library/jest-dom';
import { configure } from '@testing-library/vue';
import Vue from 'vue';
import '../plugins';
import { I18nPlugin } from '@/plugins/i18n';
import { configure } from '@testing-library/vue';

configure({ testIdAttribute: 'data-test-id' });

Vue.config.productionTip = false;
Vue.config.devtools = false;

// TODO: Investigate why this is needed
// Without having this 3rd party library imported like this, any component test using 'vue-json-pretty' fail with:
// [Vue warn]: Failed to mount component: template or render function not defined.
Vue.component('vue-json-pretty', require('vue-json-pretty').default);
Vue.use((vue) => I18nPlugin(vue));

window.ResizeObserver =
	window.ResizeObserver ||
	vi.fn().mockImplementation(() => ({
		disconnect: vi.fn(),
		observe: vi.fn(),
		unobserve: vi.fn(),
	}));

// Configure Testing Library
configure({ testIdAttribute: 'data-test-id' });
