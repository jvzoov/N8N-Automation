import { Service } from 'typedi';
import { pick } from 'lodash';
import type { Workflow } from 'n8n-workflow';
import { ApplicationError, ErrorReporterProxy } from 'n8n-workflow';
import type { PushPayload } from '@n8n/api-types';

import { Push } from '../push';
import type { WorkflowClosedMessage, WorkflowOpenedMessage } from './collaboration.message';
import { parseWorkflowMessage } from './collaboration.message';
import type { OnPushMessage } from '@/push/types';
import { UserRepository } from '@/databases/repositories/user.repository';
import type { User } from '@/databases/entities/user';
import { CollaborationState } from '@/collaboration/collaboration.state';
import { SharedWorkflowRepository } from '@/databases/repositories/shared-workflow.repository';

/**
 * Service for managing collaboration feature between users. E.g. keeping
 * track of active users for a workflow.
 */
@Service()
export class CollaborationService {
	constructor(
		private readonly push: Push,
		private readonly state: CollaborationState,
		private readonly userRepository: UserRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	init() {
		this.push.on('message', async (event: OnPushMessage) => {
			try {
				await this.handleUserMessage(event.userId, event.msg);
			} catch (error) {
				ErrorReporterProxy.error(
					new ApplicationError('Error handling CollaborationService push message', {
						extra: {
							msg: event.msg,
							userId: event.userId,
						},
						cause: error,
					}),
				);
			}
		});
	}

	async handleUserMessage(userId: User['id'], msg: unknown) {
		const workflowMessage = await parseWorkflowMessage(msg);

		if (workflowMessage.type === 'workflowOpened') {
			await this.handleWorkflowOpened(userId, workflowMessage);
		} else if (workflowMessage.type === 'workflowClosed') {
			await this.handleWorkflowClosed(userId, workflowMessage);
		}
	}

	private async handleWorkflowOpened(userId: User['id'], msg: WorkflowOpenedMessage) {
		const { workflowId } = msg;

		if (!(await this.hasUserAccessToWorkflow(userId, workflowId))) {
			return;
		}

		await this.state.addCollaborator(workflowId, userId);

		await this.sendWorkflowUsersChangedMessage(workflowId);
	}

	private async handleWorkflowClosed(userId: User['id'], msg: WorkflowClosedMessage) {
		const { workflowId } = msg;

		if (!(await this.hasUserAccessToWorkflow(userId, workflowId))) {
			return;
		}

		await this.state.removeCollaborator(workflowId, userId);

		await this.sendWorkflowUsersChangedMessage(workflowId);
	}

	private async sendWorkflowUsersChangedMessage(workflowId: Workflow['id']) {
		// We have already validated that all active workflow users
		// have proper access to the workflow, so we don't need to validate it again
		const collaborators = await this.state.getCollaborators(workflowId);
		const userIds = collaborators.map(({ userId }) => userId);
		if (userIds.length === 0) {
			return;
		}

		const users = await this.userRepository.getByIds(this.userRepository.manager, userIds);
		const activeCollaborators = users.map((user) => ({
			user: pick(user, ['id', 'email', 'firstName', 'lastName']),
			lastSeen: collaborators.find(({ userId }) => userId === user.id)!.lastSeen,
		}));

		const msgData: PushPayload<'collaboratorsChanged'> = {
			workflowId,
			collaborators: activeCollaborators,
		};

		this.push.sendToUsers('collaboratorsChanged', msgData, userIds);
	}

	private async hasUserAccessToWorkflow(userId: User['id'], workflowId: Workflow['id']) {
		const user = await this.userRepository.findOneBy({
			id: userId,
		});
		if (!user) {
			return false;
		}

		const workflow = await this.sharedWorkflowRepository.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);

		return !!workflow;
	}
}
