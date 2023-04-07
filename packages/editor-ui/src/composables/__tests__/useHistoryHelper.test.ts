import { vi, describe, it, expect } from 'vitest';
import { MAIN_HEADER_TABS } from '@/constants';
import { render } from '@testing-library/vue';
import { useHistoryHelper } from '../useHistoryHelper';
import { defineComponent } from 'vue';
import { Route } from 'vue-router';

const undoMock = vi.fn();
const redoMock = vi.fn();
vi.mock('@/stores/ndv', () => ({
	useNDVStore: () => ({
		activeNodeName: null,
		activeNode: {}
	}),
}));
vi.mock('@/stores/history', () => {
	return {
		useHistoryStore: () => ({
			popUndoableToUndo: undoMock,
			popUndoableToRedo: redoMock
		})
	}
});
vi.mock('@/stores/ui');
vi.mock('vue-router/composables', () => ({
	useRoute: () => ({})
}));


const TestComponent = defineComponent({
	props: {
		route: {
			type: Object,
		}
	},
  setup(props) {
    useHistoryHelper(props.route as Route);

    return {};
  },
  template: `<div />`,
});

describe('useHistoryHelper', () => {
	beforeEach(() => {
		undoMock.mockClear();
		redoMock.mockClear();
	});
  it('should call undo when Ctrl+Z is pressed', () => {
		// @ts-ignore
    render(TestComponent, { props: {
			route: {
				name: MAIN_HEADER_TABS.WORKFLOW,
				meta: {
					nodeView: true
				}
			}
		}});

    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true });
    document.dispatchEvent(event);
    document.dispatchEvent(event);

		expect(undoMock).toHaveBeenCalledTimes(2);
  });
	it('should call redo when Ctrl+Shift+Z is pressed', () => {
		// @ts-ignore
    render(TestComponent, { props: {
			route: {
				name: MAIN_HEADER_TABS.WORKFLOW,
				meta: {
					nodeView: true
				}
			}
		}});

    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true });
    document.dispatchEvent(event);
    document.dispatchEvent(event);

		expect(redoMock).toHaveBeenCalledTimes(2);
  });
	it('should not call undo when Ctrl+Z if not on NodeView', () => {
		// @ts-ignore
    render(TestComponent, { props: { route: {}}});

    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true });
    document.dispatchEvent(event);
    document.dispatchEvent(event);

		expect(undoMock).toHaveBeenCalledTimes(0);
  });
});
