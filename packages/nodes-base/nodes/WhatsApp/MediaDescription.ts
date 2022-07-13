import { INodeProperties } from 'n8n-workflow';
import { setupUpload } from './MediaFunctions';

export const mediaFields: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		noDataExpression: true,
		type: 'options',
		placeholder: '',
		options: [
			{
				name: 'Upload',
				value: 'mediaUpload',
			},
			{
				name: 'Get',
				value: 'mediaUrlGet',
			},
			{
				name: 'Delete',
				value: 'mediaDelete',
			},
		],
		default: 'mediaUpload',
		displayOptions: {
			show: {
				resource: ['media'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-description-weak
		description: 'The operation to perform on the media',
	},
];

export const mediaTypeFields: INodeProperties[] = [
	// ----------------------------------
	//         operation: mediaUpload
	// ----------------------------------
	{
		displayName: 'Phone Number ID',
		name: 'phoneNumberId',
		type: 'string',
		default: '',
		placeholder: '',
		routing: {
			request: {
				method: 'POST',
				url: '={{$value}}/media',
			},
		},
		displayOptions: {
			show: {
				operation: ['mediaUpload'],
				resource: ['media'],
			},
		},
		required: true,
		description: "The ID of the business account's phone number to store the media",
	},
	{
		displayName: 'Property Name',
		name: 'mediaPropertyName',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				operation: ['mediaUpload'],
				resource: ['media'],
			},
		},
		required: true,
		description: 'Name of the binary property which contains the data for the file to be uploaded',
		routing: {
			send: {
				preSend: [setupUpload],
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'mediaFileName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['mediaUpload'],
				resource: ['media'],
			},
		},
		description: 'The name to use for the file',
	},

	// ----------------------------------
	//         type: mediaUrlGet
	// ----------------------------------
	{
		displayName: 'Media ID',
		name: 'mediaGetId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['mediaUrlGet'],
				resource: ['media'],
			},
		},
		routing: {
			request: {
				method: 'GET',
				url: '=/{{$value}}',
			},
		},
		required: true,
		description: 'The ID of the media',
	},
	// ----------------------------------
	//         type: mediaUrlGet
	// ----------------------------------
	{
		displayName: 'Media ID',
		name: 'mediaDeleteId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['mediaDelete'],
				resource: ['media'],
			},
		},
		routing: {
			request: {
				method: 'DELETE',
				url: '=/{{$value}}',
			},
		},
		required: true,
		description: 'The ID of the media',
	},
];
