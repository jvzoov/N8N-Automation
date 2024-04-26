/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
	INodeProperties,
	ExecutionError,
	IDataObject,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError, jsonParse } from 'n8n-workflow';

import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

import { DynamicTool } from '@langchain/core/tools';

const prettifyToolName = (toolName: string) => {
	const capitalize = (str: string) => {
		const chars = str.split('');
		chars[0] = chars[0].toUpperCase();
		return chars.join('');
	};

	return toolName.split('_').map(capitalize).join(' ');
};

const prepareParameters = (parameters: ToolParameter[]) => {
	let description = '';

	for (const parameter of parameters) {
		description += `
		\n
		---
		Name: ${parameter.name}
		Description: ${parameter.description}
		Type: ${parameter.type === 'fromDescription' ? 'Infer from description' : parameter.type}
		${parameter.enumOptions ? `Enum Options: ${parameter.enumOptions}` : ''}
		---\n
		`;
	}

	return description;
};

const prepareToolDescription = (
	toolDescription: string,
	pathParameters: ToolParameter[],
	queryParameters: ToolParameter[],
	bodyParameters: ToolParameter[],
) => {
	let description = `
	`;

	description += `
	${toolDescription}
	`;

	if (pathParameters.length) {
		description += `
		\n
		This tool expects the following path parameters and should be in format appropriate to be send in the request path:\n
		`;

		description += prepareParameters(pathParameters);
	}

	if (queryParameters.length) {
		description += `
		\n
		This tool expects the following query parameters:\n
		`;

		description += prepareParameters(queryParameters);
	}

	if (bodyParameters.length) {
		description += `
		\n
		This tool expects the following body parameters:\n
		`;

		description += prepareParameters(bodyParameters);
	}

	description += `
	give an response as correct stringified JSON that could be pluged and parsed with JSON.parse in nodejs

	DO NOT PROVIDE ADDITIONAL TEXT OR EXPLANATION!!!
	DO NOT FORMAT AS CODE!!!
	`;

	return description;
};

type ToolParameter = {
	name: string;
	type: 'fromDescription' | 'string' | 'number' | 'boolean' | 'array';
	description: string;
	enumOptions?: string;
};

const parametersCollection: INodeProperties = {
	displayName: 'Parameters',
	name: 'parameters',
	type: 'fixedCollection',
	default: {},
	placeholder: 'Add Parameter',
	typeOptions: {
		multipleValues: true,
	},
	options: [
		{
			displayName: 'Values',
			name: 'values',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					placeholder: 'e.g. location',
					default: '',
					validateType: 'string-alphanumeric',
				},
				{
					displayName: 'Description',
					name: 'description',
					type: 'string',
					default: '',
					description: 'Describe to llm what the parameter is for',
					typeOptions: {
						rows: 2,
					},
				},
				{
					displayName: 'Type',
					name: 'type',
					type: 'options',
					default: 'fromDescription',
					// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
					options: [
						{
							name: 'Infer From Description',
							value: 'fromDescription',
						},
						{
							name: 'Boolean',
							value: 'boolean',
						},
						{
							name: 'Enum',
							value: 'enum',
						},
						{
							name: 'Number',
							value: 'number',
						},
						{
							name: 'String',
							value: 'string',
						},
					],
				},
				{
					displayName: 'Enum Options',
					name: 'enumOptions',
					type: 'string',
					default: '',
					hint: 'Comma separated list of enum options',
					displayOptions: {
						show: {
							type: ['enum'],
						},
					},
				},
			],
		},
	],
};

