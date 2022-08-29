import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export async function netlifyApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		headers: {
			'Content-Type': 'application/json',
		},
		qs: query,
		body,
		uri: uri || `https://api.netlify.com/api/v1${endpoint}`,
		json: true,
	};

	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (Object.keys(option)) {
		Object.assign(options, option);
	}

	try {
		const credentials = await this.getCredentials('netlifyApi');

		options.headers!['Authorization'] = `Bearer ${credentials.accessToken}`;

		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function netlifyRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.page = 0;
	query.per_page = 100;

	do {
		responseData = await netlifyApiRequest.call(this, method, endpoint, body, query, undefined, {
			resolveWithFullResponse: true,
		});
		query.page++;
		returnData.push.apply(returnData, responseData.body);
	} while (responseData.headers.link.includes('next'));

	return returnData;
}
