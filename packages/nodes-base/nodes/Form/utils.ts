import { jsonParse, type IDataObject, type IWebhookFunctions } from 'n8n-workflow';
import type { FormField, FormTriggerData, FormTriggerInput } from './interfaces';

export const prepareFormData = (
	formTitle: string,
	formDescription: string,
	formSubmittedText: string | undefined,
	formFields: FormField[],
	testRun: boolean,
	instanceId?: string,
) => {
	const validForm = formFields.length > 0;
	const utm_campaign = instanceId ? `&utm_campaign=${instanceId}` : '';
	const n8nWebsiteLink = `https://n8n.io/?utm_source=n8n-internal&utm_medium=form-trigger${utm_campaign}`;

	if (formSubmittedText === undefined) {
		formSubmittedText = 'Your response has been recorded';
	}

	const formData: FormTriggerData = {
		testRun,
		validForm,
		formTitle,
		formDescription,
		formSubmittedText,
		n8nWebsiteLink,
		formFields: [],
	};

	if (!validForm) {
		return formData;
	}

	for (const [index, field] of formFields.entries()) {
		const { fieldType, requiredField, multiselect } = field;

		const input: IDataObject = {
			id: `field-${index}`,
			errorId: `error-field-${index}`,
			label: field.fieldLabel,
			inputRequired: requiredField ? 'form-required' : '',
		};

		if (multiselect) {
			input.isMultiSelect = true;
			input.multiSelectOptions =
				field.fieldOptions?.values.map((e, i) => ({
					id: `option${i}`,
					label: e.option,
				})) ?? [];
		} else if (fieldType === 'dropdown') {
			input.isSelect = true;
			const fieldOptions = field.fieldOptions?.values ?? [];
			input.selectOptions = fieldOptions.map((e) => e.option);
		} else if (fieldType === 'textarea') {
			input.isTextarea = true;
		} else {
			input.isInput = true;
			input.type = fieldType as 'text' | 'number' | 'date';
		}

		formData.formFields.push(input as FormTriggerInput);
	}

	return formData;
};

export async function formWebhook(context: IWebhookFunctions) {
	const webhookName = context.getWebhookName();
	const mode = context.getMode() === 'manual' ? 'test' : 'production';
	const formFields = context.getNodeParameter('formFields.values', []) as FormField[];

	//Show the form on GET request
	if (webhookName === 'setup') {
		const formTitle = context.getNodeParameter('formTitle', '') as string;
		const formDescription = context.getNodeParameter('formDescription', '') as string;
		const instanceId = context.getInstanceId();
		const { formSubmittedText } = context.getNodeParameter('options', {}) as IDataObject;

		const data = prepareFormData(
			formTitle,
			formDescription,
			formSubmittedText as string,
			formFields,
			mode === 'test',
			instanceId,
		);

		const res = context.getResponseObject();
		res.render('form-trigger', data);
		return {
			noWebhookResponse: true,
		};
	}

	const bodyData = (context.getBodyData().data as IDataObject) ?? {};

	const returnData: IDataObject = {};
	for (const [index, field] of formFields.entries()) {
		const key = `field-${index}`;
		let value = bodyData[key] ?? null;

		if (value === null) returnData[field.fieldLabel] = null;

		if (field.fieldType === 'number') {
			value = Number(value);
		}
		if (field.fieldType === 'text') {
			value = String(value).trim();
		}
		if (field.multiselect && typeof value === 'string') {
			value = jsonParse(value);
		}

		returnData[field.fieldLabel] = value;
	}
	returnData.submittedAt = new Date().toISOString();
	returnData.formMode = mode;

	const webhookResponse: IDataObject = { status: 200 };

	return {
		webhookResponse,
		workflowData: [context.helpers.returnJsonArray(returnData)],
	};
}
