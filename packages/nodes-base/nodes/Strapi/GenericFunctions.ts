import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import { IDataObject, IHttpRequestMethods, IHttpRequestOptions, NodeApiError } from 'n8n-workflow';

export async function strapiApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = await this.getCredentials('strapiApi');

	try {
		const options: IHttpRequestOptions = {
			headers: {},
			method,
			body,
			qs,
			uri:
				uri || credentials.apiVersion === 'v4'
					? `${credentials.url}/api${resource}`
					: `${credentials.url}${resource}`,
			json: true,
			arrayFormat: 'indices',
		};
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		//@ts-ignore
		return await this.helpers?.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function getToken(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const credentials = await this.getCredentials('strapiApi');
	let options = {} as IHttpRequestOptions;
	options = {
		headers: {
			'content-type': 'application/json',
		},
		method: 'POST',
		body: {
			identifier: credentials.email,
			password: credentials.password,
		},
		uri:
			credentials.apiVersion === 'v4'
				? `${credentials.url}/api/auth/local`
				: `${credentials.url}/auth/local`,
		json: true,
	};
	return this.helpers.request!(options);
}

export async function strapiApiRequestAllItems(
	this: IHookFunctions | ILoadOptionsFunctions | IExecuteFunctions,
	method: IHttpRequestMethods,
	resource: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	headers: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const returnData: IDataObject[] = [];
	const { apiVersion } = await this.getCredentials('strapiApi');

	let responseData;
	if (apiVersion === 'v4') {
		query['pagination[pageSize]'] = 20;
		query['pagination[page]'] = 0;
		do {
			({ data: responseData } = await strapiApiRequest.call(
				this,
				method,
				resource,
				body,
				query,
				undefined,
				headers,
			));
			query['pagination[page]'] += query['pagination[pageSize]'];
			returnData.push.apply(returnData, responseData);
		} while (responseData.length !== 0);
	} else {
		query._limit = 20;
		query._start = 0;
		do {
			responseData = await strapiApiRequest.call(
				this,
				method,
				resource,
				body,
				query,
				undefined,
				headers,
			);
			query._start += query._limit;
			returnData.push.apply(returnData, responseData);
		} while (responseData.length !== 0);
	}
	return returnData;
}

// tslint:disable-next-line:no-any
export function validateJSON(json: string | undefined): any {
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}
