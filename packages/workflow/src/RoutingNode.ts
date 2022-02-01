/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable no-param-reassign */
/* eslint-disable no-continue */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import get from 'lodash.get';
import merge from 'lodash.merge';
import set from 'lodash.set';

import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INode,
	INodeExecuteFunctions,
	INodeExecutionData,
	INodeParameters,
	INodePropertyOptions,
	INodeType,
	IRequestOptionsFromParameters,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	NodeHelpers,
	NodeParameterValue,
	Workflow,
	WorkflowExecuteMode,
} from '.';

import {
	IDataObject,
	IExecuteSingleFunctions,
	IN8nRequestOperations,
	INodeProperties,
	INodePropertyCollection,
} from './Interfaces';

export class RoutingNode {
	additionalData: IWorkflowExecuteAdditionalData;

	connectionInputData: INodeExecutionData[];

	node: INode;

	mode: WorkflowExecuteMode;

	runExecutionData: IRunExecutionData;

	workflow: Workflow;

	constructor(
		workflow: Workflow,
		node: INode,
		connectionInputData: INodeExecutionData[],
		runExecutionData: IRunExecutionData,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
	) {
		this.additionalData = additionalData;
		this.connectionInputData = connectionInputData;
		this.runExecutionData = runExecutionData;
		this.mode = mode;
		this.node = node;
		this.workflow = workflow;
	}

