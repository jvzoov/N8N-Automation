import {
	ActiveExecutions,
	DatabaseType,
	Db,
	GenericHelpers,
	IExecutionFlattedDb,
	IExecutionsStopData,
	IWorkflowExecutionDataProcess,
	ResponseHelper,
	WorkflowCredentials,
	WorkflowRunner,
} from '.';

import {
	IRun,
	LoggerProxy as Logger,
	WorkflowOperationError,
} from 'n8n-workflow';

import {
	FindManyOptions,
	LessThanOrEqual,
	ObjectLiteral,
} from 'typeorm';

import { DateUtils } from 'typeorm/util/DateUtils';


export class WaitTrackerClass {
	activeExecutionsInstance: ActiveExecutions.ActiveExecutions;

	private waitingExecutions: {
		[key: string]: {
			executionId: string,
			timer: NodeJS.Timeout,
		};
	} = {};

	mainTimer: NodeJS.Timeout;


	constructor() {
		this.activeExecutionsInstance = ActiveExecutions.getInstance();

		// Poll every 60 seconds a list of upcoming executions
		this.mainTimer = setInterval(() => {
			this.getwaitingExecutions();
		}, 60000);

		this.getwaitingExecutions();
	}


	async getwaitingExecutions() {
		Logger.debug('Wait tracker querying database for waiting executions');
		// Find all the executions which should be triggered in the next 70 seconds
		const findQuery: FindManyOptions<IExecutionFlattedDb> = {
			select: ['id', 'waitTill'],
			where: {
				waitTill: LessThanOrEqual(new Date(Date.now() + 70000)),
			},
			order: {
				waitTill: 'ASC',
			},
		};
		const dbType = await GenericHelpers.getConfigValue('database.type') as DatabaseType;
		if (dbType === 'sqlite') {
			// This is needed because of issue in TypeORM <> SQLite:
			// https://github.com/typeorm/typeorm/issues/2286
			(findQuery.where! as ObjectLiteral).waitTill = LessThanOrEqual(DateUtils.mixedDateToUtcDatetimeString(new Date(Date.now() + 70000)));
		}

		const executions = await Db.collections.Execution!.find(findQuery);

		if (executions.length > 0) {
			const executionIds = executions.map(execution => execution.id.toString()).join(', ');
			Logger.debug(`Wait tracker found ${executions.length} executions. Setting timer for IDs: ${executionIds}`);
		}

		// Add timers for each waiting execution that they get started at the correct time
		for (const execution of executions) {
			const executionId = execution.id.toString();
			if (this.waitingExecutions[executionId] === undefined) {
				const triggerTime = execution.waitTill!.getTime() - new Date().getTime();
				this.waitingExecutions[executionId] = {
					executionId,
					timer: setTimeout(() => {
						this.startExecution(executionId);
					}, triggerTime),
				};
			}
		}
	}


	async stopExecution(executionId: string): Promise<IExecutionsStopData> {
		if (this.waitingExecutions[executionId] !== undefined) {
			// The waiting execution was already sheduled to execute.
			// So stop timer and remove.
			clearTimeout(this.waitingExecutions[executionId].timer);
			delete this.waitingExecutions[executionId];
		}

		// Also check in database
		const execution = await Db.collections.Execution!.findOne(executionId);

		if (execution === undefined || !execution.waitTill) {
			throw new Error(`The execution ID "${executionId}" could not be found.`);
		}

		const fullExecutionData = ResponseHelper.unflattenExecutionData(execution);

		// Set in execution in DB as failed and remove waitTill time
		const error = new WorkflowOperationError('Workflow-Execution has been canceled!');

		fullExecutionData.data.resultData.error = {
			...error,
			message: error.message,
			stack: error.stack,
		};

		fullExecutionData.stoppedAt = new Date();
		fullExecutionData.waitTill = undefined;

		await Db.collections.Execution!.update(executionId, ResponseHelper.flattenExecutionData(fullExecutionData));

		return {
			mode: fullExecutionData.mode,
			startedAt: new Date(fullExecutionData.startedAt),
			stoppedAt: fullExecutionData.stoppedAt ? new Date(fullExecutionData.stoppedAt) : undefined,
			finished: fullExecutionData.finished,
		};
	}


	startExecution(executionId: string) {
		Logger.debug(`Wait tracker resuming execution ${executionId}`, {executionId});
		delete this.waitingExecutions[executionId];

		(async () => {
			try {
				// Get the data to execute
				const fullExecutionDataFlatted = await Db.collections.Execution!.findOne(executionId);

				if (fullExecutionDataFlatted === undefined) {
					throw new Error(`The execution with the id "${executionId}" does not exist.`);
				}

				const fullExecutionData = ResponseHelper.unflattenExecutionData(fullExecutionDataFlatted);

				if (fullExecutionData.finished === true) {
					throw new Error('The execution did succeed and can so not be started again.');
				}

				const credentials = await WorkflowCredentials(fullExecutionData.workflowData.nodes);

				const data: IWorkflowExecutionDataProcess = {
					credentials,
					executionMode: fullExecutionData.mode,
					executionData: fullExecutionData.data,
					workflowData: fullExecutionData.workflowData,
				};

				// Start the execution again
				const workflowRunner = new WorkflowRunner();
				await workflowRunner.run(data, false, false, executionId);
			} catch (error) {
				Logger.error(`There was a problem starting the waiting execution with id "${executionId}": "${error.message}"`, { executionId });
			}

		})();

	}
}


let waitTrackerInstance: WaitTrackerClass | undefined;

export function WaitTracker(): WaitTrackerClass {
	if (waitTrackerInstance === undefined) {
		waitTrackerInstance = new WaitTrackerClass();
	}

	return waitTrackerInstance;
}
