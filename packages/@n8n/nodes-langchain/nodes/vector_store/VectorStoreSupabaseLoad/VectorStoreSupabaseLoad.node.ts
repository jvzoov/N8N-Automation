import {
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
	NodeConnectionType,
} from 'n8n-workflow';
import type { Embeddings } from 'langchain/embeddings/base';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseLibArgs } from 'langchain/vectorstores/supabase';
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase';
import { logWrapper } from '../../../utils/logWrapper';
import { metadataFilterField } from '../shared/fields';
import { getMetadataFiltersValues } from '../shared/helpers';

export class VectorStoreSupabaseLoad implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Supabase: Load',
		name: 'vectorStoreSupabaseLoad',
		icon: 'file:supabase.svg',
		group: ['transform'],
		version: 1,
		description: 'Load data from Supabase Vector Store index',
		defaults: {
			name: 'Supabase: Load',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Vector Stores'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.vectorstoresupabaseload/',
					},
				],
			},
		},
		credentials: [
			{
				name: 'supabaseApi',
				required: true,
			},
		],
		inputs: [
			{
				displayName: 'Embedding',
				maxConnections: 1,
				type: NodeConnectionType.AiEmbedding,
				required: true,
			},
		],
		outputs: [NodeConnectionType.AiVectorStore],
		outputNames: ['Vector Store'],
		properties: [
			{
				displayName: 'Table Name',
				name: 'tableName',
				type: 'string',
				default: '',
				required: true,
				description: 'Name of the table to load from',
			},
			{
				displayName: 'Query Name',
				name: 'queryName',
				type: 'string',
				default: 'match_documents',
				required: true,
				description: 'Name of the query to use for matching documents',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [metadataFilterField],
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.verbose('Supply Supabase Load Vector Store');

		const tableName = this.getNodeParameter('tableName', itemIndex) as string;
		const queryName = this.getNodeParameter('queryName', itemIndex) as string;

		const credentials = await this.getCredentials('supabaseApi');
		const embeddings = (await this.getInputConnectionData(
			NodeConnectionType.AiEmbedding,
			0,
		)) as Embeddings;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const client = createClient(credentials.host as string, credentials.serviceRole as string);
		const config: SupabaseLibArgs = {
			client,
			tableName,
			queryName,
			filter: getMetadataFiltersValues(this, itemIndex),
		};

		const vectorStore = await SupabaseVectorStore.fromExistingIndex(embeddings, config);

		return {
			response: logWrapper(vectorStore, this),
		};
	}
}
