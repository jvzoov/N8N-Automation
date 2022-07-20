import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SecurityScorecardApi implements ICredentialType {
	name = 'securityScorecardApi';
	displayName = 'SecurityScorecard API';
	documentationUrl = 'securityScorecard';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			required: true,
		},
	];
}
