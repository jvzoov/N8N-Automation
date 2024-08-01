/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeOperationError,
	type IExecuteFunctions,
	type ILoadOptionsFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import set from 'lodash/set';

import { JavaScriptSandbox } from '../Code/JavaScriptSandbox';
import { getSandboxContext } from '../Code/Sandbox';
import { standardizeOutput } from '../Code/utils';

const { CODE_ENABLE_STDOUT } = process.env;

export class AiTransform implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AI Transform',
		name: 'aiTransform',
		icon: 'file:aitransform.svg',
		group: ['transform'],
		version: 1,
		description: 'Modify data based on instructions written in plain english',
		defaults: {
			name: 'AI Transform',
		},
		inputs: ['main'],
		outputs: ['main'],
		parameterPane: 'wide',
		properties: [
			{
				displayName: 'Instructions',
				name: 'generate',
				type: 'button',
				default: '',
				description:
					"Provide instructions on how you want to transform the data, then click 'Generate code'",
				placeholder:
					"Example: Merge 'firstname' and 'lastname' into a field 'details.name' and sort by 'email'",
				typeOptions: {
					buttonLabel: 'Generate code',
					buttonHasInputField: true,
					buttonInputFieldMaxLength: 500,
					action: {
						type: 'generateCodeFromPrompt',
						handler: 'generateCode',
						target: 'jsCode',
					},
				},
			},
			{
				displayName: 'Transformation Code',
				name: 'jsCode',
				type: 'string',
				typeOptions: {
					// editor: 'codeNodeEditor',
					// editorLanguage: 'javaScript',
					editor: 'jsEditor',
					editorIsReadOnly: true,
				},
				default:
					"// Enter some text to 'Instructions' and click 'Generate code' button\n\nreturn [];",
				description:
					'Read-only. To edit this code, adjust the prompt or copy and paste it into a Code node.',
				noDataExpression: true,
				// hint: 'To edit this code, adjust the prompt. Or copy and paste into a code node',
				displayOptions: {
					hide: {
						generate: [{ _cnd: { eq: '' } }],
					},
				},
			},
			{
				displayName:
					"Click on 'Test step' to run the transformation code. Further executions will use the generated code (and not invoke AI again).",
				name: 'hint',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						generate: [{ _cnd: { eq: '' } }],
					},
				},
			},
			{
				displayName: 'AI Service URL',
				name: 'url',
				type: 'string',
				default: 'http://localhost:5678/webhook/ai-service',
				isNodeSetting: true,
			},
		],
	};

	methods = {
		actionHandler: {
			async generateCode(
				this: ILoadOptionsFunctions,
				payload: string,
				inputData: INodeExecutionData[],
			) {
				const url = this.getNodeParameter('url') as string;
				const { output } = (await this.helpers.httpRequest({
					method: 'POST',
					url,
					headers: {
						'Content-Type': 'application/json',
					},
					body: {
						prompt: payload,
						input: inputData,
					},
				})) as {
					output: string;
				};

				return output;
			},
		},
	};

	async execute(this: IExecuteFunctions) {
		const workflowMode = this.getMode();

		const node = this.getNode();

		const codeParameterName = 'jsCode';

		const getSandbox = (index = 0) => {
			let code = '';
			try {
				code = this.getNodeParameter(codeParameterName, index) as string;
			} catch (error) {
				throw new NodeOperationError(node, 'No code provided', {
					description: "Enter some text to 'Instructions' and click 'Generate Code' button",
				});
			}

			const context = getSandboxContext.call(this, index);

			context.items = context.$input.all();

			const Sandbox = JavaScriptSandbox;
			const sandbox = new Sandbox(context, code, index, this.helpers);
			sandbox.on(
				'output',
				workflowMode === 'manual'
					? this.sendMessageToUI
					: CODE_ENABLE_STDOUT === 'true'
						? (...args) =>
								console.log(`[Workflow "${this.getWorkflow().id}"][Node "${node.name}"]`, ...args)
						: () => {},
			);
			return sandbox;
		};

		const sandbox = getSandbox();
		let items: INodeExecutionData[];
		try {
			items = (await sandbox.runCodeAllItems()) as INodeExecutionData[];
		} catch (error) {
			if (!this.continueOnFail(error)) {
				set(error, 'node', node);
				throw error;
			}
			items = [{ json: { error: error.message } }];
		}

		for (const item of items) {
			standardizeOutput(item.json);
		}

		return [items];
	}
}