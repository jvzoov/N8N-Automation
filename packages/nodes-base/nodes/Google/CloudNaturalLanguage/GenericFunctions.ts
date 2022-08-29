import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, IHttpRequestMethods, IHttpRequestOptions, NodeApiError } from 'n8n-workflow';

export async function googleApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	let options: IHttpRequestOptions = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://language.googleapis.com${endpoint}`,
		json: true,
	};

	options = Object.assign({}, options, option);

	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(
			this,
			'googleCloudNaturalLanguageOAuth2Api',
			options,
		);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}
