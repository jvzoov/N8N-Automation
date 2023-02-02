import { parse, stringify } from 'flatted';
import type { IRun, IRunExecutionData, ITaskData } from 'n8n-workflow';
import { NodeOperationError, WorkflowOperationError } from 'n8n-workflow';
import * as Db from '@/Db';
import type { EventMessageTypes, EventNamesTypes } from '../EventMessageClasses';
import type { DateTime } from 'luxon';
import { InternalHooksManager } from '../../InternalHooksManager';
import * as Push from '@/Push';
import type { IPushDataExecutionFinished } from '../../Interfaces';

export async function recoverExecutionDataFromEventLogMessages(
	executionId: string,
	messages: EventMessageTypes[],
	applyToDb = true,
): Promise<IRunExecutionData | undefined> {
	const executionEntry = await Db.collections.Execution.findOne({
		where: {
			id: executionId,
		},
	});

	if (executionEntry && messages) {
		let executionData: IRunExecutionData | undefined;
		let workflowError: WorkflowOperationError | undefined;
		try {
			executionData = parse(executionEntry.data) as IRunExecutionData;
		} catch {}
		if (!executionData) {
			executionData = { resultData: { runData: {} } };
		}
		let nodeNames: string[] = [];
		if (
			executionData?.resultData?.runData &&
			Object.keys(executionData.resultData.runData).length > 0
		) {
		} else {
			if (!executionData.resultData) {
				executionData.resultData = {
					runData: {},
				};
			} else {
				if (!executionData.resultData.runData) {
					executionData.resultData.runData = {};
				}
			}
		}
		nodeNames = executionEntry.workflowData.nodes.map((n) => n.name);

		let lastNodeRunTimestamp: DateTime | undefined = undefined;

		for (const nodeName of nodeNames) {
			const nodeByName = executionEntry?.workflowData.nodes.find((n) => n.name === nodeName);

			if (!nodeByName) continue;

			if (['n8n-nodes-base.start', 'n8n-nodes-base.manualTrigger'].includes(nodeByName.type))
				continue;

			const nodeStartedMessage = messages.find(
				(message) =>
					message.eventName === 'n8n.node.started' && message.payload.nodeName === nodeName,
			);
			const nodeFinishedMessage = messages.find(
				(message) =>
					message.eventName === 'n8n.node.finished' && message.payload.nodeName === nodeName,
			);

			const executionTime =
				nodeStartedMessage && nodeFinishedMessage
					? nodeFinishedMessage.ts.diff(nodeStartedMessage.ts).toMillis()
					: 0;

			let taskData: ITaskData;
			if (executionData.resultData.runData[nodeName]?.length > 0) {
				taskData = executionData.resultData.runData[nodeName][0];
			} else {
				taskData = {
					startTime: nodeStartedMessage ? nodeStartedMessage.ts.toUnixInteger() : 0,
					executionTime,
					source: [null],
					executionStatus: 'unknown',
				};
			}

			if (nodeStartedMessage && !nodeFinishedMessage) {
				const nodeError = new NodeOperationError(
					nodeByName,
					'Node crashed, possible out-of-memory issue',
					{
						message: 'Execution stopped at this node',
						description:
							"n8n may have run out of memory while executing it. More context and tips on how to avoid this <a href='https://docs.n8n.io/flow-logic/error-handling/memory-errors' target='_blank'>in the docs</a>",
					},
				);
				workflowError = new WorkflowOperationError(
					'Workflow did not finish, possible out-of-memory issue',
				);
				taskData.error = nodeError;
				taskData.executionStatus = 'crashed';
				executionData.resultData.lastNodeExecuted = nodeName;
				if (nodeStartedMessage) lastNodeRunTimestamp = nodeStartedMessage.ts;
			} else if (nodeStartedMessage && nodeFinishedMessage) {
				taskData.executionStatus = 'success';
				if (taskData.data === undefined) {
					taskData.data = {
						main: [
							[
								{
									json: {
										message:
											'The execution was interrupted, so the data was not saved. Try fixing the workflow and re-executing.',
									},
									pairedItem: undefined,
								},
							],
						],
					};
				}
			}

			if (!executionData.resultData.runData[nodeName]) {
				executionData.resultData.runData[nodeName] = [taskData];
			}
		}

		if (!executionData.resultData.error && workflowError) {
			executionData.resultData.error = workflowError;
		}
		if (!lastNodeRunTimestamp) {
			const workflowEndedMessage = messages.find((message) =>
				(
					[
						'n8n.workflow.success',
						'n8n.workflow.crashed',
						'n8n.workflow.failed',
					] as EventNamesTypes[]
				).includes(message.eventName),
			);
			if (workflowEndedMessage) {
				lastNodeRunTimestamp = workflowEndedMessage.ts;
			} else {
				const workflowStartedMessage = messages.find(
					(message) => message.eventName === 'n8n.workflow.started',
				);
				if (workflowStartedMessage) {
					lastNodeRunTimestamp = workflowStartedMessage.ts;
				}
			}
		}
		if (applyToDb) {
			await Db.collections.Execution.update(executionId, {
				data: stringify(executionData),
				status: 'crashed',
				stoppedAt: lastNodeRunTimestamp?.toJSDate(),
			});
			const internalHooks = InternalHooksManager.getInstance();
			await internalHooks.onWorkflowPostExecute(executionId, executionEntry.workflowData, {
				data: executionData,
				finished: false,
				mode: executionEntry.mode,
				waitTill: executionEntry.waitTill ?? undefined,
				startedAt: executionEntry.startedAt,
				stoppedAt: lastNodeRunTimestamp?.toJSDate(),
				status: 'crashed',
			});
			const sendData: IPushDataExecutionFinished = {
				executionId,
				data: {
					data: executionData,
					finished: false,
					mode: executionEntry.mode,
					waitTill: executionEntry.waitTill ?? undefined,
					startedAt: executionEntry.startedAt,
					stoppedAt: lastNodeRunTimestamp?.toJSDate(),
					status: 'crashed',
				} as unknown as IRun,
			};

			setTimeout(() => {
				const pushInstance = Push.getInstance();
				pushInstance.send('executionFinished', sendData);
			}, 10000);
		}
		return executionData;
	}
	return;
}