	async runNode(
		inputData: ITaskDataConnections,
		runIndex: number,
		nodeType: INodeType,
		nodeExecuteFunctions: INodeExecuteFunctions,
	): Promise<INodeExecutionData[][] | null | undefined> {
		const items = inputData.main[0] as INodeExecutionData[];
		const returnData: INodeExecutionData[] = [];
		let responseData;

		let credentialType: string | undefined;

		if (nodeType.description.credentials?.length) {
			credentialType = nodeType.description.credentials[0].name;
		}
		const executeFunctions = nodeExecuteFunctions.getExecuteFunctions(
			this.workflow,
			this.runExecutionData,
			runIndex,
			this.connectionInputData,
			inputData,
			this.node,
			this.additionalData,
			this.mode,
		);

		let credentials: ICredentialDataDecryptedObject | undefined;
		if (credentialType) {
			credentials = (await executeFunctions.getCredentials(credentialType)) || {};
		}

		// TODO: Think about how batching could be handled for REST APIs which support it
		for (let i = 0; i < items.length; i++) {
			try {
				const thisArgs = nodeExecuteFunctions.getExecuteSingleFunctions(
					this.workflow,
					this.runExecutionData,
					runIndex,
					this.connectionInputData,
					inputData,
					this.node,
					i,
					this.additionalData,
					this.mode,
				);

				const requestData: IRequestOptionsFromParameters = {
					options: {
						url: '', // TODO: Replace with own type where url is not required
						qs: {},
						body: {},
					},
					preSend: [],
					postReceive: [],
					requestOperations: {},
				};

				if (nodeType.description.requestOperations) {
					requestData.requestOperations = { ...nodeType.description.requestOperations };
				}

				if (nodeType.description.requestDefaults) {
					Object.assign(requestData.options, nodeType.description.requestDefaults);

					for (const key of Object.keys(nodeType.description.requestDefaults)) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						let value = (nodeType.description.requestDefaults as Record<string, any>)[key];
						// If the value is an expression resolve it
						value = this.getParameterValue(
							value,
							i,
							runIndex,
							{ $credentials: credentials },
							true,
						) as string;
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						(requestData.options as Record<string, any>)[key] = value;
					}
				}

				for (const property of nodeType.description.properties) {
					let value = get(this.node.parameters, property.name, []) as string | NodeParameterValue;
					// If the value is an expression resolve it
					value = this.getParameterValue(
						value,
						i,
						runIndex,
						{ $credentials: credentials },
						true,
					) as string | NodeParameterValue;

					const tempOptions = this.getRequestOptionsFromParameters(
						thisArgs,
						property,
						i,
						runIndex,
						'',
						{ $credentials: credentials, $value: value },
					);

					this.mergeOptions(requestData, tempOptions);
				}

				// TODO: Change to handle some requests in parallel (should be configurable)
				responseData = await this.makeRoutingRequest(
					requestData,
					thisArgs,
					i,
					runIndex,
					credentialType,
					requestData.requestOperations,
				);

				if (requestData.maxResults) {
					// Remove not needed items in case APIs return to many
					responseData.splice(requestData.maxResults as number);
				}

				returnData.push(...responseData);
			} catch (error) {
				if (get(this.node, 'continueOnFail', false)) {
					returnData.push({ json: {}, error: error.message });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}

	mergeOptions(
		destinationOptions: IRequestOptionsFromParameters,
		sourceOptions?: IRequestOptionsFromParameters,
	): void {
		if (sourceOptions) {
			destinationOptions.paginate = destinationOptions.paginate ?? sourceOptions.paginate;
			destinationOptions.maxResults = sourceOptions.maxResults
				? sourceOptions.maxResults
				: destinationOptions.maxResults;
			merge(destinationOptions.options, sourceOptions.options);
			destinationOptions.preSend.push(...sourceOptions.preSend);
			destinationOptions.postReceive.push(...sourceOptions.postReceive);
			if (sourceOptions.requestOperations) {
				destinationOptions.requestOperations = Object.assign(
					destinationOptions.requestOperations,
					sourceOptions.requestOperations,
				);
			}
		}
	}

	async rawRoutingRequest(
		executeSingleFunctions: IExecuteSingleFunctions,
		requestData: IRequestOptionsFromParameters,
		itemIndex: number,
		runIndex: number,
		credentialType?: string,
		credentialsDecrypted?: ICredentialsDecrypted,
	): Promise<INodeExecutionData[]> {
		let responseData: IN8nHttpFullResponse;
		let returnData: INodeExecutionData[] = [
			{
				json: {},
			},
		];

		requestData.options.returnFullResponse = true;

		if (credentialType) {
			responseData = (await executeSingleFunctions.helpers.httpRequestWithAuthentication.call(
				executeSingleFunctions,
				credentialType,
				requestData.options as IHttpRequestOptions,
				{ credentialsDecrypted },
			)) as IN8nHttpFullResponse;
		} else {
			responseData = (await executeSingleFunctions.helpers.httpRequest(
				requestData.options as IHttpRequestOptions,
			)) as IN8nHttpFullResponse;
		}

		if (requestData.postReceive.length) {
			// If postReceive functionality got defined execute all of them
			for (const postReceiveMethod of requestData.postReceive) {
				if (typeof postReceiveMethod === 'function') {
					returnData = await postReceiveMethod.call(
						executeSingleFunctions,
						returnData,
						responseData,
					);
				} else if (postReceiveMethod.type === 'rootProperty') {
					if (responseData.body) {
						let responseBody: IDataObject[];
						if (!Array.isArray(responseData.body)) {
							responseBody = [responseData.body as IDataObject];
						} else {
							responseBody = responseData.body as IDataObject[];
						}

						try {
							returnData = responseBody.flatMap((item) => {
								return (item[postReceiveMethod.properties.property] as IDataObject[]).map(
									(json) => {
										return {
											json,
										};
									},
								);
							});
						} catch (e) {
							throw new Error(
								`The rootProperty "${postReceiveMethod.properties.property}" could not be found on item or is not an Array.`,
							);
						}
					}
				} else if (postReceiveMethod.type === 'set') {
					const { value } = postReceiveMethod.properties;
					// If the value is an expression resolve it
					returnData[0].json = this.getParameterValue(
						value,
						itemIndex,
						runIndex,
						{ $response: responseData },
						false,
					) as INodeParameters;
				} else if (postReceiveMethod.type === 'binaryData') {
					responseData.body = Buffer.from(responseData.body as string);
					let { destinationProperty } = postReceiveMethod.properties;

					// TODO: Have to make $value accessible, but at that level it does not have that reference anymore
					destinationProperty = this.getParameterValue(
						destinationProperty,
						itemIndex,
						runIndex,
						{ $response: responseData },
						false,
					) as string;

					returnData[0].binary = {
						[destinationProperty]: await executeSingleFunctions.helpers.prepareBinaryData(
							responseData.body,
						),
					};
				}
			}
		} else {
			// No postReceive functionality got defined so simply add data as it is
			// eslint-disable-next-line no-lonely-if
			if (Array.isArray(responseData.body)) {
				returnData = responseData.body.map((json) => {
					return {
						json,
					} as INodeExecutionData;
				});
			} else {
				returnData[0].json = responseData.body as IDataObject;
			}
		}

		return returnData;
	}

	async makeRoutingRequest(
		requestData: IRequestOptionsFromParameters,
		executeSingleFunctions: IExecuteSingleFunctions,
		itemIndex: number,
		runIndex: number,
		credentialType?: string,
		requestOperations?: IN8nRequestOperations,
		credentialsDecrypted?: ICredentialsDecrypted,
	): Promise<INodeExecutionData[]> {
		let responseData: INodeExecutionData[];
		for (const preSendMethod of requestData.preSend) {
			requestData.options = await preSendMethod.call(
				executeSingleFunctions,
				requestData.options as IHttpRequestOptions,
			);
		}

		const executePaginationFunctions = {
			...executeSingleFunctions,
			makeRoutingRequest: async (requestOptions: IRequestOptionsFromParameters) => {
				return this.rawRoutingRequest(
					executeSingleFunctions,
					requestOptions,
					itemIndex,
					runIndex,
					credentialType,
					credentialsDecrypted,
				);
			},
		};

		if (requestData.paginate && requestOperations?.pagination) {
			// Has pagination

			if (typeof requestOperations.pagination === 'function') {
				// Pagination via function
				responseData = await requestOperations.pagination.call(
					executePaginationFunctions,
					requestData,
				);
			} else {
				// Pagination via JSON properties
				const { properties } = requestOperations.pagination;
				responseData = [];
				if (!requestData.options.qs) {
					requestData.options.qs = {};
				}

				// Different predefined pagination types
				if (requestOperations.pagination.type === 'offset') {
					const optionsType = properties.type === 'body' ? 'body' : 'qs';
					if (properties.type === 'body' && !requestData.options.body) {
						requestData.options.body = {};
					}

					(requestData.options[optionsType] as IDataObject)[properties.limitParameter] =
						properties.pageSize;
					(requestData.options[optionsType] as IDataObject)[properties.offsetParameter] = 0;
					let tempResponseData: INodeExecutionData[];
					do {
						if (requestData?.maxResults) {
							// Only request as many results as needed
							const resultsMissing = (requestData?.maxResults as number) - responseData.length;
							if (resultsMissing < 1) {
								break;
							}
							(requestData.options[optionsType] as IDataObject)[properties.limitParameter] =
								Math.min(properties.pageSize, resultsMissing);
						}

						tempResponseData = await this.rawRoutingRequest(
							executeSingleFunctions,
							requestData,
							itemIndex,
							runIndex,
							credentialType,
							credentialsDecrypted,
						);

						(requestData.options[optionsType] as IDataObject)[properties.offsetParameter] =
							((requestData.options[optionsType] as IDataObject)[
								properties.offsetParameter
							] as number) + properties.pageSize;

						if (properties.rootProperty) {
							tempResponseData = (
								get(tempResponseData[0].json, properties.rootProperty, []) as IDataObject[]
							).map((item) => {
								return {
									json: item,
								};
							});
						}

						responseData.push(...tempResponseData);
					} while (tempResponseData.length && tempResponseData.length === properties.pageSize);
				}
			}
		} else {
			// No pagination
			responseData = await this.rawRoutingRequest(
				executeSingleFunctions,
				requestData,
				itemIndex,
				runIndex,
				credentialType,
				credentialsDecrypted,
			);
		}
		return responseData;
	}

	getParameterValue(
		parameterValue: NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[],
		itemIndex: number,
		runIndex: number,
		additionalKeys?: IWorkflowDataProxyAdditionalKeys,
		returnObjectAsString = false,
	): NodeParameterValue | INodeParameters | NodeParameterValue[] | INodeParameters[] | string {
		if (typeof parameterValue === 'string' && parameterValue.charAt(0) === '=') {
			return this.workflow.expression.getParameterValue(
				parameterValue,
				this.runExecutionData ?? null,
				runIndex,
				itemIndex,
				this.node.name,
				this.connectionInputData,
				this.mode,
				additionalKeys ?? {},
				returnObjectAsString,
			);
		}

		return parameterValue;
	}

	getRequestOptionsFromParameters(
		executeSingleFunctions: IExecuteSingleFunctions,
		nodeProperties: INodeProperties | INodePropertyOptions,
		itemIndex: number,
		runIndex: number,
		path: string,
		additionalKeys?: IWorkflowDataProxyAdditionalKeys,
	): IRequestOptionsFromParameters | undefined {
		const returnData: IRequestOptionsFromParameters = {
			options: {
				qs: {},
				body: {},
			},
			preSend: [],
			postReceive: [],
			requestOperations: {},
		};
		let basePath = path ? `${path}.` : '';

		if (!NodeHelpers.displayParameter(this.node.parameters, nodeProperties, this.node.parameters)) {
			return undefined;
		}
		if (nodeProperties.routing) {
			let parameterValue: string | undefined;
			if (basePath + nodeProperties.name) {
				parameterValue = executeSingleFunctions.getNodeParameter(
					basePath + nodeProperties.name,
				) as string;
			}

			if (nodeProperties.routing.operations) {
				returnData.requestOperations = { ...nodeProperties.routing.operations };
			}

			if (nodeProperties.routing.request) {
				for (const key of Object.keys(nodeProperties.routing.request)) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					let propertyValue = (nodeProperties.routing.request as Record<string, any>)[key];
					// If the value is an expression resolve it
					propertyValue = this.getParameterValue(
						propertyValue,
						itemIndex,
						runIndex,
						{ ...additionalKeys, $value: parameterValue },
						true,
					) as string;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(returnData.options as Record<string, any>)[key] = propertyValue;
				}
			}

			if (nodeProperties.routing.send) {
				let propertyName = nodeProperties.routing.send.property;
				if (propertyName !== undefined) {
					// If the propertyName is an expression resolve it
					propertyName = this.getParameterValue(
						propertyName,
						itemIndex,
						runIndex,
						additionalKeys,
						true,
					) as string;

					let value = parameterValue;

					if (nodeProperties.routing.send.value) {
						const valueString = nodeProperties.routing.send.value;
						// Special value got set
						// If the valueString is an expression resolve it
						value = this.getParameterValue(
							valueString,
							itemIndex,
							runIndex,
							{ ...additionalKeys, $value: value },
							true,
						) as string;
					}

					if (nodeProperties.routing.send.type === 'body') {
						// Send in "body"
						// eslint-disable-next-line no-lonely-if
						if (nodeProperties.routing.send.propertyInDotNotation === false) {
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							(returnData.options.body as Record<string, any>)![propertyName] = value;
						} else {
							set(returnData.options.body as object, propertyName, value);
						}
					} else {
						// Send in "query"
						// eslint-disable-next-line no-lonely-if
						if (nodeProperties.routing.send.propertyInDotNotation === false) {
							returnData.options.qs![propertyName] = value;
						} else {
							set(returnData.options.qs as object, propertyName, value);
						}
					}
				}

				if (nodeProperties.routing.send.paginate !== undefined) {
					let paginateValue = nodeProperties.routing.send.paginate;
					if (typeof paginateValue === 'string' && paginateValue.charAt(0) === '=') {
						// If the propertyName is an expression resolve it
						paginateValue = this.getParameterValue(
							paginateValue,
							itemIndex,
							runIndex,
							{ ...additionalKeys, $value: parameterValue },
							true,
						) as string;
					}

					// TODO: Should also be renamed
					returnData.paginate = !!paginateValue;
				}

				if (nodeProperties.routing.send.preSend) {
					returnData.preSend.push(nodeProperties.routing.send.preSend);
				}
			}
			if (nodeProperties.routing.output) {
				if (nodeProperties.routing.output.maxResults !== undefined) {
					let maxResultsValue = nodeProperties.routing.output.maxResults;
					if (typeof maxResultsValue === 'string' && maxResultsValue.charAt(0) === '=') {
						// If the propertyName is an expression resolve it
						maxResultsValue = this.getParameterValue(
							maxResultsValue,
							itemIndex,
							runIndex,
							{ ...additionalKeys, $value: parameterValue },
							true,
						) as string;
					}

					returnData.maxResults = maxResultsValue;
				}

				if (nodeProperties.routing.output.postReceive) {
					returnData.postReceive.push(nodeProperties.routing.output.postReceive);
				}
			}
		}

		// Check if there are any child properties
		if (!Object.prototype.hasOwnProperty.call(nodeProperties, 'options')) {
			// There are none so nothing else to check
			return returnData;
		}

		// Everything after this point can only be of type INodeProperties
		nodeProperties = nodeProperties as INodeProperties;

		// Check the child parameters
		let value;
		if (nodeProperties.type === 'options') {
			const optionValue = NodeHelpers.getParameterValueByPath(
				this.node.parameters,
				nodeProperties.name,
				basePath.slice(0, -1),
			);

			// Find the selected option
			const selectedOption = (nodeProperties.options as INodePropertyOptions[]).filter(
				(option) => option.value === optionValue,
			);

			if (selectedOption.length) {
				// Check only if option is set and if of type INodeProperties
				const tempOptions = this.getRequestOptionsFromParameters(
					executeSingleFunctions,
					selectedOption[0],
					itemIndex,
					runIndex,
					`${basePath}${nodeProperties.name}`,
					{ $value: optionValue },
				);

				this.mergeOptions(returnData, tempOptions);
			}
		} else if (nodeProperties.type === 'collection') {
			value = NodeHelpers.getParameterValueByPath(
				this.node.parameters,
				nodeProperties.name,
				basePath.slice(0, -1),
			);

			for (const propertyOption of nodeProperties.options as INodeProperties[]) {
				if (
					Object.keys(value as IDataObject).includes(propertyOption.name) &&
					propertyOption.type !== undefined
				) {
					// Check only if option is set and if of type INodeProperties
					const tempOptions = this.getRequestOptionsFromParameters(
						executeSingleFunctions,
						propertyOption,
						itemIndex,
						runIndex,
						`${basePath}${nodeProperties.name}`,
					);

					this.mergeOptions(returnData, tempOptions);
				}
			}
		} else if (nodeProperties.type === 'fixedCollection') {
			basePath = `${basePath}${nodeProperties.name}.`;
			for (const propertyOptions of nodeProperties.options as INodePropertyCollection[]) {
				// Check if the option got set and if not skip it
				value = NodeHelpers.getParameterValueByPath(
					this.node.parameters,
					propertyOptions.name,
					basePath.slice(0, -1),
				);

				if (value === undefined) {
					continue;
				}

				// Make sure that it is always an array to be able to use the same code for multi and single
				if (!Array.isArray(value)) {
					value = [value];
				}

				const loopBasePath = `${basePath}${propertyOptions.name}`;
				for (let i = 0; i < (value as INodeParameters[]).length; i++) {
					for (const option of propertyOptions.values) {
						const tempOptions = this.getRequestOptionsFromParameters(
							executeSingleFunctions,
							option,
							itemIndex,
							runIndex,
							nodeProperties.typeOptions?.multipleValues ? `${loopBasePath}[${i}]` : loopBasePath,
							{ ...(additionalKeys || {}), $index: i, $parent: value[i] },
						);

						this.mergeOptions(returnData, tempOptions);
					}
				}
			}
		}

		return returnData;
	}
}
