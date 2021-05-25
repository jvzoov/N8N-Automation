import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	awsApiRequestREST,
	awsApiRequestRESTAllItems,
} from './GenericFunctions';

export class AwsTranscribe implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Transcribe',
		name: 'AwsTranscribe',
		icon: 'file:transcribe.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to Amazon Transcribe',
		defaults: {
			name: 'AWS Transcribe',
			color: '#5aa08d',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Transcription Job',
						value: 'transcriptionJob',
					},
				],
				default: 'transcriptionJob',
				description: 'The resource to perform.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a transcription job',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a transcription job',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a transcription job',
					},
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get all transcription jobs',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Job Name',
				name: 'transcriptionJobName',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: [
							'transcriptionJob',
						],
						operation: [
							'create',
							'get',
							'delete',
						],
					},
				},
				description: 'The name of the job.',
			},
			{
				displayName: 'Media File URI',
				name: 'mediaFileUri',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: [
							'transcriptionJob',
						],
						operation: [
							'create',
						],
					},
				},
				description: 'The S3 object location of the input media file. ',
			},
			{
				displayName: 'Detect Language',
				name: 'detectLanguage',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'transcriptionJob',
						],
						operation: [
							'create',
						],
					},
				},
				default: false,
				description: 'When set to true a simplify version of the response will be used else the raw data.',
			},
			{
				displayName: 'Language Code',
				name: 'languageCode',
				type: 'options',
				options: [
					{
						name: 'American English',
						value: 'en-US',
					},
					{
						name: 'British English',
						value: 'en-GB',
					},
					{
						name: 'Irish English',
						value: 'en-IE',
					},
					{
						name: 'Indian English',
						value: 'en-IN',
					},
					{
						name: 'Spanish',
						value: 'es-ES',
					},
					{
						name: 'German',
						value: 'de-DE',
					},
					{
						name: 'Russian',
						value: 'ru-RU',
					},
				],
				displayOptions: {
					show: {
						resource: [
							'transcriptionJob',
						],
						operation: [
							'create',
						],
						detectLanguage: [
							false,
						],
					},
				},
				default: 'en-US',
				description: 'The language code for the language used in the input media file.',
			},
			// ----------------------------------
			//         Transcription Job Settigns
			// ----------------------------------
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Channel Identification',
						name: 'channelIdentification',
						type: 'boolean',
						default: false,
						description: 'Instructs Amazon Transcribe to process each audio channel separately.',
					},
					{
						displayName: 'Show Alternatives',
						name: 'showAlternatives',
						type: 'boolean',
						default: false,
						description: 'Instructs Amazon Transcribe to process each audio channel separately.',
					},
					{
						displayName: 'Max Alternatives',
						name: 'maxAlternatives',
						type: 'number',
						default: 2,
						description: 'The number of alternative transcriptions that the service should return[2-10].',
					},
					{
						displayName: 'Max Speaker Labels',
						name: 'maxSpeakerLabels',
						type: 'number',
						default: 2,
						description: 'The maximum number of speakers to identify in the input audio[2-10].',
					},
					{
						displayName: 'Vocabulary Name',
						name: 'vocabularyName',
						type: 'string',
						default: '',
						description: 'The name of a vocabulary to use when processing the transcription job.',
					},
					{
						displayName: 'Vocabulary Filter Name',
						name: 'vocabularyFilterName',
						type: 'string',
						default: '',
						description: 'The name of the vocabulary filter to use when transcribing the audio.',
					},
					{
						displayName: 'Vocabulary Filter Method',
						name: 'vocabularyFilterMethod',
						type: 'options',
						options: [
							{
								name: 'Remove',
								value: 'remove',
							},
							{
								name: 'Mask',
								value: 'mask',
							},
							{
								name: 'Tag',
								value: 'tag',
							},

						],
						default: '',
						description: 'Defines how to handle filtered text.',
					},
				],
			},
			{
				displayName: 'Resolve Data',
				name: 'resolveData',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						resource: [
							'transcriptionJob',
						],
						operation: [
							'get',
						],
					},
				},
				description: 'By default the response only contain the s3 bucket containing the transcript.<br/>If this option gets activated it will resolve the data automatically.',
			},
			{
				displayName: 'Simple',
				name: 'simple',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'transcriptionJob',
						],
						operation: [
							'get',
						],
						resolveData: [
							true,
						],
					},
				},
				default: true,
				description: 'When set to true a simplify version of the response will be used else the raw data.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'transcriptionJob',
						],
						operation: [
							'getAll',
						],
					},
				},
				default: false,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 20,
				displayOptions: {
					show: {
						resource: [
							'transcriptionJob',
						],
						operation: [
							'getAll',
						],
						returnAll: [
							false,
						],
					},
				},
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: [
							'transcriptionJob',
						],
						operation: [
							'getAll',
						],
					},
				},
				options: [
					{
						displayName: 'Job Name Contains',
						name: 'jobNameContains',
						type: 'string',
						description: 'When specified, the jobs returned in the list are limited to jobs whose name contains the specified string.',
						default: '',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'Completed',
								value: 'COMPLETED',
							},
							{
								name: 'Failed',
								value: 'FAILED',
							},
							{
								name: 'In Progress',
								value: 'IN_PROGRESS',
							},
							{
								name: 'Queued',
								value: 'QUEUED',
							},
						],
						description: 'When specified, returns only transcription jobs with the specified status.',
						default: '',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < items.length; i++) {
			if (resource === 'transcriptionJob') {
				//https://docs.aws.amazon.com/comprehend/latest/dg/API_DetectDominantLanguage.html
				if (operation === 'create') {
					const transcriptionJobName = this.getNodeParameter('transcriptionJobName', i) as string;
					const mediaFileUri = this.getNodeParameter('mediaFileUri', i) as string;
					const detectLang = this.getNodeParameter('detectLanguage', i) as boolean;

					const options = this.getNodeParameter('options', i, {}) as IDataObject;

					const body: IDataObject = {
						TranscriptionJobName: transcriptionJobName,
						Media: {
							MediaFileUri: mediaFileUri,
						},
					};

					if (detectLang) {
						body.IdentifyLanguage = detectLang;
					} else {
						body.LanguageCode = this.getNodeParameter('languageCode', i) as string;
					}

					if (options.channelIdentification) {
						Object.assign(body.Settings, { ChannelIdentification: options.channelIdentification });
					}

					if (options.showAlternatives) {
						Object.assign(body.Settings, {
							ShowAlternatives: options.maxAlternatives,
							MaxAlternatives: options.maxAlternatives,
						});
					}

					if (options.showSpeakerLabels) {
						Object.assign(body.Settings, {
							ShowSpeakerLabels: options.showSpeakerLabels,
							MaxSpeakerLabels: options.maxSpeakerLabels,
						});
					}

					if (options.vocabularyName) {
						Object.assign(body.Settings, {
							VocabularyName: options.vocabularyName,
						});
					}

					if (options.vocabularyFilterName) {
						Object.assign(body.Settings, {
							VocabularyFilterName: options.vocabularyFilterName,
						});
					}

					if (options.vocabularyFilterMethod) {
						Object.assign(body.Settings, {
							VocabularyFilterMethod: options.vocabularyFilterMethod,
						});
					}

					const action = 'Transcribe.createTranscriptionJob';
					responseData = await awsApiRequestREST.call(this, 'transcribe', 'POST', '', JSON.stringify(body), { 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' });
					responseData = responseData.TranscriptionJob;
				}
				//https://docs.aws.amazon.com/transcribe/latest/dg/API_DeleteTranscriptionJob.html
				if (operation === 'delete') {
					const transcriptionJobName = this.getNodeParameter('transcriptionJobName', i) as string;

					const body: IDataObject = {
						TranscriptionJobName: transcriptionJobName,
					};

					const action = 'Transcribe.DeleteTranscriptionJob';
					responseData = await awsApiRequestREST.call(this, 'transcribe', 'POST', '', JSON.stringify(body), { 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' });
					responseData = { success: true };
				}
				//https://docs.aws.amazon.com/transcribe/latest/dg/API_GetTranscriptionJob.html
				if (operation === 'get') {
					const transcriptionJobName = this.getNodeParameter('transcriptionJobName', i) as string;
					const resolve = this.getNodeParameter('resolveData', 0) as boolean;

					const body: IDataObject = {
						TranscriptionJobName: transcriptionJobName,
					};

					const action = 'Transcribe.GetTranscriptionJob';
					responseData = await awsApiRequestREST.call(this, 'transcribe', 'POST', '', JSON.stringify(body), { 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' });
					responseData = responseData.TranscriptionJob;

					if (resolve === true && responseData.TranscriptionJobStatus === 'COMPLETED') {
						responseData = await this.helpers.request({ method: 'GET', uri: responseData.Transcript.TranscriptFileUri, json: true });
						const simple = this.getNodeParameter('simple', 0) as boolean;
						if (simple === true) {
							responseData = { transcript: responseData.results.transcripts.map((data: IDataObject) => data.transcript).join(' ') };
						}
					}
				}
				//https://docs.aws.amazon.com/transcribe/latest/dg/API_ListTranscriptionJobs.html
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i) as IDataObject;
					const action = 'Transcribe.ListTranscriptionJobs';
					const body: IDataObject = {};

					if (filters.status) {
						body['Status'] = filters.status;
					}

					if (filters.jobNameContains) {
						body['JobNameContains'] = filters.jobNameContains;
					}

					if (returnAll === true) {
						responseData = await awsApiRequestRESTAllItems.call(this, 'TranscriptionJobSummaries', 'transcribe', 'POST', '', JSON.stringify(body), { 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' });

					} else {
						const limit = this.getNodeParameter('limit', i) as number;
						body['MaxResults'] = limit;
						responseData = await awsApiRequestREST.call(this, 'transcribe', 'POST', '', JSON.stringify(body), { 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' });
						responseData = responseData.TranscriptionJobSummaries;
					}
				}
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