export class ToolHttpRequest implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HTTP Request Tool',
		name: 'toolHttpRequest',
		icon: 'file:httprequest.svg',
		group: ['output'],
		version: 1,
		description: 'Makes an HTTP request and returns the response data',
		subtitle: `={{(${prettifyToolName})($parameter.name)}}`,
		defaults: {
			name: 'HTTP Request',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolhttprequest/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiTool],
		outputNames: ['Tool'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiAgent]),
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				placeholder: 'e.g. get_current_weather',
				validateType: 'string-alphanumeric',
				description:
					'The name of the function to be called, could contain letters, numbers, and underscores only',
			},
			{
				displayName: 'Description',
				name: 'toolDescription',
				type: 'string',
				default: '',
				typeOptions: {
					rows: 3,
				},
			},
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				options: [
					{
						name: 'GET',
						value: 'GET',
					},
					{
						name: 'POST',
						value: 'POST',
					},
					{
						name: 'PUT',
						value: 'PUT',
					},
					{
						name: 'PATCH',
						value: 'PATCH',
					},
				],
				default: 'GET',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://wikipedia.org/api',
				validateType: 'url',
			},
			{
				displayName: 'Send in Path',
				name: 'sendInPath',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: 'Whether the llm should provide path parameters',
			},
			{
				...parametersCollection,
				displayName: 'Path Parameters',
				name: 'pathParameters',
				displayOptions: {
					show: {
						sendInPath: [true],
					},
				},
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'e.g. /weather/{latitude}/{longitude}',
				hint: "Use {parameter_name} to indicate where the parameter's value should be inserted",
				displayOptions: {
					show: {
						sendInPath: [true],
					},
				},
			},
			{
				displayName: 'Send in Query',
				name: 'sendInQuery',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: 'Whether the llm should provide query parameters',
			},
			{
				...parametersCollection,
				displayName: 'Query Parameters',
				name: 'queryParameters',
				displayOptions: {
					show: {
						sendInQuery: [true],
					},
				},
			},
			{
				displayName: 'Send in Body',
				name: 'sendInBody',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: 'Whether the llm should provide body parameters',
			},
			{
				...parametersCollection,
				displayName: 'Body Parameters',
				name: 'bodyParameters',
				displayOptions: {
					show: {
						sendInBody: [true],
					},
				},
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		// const node = this.getNode();
		// const workflowMode = this.getMode();

		const name = this.getNodeParameter('name', itemIndex) as string;
		const toolDescription = this.getNodeParameter('toolDescription', itemIndex) as string;
		const method = this.getNodeParameter('method', itemIndex) as IHttpRequestMethods;
		const baseUrl = this.getNodeParameter('url', itemIndex) as string;

		const sendInPath = this.getNodeParameter('sendInPath', itemIndex) as boolean;
		const sendInQuery = this.getNodeParameter('sendInQuery', itemIndex) as boolean;
		const sendInBody = this.getNodeParameter('sendInBody', itemIndex) as boolean;

		let pathParameters: ToolParameter[] = [];
		let path = '';
		let queryParameters: ToolParameter[] = [];
		let bodyParameters: ToolParameter[] = [];

		if (sendInPath) {
			pathParameters = this.getNodeParameter('pathParameters.values', itemIndex) as ToolParameter[];
			path = this.getNodeParameter('path', itemIndex) as string;
		}

		if (sendInQuery) {
			queryParameters = this.getNodeParameter(
				'queryParameters.values',
				itemIndex,
			) as ToolParameter[];
		}

		if (sendInBody) {
			bodyParameters = this.getNodeParameter('bodyParameters.values', itemIndex) as ToolParameter[];
		}

		const description = prepareToolDescription(
			toolDescription,
			pathParameters,
			queryParameters,
			bodyParameters,
		);

		return {
			response: new DynamicTool({
				name,
				description,

				func: async (query: string): Promise<string> => {
					const { index } = this.addInputData(NodeConnectionType.AiTool, [[{ json: { query } }]]);

					let response: string = '';
					let executionError: Error | undefined = undefined;
					try {
						let parameters: IDataObject = {};
						try {
							parameters = jsonParse<IDataObject>(query);
						} catch (error) {}

						const httpRequestOptions: IHttpRequestOptions = {
							method,
							url: baseUrl,
						};

						if (sendInPath) {
							for (const parameter of pathParameters) {
								const parameterName = parameter.name;
								const parameterValue = encodeURIComponent(parameters[parameterName] as string);
								path = path.replace(`{${parameterName}}`, parameterValue);
							}

							if (path[0] !== '/') {
								path = '/' + path;
							}

							httpRequestOptions.url += path;
						}

						if (sendInQuery) {
							const qs: IDataObject = {};

							for (const parameter of queryParameters) {
								const parameterName = parameter.name;
								const parameterValue = parameters[parameterName];
								qs[parameterName] = parameterValue;
							}

							httpRequestOptions.qs = qs;
						}

						if (sendInBody) {
							const body: IDataObject = {};

							for (const parameter of bodyParameters) {
								const parameterName = parameter.name;
								const parameterValue = parameters[parameterName];
								body[parameterName] = parameterValue;
							}

							httpRequestOptions.body = body;
						}

						const responseData = await this.helpers.httpRequest(httpRequestOptions);

						if (responseData && typeof responseData === 'object') {
							response = JSON.stringify(responseData, null, 2);
						} else if (typeof response === 'number') {
							response = String(responseData);
						} else {
							response = responseData as string;
						}
					} catch (error) {
						executionError = error;
						response = `There was an error: "${error.message}"`;
					}

					if (typeof response !== 'string') {
						executionError = new NodeOperationError(this.getNode(), 'Wrong output type returned', {
							description: `The response property should be a string, but it is an ${typeof response}`,
						});
						response = `There was an error: "${executionError.message}"`;
					}

					if (executionError) {
						void this.addOutputData(
							NodeConnectionType.AiTool,
							index,
							executionError as ExecutionError,
						);
					} else {
						void this.addOutputData(NodeConnectionType.AiTool, index, [[{ json: { response } }]]);
					}
					return response;
				},
			}),
		};
	}
}
