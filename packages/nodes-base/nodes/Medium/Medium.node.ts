import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodePropertyOptions,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	mediumApiRequest,
} from './GenericFunctions';

export class Medium implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Medium',
		name: 'medium',
		group: ['output'],
		icon: 'file:medium.png',
		version: 1,
		description: 'Consume Medium API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Medium',
			color: '#772244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mediumApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					// {
					// 	name: 'OAuth2',
					// 	value: 'oAuth2',
					// },

				],
				default: 'accessToken',
				description: 'The method of authentication.',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Post',
						value: 'post',
					},

				],
				default: 'post',
				description: 'Resource to consume.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'post',
						],
					},
				},
				options: [
					{
						name: 'Create a post',
						value: 'create',
						description: 'Create a post on the user authenticated profile',
					},

				],
				default: 'create',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         post:create
			// ----------------------------------
			{
				displayName: 'Publication',
				name: 'publication',
				type: 'boolean',
				default: false,
				description: 'Are you publishing under a publication?'
			},
			{
				displayName: 'Publication ID',
				name: 'publicationId',
				type: 'options',
				displayOptions: {
					show: {
						publication: [
							true,
						],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getPublications',
				},
				default: '',
				description: 'Publication ids',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				placeholder: 'My open source contribution',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'post',
						],
					},
				},
				description: 'Title of the post. It should be less than 100 characters',
			},
			{
				displayName: 'Content format',
				name: 'contentFormat',
				default: '',
				placeholder: 'My open source contribution',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'post',
						],
					},
				},
				type: 'options',
				options: [
					{
						name: 'HTML',
						value: 'html',
					},
					{
						name: 'Markdown',
						value: 'markdown',
					},

				],

				description: 'The format of the content to be posted.',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				placeholder: 'My open source contribution',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'post',
						],
					},
				},
				description: 'The body of the post, in a valid, semantic, HTML fragment, or Markdown.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Fields',
				displayOptions: {
					show: {
						operation: [
							'create',
						],
						resource: [
							'post',
						],
					},
				},
				default: {},
				options: [

					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						placeholder: 'open-source,mlh,fellowship',
						description: 'Tags separated by comma to classify the post. Only the first three will be used. Tags longer than 25 characters will be ignored.',
					},
					{
						displayName: 'Publish Status',
						name: 'publishStatus',
						default: 'public',
						type: 'options',
						options: [
							{
								name: 'Public',
								value: 'public',
							},
							{
								name: 'Draft',
								value: 'draft',
							},
							{
								name: 'Unlisted',
								value: 'unlisted',
							},

						],

						description: 'The status of the post.',
					},
					{
						displayName: 'Notify Followers',
						name: 'notifyFollowers',
						type: 'boolean',
						default: false,
						description: `Whether to notify followers that the user has published.`,
					},
					{
						displayName: 'License',
						name: 'license',
						type: 'string',
						default: 'all-rights-reserved',
						options: [
							{
								name: 'all-rights-reserved',
								value: 'all-rights-reserved',
							},
							{
								name: '“cc-40-by',
								value: '“cc-40-by',
							},
							{
								name: 'cc-40-by-sa',
								value: 'cc-40-by-sa',
							},
							{
								name: 'cc-40-by-nd',
								value: 'cc-40-by-nd',
							},
							{
								name: 'cc-40-by-nc',
								value: 'cc-40-by-nc',
							},
							{
								name: '“cc-40-by-nc-nd',
								value: '“cc-40-by-nc-nd',
							},
							{
								name: 'cc-40-by-nc-sa',
								value: 'cc-40-by-nc-sa',
							},
							{
								name: 'cc-40-zero',
								value: 'cc-40-zero',
							},
							{
								name: 'public-domain',
								value: 'public-domain',
							},


						],
						description: 'Tags separated by comma to classify the post. Only the first three will be used. Tags longer than 25 characters will be ignored.',
					},
				],
			},

		]

	};
	methods = {
		loadOptions: {
			// Get all the available publications to display them to user so that he can
			// select them easily
			async getPublications(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				//Get the User Id
				const user = await mediumApiRequest.call(
					this,
					'GET',
					`/me`,
					{},
					{}
				);
				const userId = user.data.id;
				//Get all publications of that user
				const publications = await mediumApiRequest.call(
					this,
					'GET',
					`/users/${userId}/publications`,
					{},
					{}
				);
				const publications_list = publications.data;
				for (const publication of publications_list) {
					const publicationName = publication.name;
					const publicationId = publication.id;
					returnData.push({
						name: publicationName,
						value: publicationId,
					});
				}
				return returnData;
			},

		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let operation: string;
		let resource: string;

		// For POST
		let bodyRequest: IDataObject;
		// For Query string
		let qs: IDataObject;
		let responseData;

		for (let i = 0; i < items.length; i++) {
			qs = {};

			resource = this.getNodeParameter('resource', i) as string;
			operation = this.getNodeParameter('operation', i) as string;

			if (resource === 'post') {
				//https://github.com/Medium/medium-api-docs
				if (operation === 'create') {
					// ----------------------------------
					//         post:create
					// ----------------------------------

					const title = this.getNodeParameter('title', i) as string;
					const contentFormat = this.getNodeParameter('contentFormat', i) as string;
					const content = this.getNodeParameter('content', i) as string;
					bodyRequest = {
						tags: [],
						title,
						contentFormat,
						content,

					};
					const additionalFields = this.getNodeParameter(
						'additionalFields',
						i
					) as IDataObject;
					if (additionalFields.tags) {
						const tags = additionalFields.tags as string;
						bodyRequest.tags = tags.split(',').map(item => {
							return parseInt(item, 10);
						});
					}


					if (additionalFields.publishStatus) {
						bodyRequest.publishStatus = additionalFields.publishStatus as string;
					}
					if (additionalFields.license) {
						bodyRequest.license = additionalFields.license as string;
					}
					if (additionalFields.notifyFollowers) {
						bodyRequest.notifyFollowers = additionalFields.notifyFollowers as string;
					}
					const underPublication = this.getNodeParameter('publication', i) as boolean;

					// if user wants to publish it under a specific publication
					if (underPublication == true) {
						const publicationId = this.getNodeParameter('publicationId', i) as number;

						responseData = await mediumApiRequest.call(
							this,
							'POST',
							`/publications/${publicationId}/posts`,
							bodyRequest,
							qs
						);
					}
					else {
						let responseAuthorId = await mediumApiRequest.call(
							this,
							'GET',
							'/me',
							{},
							qs
						);

						const authorId = responseAuthorId.data.id;
						responseData = await mediumApiRequest.call(
							this,
							'POST',
							`/users/${authorId}/posts`,
							bodyRequest,
							qs
						);
					}


				}


			}
			if (Array.isArray(responseData.data)) {
				returnData.push.apply(returnData, responseData.data as IDataObject[]);
			} else {
				returnData.push(responseData.data as IDataObject);
			}




		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
