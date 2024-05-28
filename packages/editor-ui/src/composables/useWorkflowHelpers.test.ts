import type { IWorkflowDataUpdate, IWorkflowDb } from '@/Interface';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import router from '@/router';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

const duplicateTestWorkflow: IWorkflowDataUpdate = {
	name: 'Duplicate webhook test',
	active: false,
	nodes: [
		{
			parameters: {
				path: '5340ae49-2c96-4492-9073-7744d2e52b8a',
				options: {},
			},
			id: 'c1e1b6e7-df13-41b1-95f6-42903b85e438',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [680, 20],
			webhookId: '5340ae49-2c96-4492-9073-7744d2e52b8a',
		},
		{
			parameters: {
				path: 'aa5150d8-1d7d-4247-88d8-44c96fe3a37b',
				options: {},
			},
			id: 'aa5150d8-1d7d-4247-88d8-44c96fe3a37b',
			name: 'Webhook 2',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 2,
			position: [700, 40],
			webhookId: 'aa5150d8-1d7d-4247-88d8-44c96fe3a37b',
		},
		{
			parameters: {
				resume: 'webhook',
				options: {
					webhookSuffix: '/test',
				},
			},
			id: '979d8443-51b1-48e2-b239-acf399b66509',
			name: 'Wait',
			type: 'n8n-nodes-base.wait',
			typeVersion: 1.1,
			position: [900, 20],
			webhookId: '5340ae49-2c96-4492-9073-7744d2e52b8a',
		},
	],
	connections: {},
};

vi.mock('@/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn(() => ({
		workflowsById: {},
		createNewWorkflow: vi.fn(() => {}),
		addWorkflow: vi.fn(() => {}),
		setActive: vi.fn(() => {}),
		setWorkflowId: vi.fn(() => {}),
		setWorkflowVersionId: vi.fn(() => {}),
		setWorkflowName: vi.fn(() => {}),
		setWorkflowSettings: vi.fn(() => {}),
		setNodeValue: vi.fn(() => {}),
		setWorkflowTagIds: vi.fn(() => {}),
		getCurrentWorkflow: vi.fn(() => ({})),
	})),
}));

describe('useWorkflowHelpers', () => {
	describe('saveAsNewWorkflow', () => {
		beforeAll(() => {
			setActivePinia(createTestingPinia());
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should update webhook ids and path when duplicating workflow', async () => {
			if (!duplicateTestWorkflow.nodes) {
				throw new Error('Missing nodes in test workflow');
			}
			const { saveAsNewWorkflow } = useWorkflowHelpers({ router });
			const webHookIdsPreSave = duplicateTestWorkflow.nodes.map((node) => node.webhookId);
			const pathsPreSave = duplicateTestWorkflow.nodes.map((node) => node.parameters.path);
			const webhookSuffixPreSave = duplicateTestWorkflow.nodes
				.map((node) => node.parameters.options)
				.filter((options): options is { webhookSuffix: string } => typeof options !== 'string')
				.map((options) => options.webhookSuffix)
				.filter((suffix) => suffix);

			await saveAsNewWorkflow({
				name: duplicateTestWorkflow.name,
				resetWebhookUrls: true,
				data: duplicateTestWorkflow,
			});

			const webHookIdsPostSave = duplicateTestWorkflow.nodes.map((node) => node.webhookId);
			const pathsPostSave = duplicateTestWorkflow.nodes.map((node) => node.parameters.path);
			const webhookSuffixPostSave = duplicateTestWorkflow.nodes
				.map((node) => node.parameters.options)
				.filter((options): options is { webhookSuffix: string } => typeof options !== 'string')
				.map((options) => options.webhookSuffix)
				.filter((suffix) => suffix);
			// Expect webhookIds, paths and suffix to be different
			expect(webHookIdsPreSave).not.toEqual(webHookIdsPostSave);
			expect(pathsPreSave).not.toEqual(pathsPostSave);
			expect(webhookSuffixPreSave).not.toEqual(webhookSuffixPostSave);
		});

		it('should respect `resetWebhookUrls` when duplicating workflows', async () => {
			if (!duplicateTestWorkflow.nodes) {
				throw new Error('Missing nodes in test workflow');
			}
			const { saveAsNewWorkflow } = useWorkflowHelpers({ router });
			const webHookIdsPreSave = duplicateTestWorkflow.nodes.map((node) => node.webhookId);
			const pathsPreSave = duplicateTestWorkflow.nodes.map((node) => node.parameters.path);
			const webhookSuffixPreSave = duplicateTestWorkflow.nodes
				.map((node) => node.parameters.options)
				.filter((options): options is { webhookSuffix: string } => typeof options !== 'string')
				.map((options) => options.webhookSuffix)
				.filter((suffix) => suffix);

			await saveAsNewWorkflow({
				name: duplicateTestWorkflow.name,
				resetWebhookUrls: false,
				data: duplicateTestWorkflow,
			});

			const webHookIdsPostSave = duplicateTestWorkflow.nodes.map((node) => node.webhookId);
			const pathsPostSave = duplicateTestWorkflow.nodes.map((node) => node.parameters.path);
			const webhookSuffixPostSave = duplicateTestWorkflow.nodes
				.map((node) => node.parameters.options)
				.filter((options): options is { webhookSuffix: string } => typeof options !== 'string')
				.map((options) => options.webhookSuffix)
				.filter((suffix) => suffix);
			// Now, webhookIds, paths and suffix should be the same
			expect(webHookIdsPreSave).toEqual(webHookIdsPostSave);
			expect(pathsPreSave).toEqual(pathsPostSave);
			expect(webhookSuffixPreSave).not.toEqual(webhookSuffixPostSave);
		});
	});
});