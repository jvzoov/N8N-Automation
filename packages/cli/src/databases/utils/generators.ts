import { customAlphabet } from 'nanoid';
import { ALPHABET } from 'n8n-workflow';
import type { InstanceType } from 'n8n-core';

const nanoid = customAlphabet(ALPHABET, 16);

export function generateNanoId() {
	return nanoid();
}

export function generateHostInstanceId(instanceType: InstanceType) {
	return `${instanceType}-${nanoid()}`;
}
