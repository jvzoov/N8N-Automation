import fs from 'fs';
import path from 'path';
import { Scenario } from '@/types/scenario';
import { Workflow } from '@/n8nApiClient/n8nApiClient.types';

/**
 * Loads scenario data files from FS
 */
export class ScenarioDataFileLoader {
	async loadDataForScenario(scenario: Scenario): Promise<{
		workflows: Workflow[];
	}> {
		const workflows = await Promise.all(
			scenario.scenarioData.workflowFiles?.map((workflowFilePath) =>
				this.loadSingleWorkflowFromFile(path.join(scenario.scenarioDirPath, workflowFilePath)),
			) ?? [],
		);

		return {
			workflows,
		};
	}

	private loadSingleWorkflowFromFile(workflowFilePath: string): Workflow {
		const fileContent = fs.readFileSync(workflowFilePath, 'utf8');

		const workflow = JSON.parse(fileContent);

		return workflow;
	}
}