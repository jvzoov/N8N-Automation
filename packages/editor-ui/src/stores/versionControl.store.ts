import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import { EnterpriseEditionFeature } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import * as vcApi from '@/api/versionControl';
import { useRootStore } from '@/stores/n8nRoot.store';
import type { VersionControlPreferences } from '@/Interface';

export const useVersionControlStore = defineStore('versionControl', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const isEnterpriseVersionControlEnabled = computed(() =>
		settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.VersionControl),
	);

	const preferences = reactive<VersionControlPreferences>({
		branchName: '',
		branches: [],
		authorName: '',
		authorEmail: '',
		repositoryUrl: '',
		branchReadOnly: false,
		branchColor: '#F4A6DC',
		connected: false,
		publicKey: '',
	});

	const state = reactive({
		commitMessage: 'commit message',
	});

	const sync = async (data: { commitMessage: string }) => {
		state.commitMessage = data.commitMessage;
		return vcApi.sync(rootStore.getRestApiContext, { message: data.commitMessage });
	};

	const setPreferences = (data: Partial<VersionControlPreferences>) => {
		Object.assign(preferences, data);
	};

	const getBranches = async () => {
		const data = await vcApi.getBranches(rootStore.getRestApiContext);
		setPreferences(data);
	};

	const getPreferences = async () => {
		const data = await vcApi.getPreferences(rootStore.getRestApiContext);
		setPreferences(data);
		if (data.connected) await vcApi.getBranches(rootStore.getRestApiContext);
	};

	const savePreferences = async (preferences: Partial<VersionControlPreferences>) => {
		const data = await vcApi.setPreferences(rootStore.getRestApiContext, preferences);
		setPreferences(data);
	};

	const setBranch = async (branch: string) => {
		const data = await vcApi.setBranch(rootStore.getRestApiContext, branch);
		await vcApi.connect(rootStore.getRestApiContext);
		setPreferences(data);
	};

	return {
		isEnterpriseVersionControlEnabled,
		state,
		preferences,
		sync,
		getPreferences,
		setPreferences,
		getBranches,
		savePreferences,
		setBranch,
	};
});
