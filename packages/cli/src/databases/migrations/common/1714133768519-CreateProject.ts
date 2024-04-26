import type { MigrationContext, ReversibleMigration } from '@db/types';
import type { ProjectRole } from '@/databases/entities/ProjectRelation';
import type { User } from '@/databases/entities/User';
import { generateNanoId } from '@/databases/utils/generators';
import { ApplicationError } from 'n8n-workflow';

const projectAdminRole: ProjectRole = 'project:personalOwner';
const projectTable = 'project';
const userTable = 'user';
const projectRelationTable = 'project_relation';

const sharedCredentials = 'shared_credentials';
const sharedCredentialsTemp = 'shared_credentials_2';
const sharedWorkflow = 'shared_workflow';
const sharedWorkflowTemp = 'shared_workflow_2';

type Table = 'shared_workflow' | 'shared_credentials';

// const resourceIdColumns: Record<Table, string> = {
// 	shared_credentials: 'credentialsId',
// 	shared_workflow: 'workflowId',
// };

export class CreateProject1705928727784 implements ReversibleMigration {
	async setupTables({ schemaBuilder: { createTable, column } }: MigrationContext) {
		await createTable(projectTable).withColumns(
			column('id').varchar(36).primary.notNull,
			column('name').varchar(255).notNull,
			column('type').varchar(36),
		).withTimestamps;

		await createTable(projectRelationTable)
			.withColumns(
				column('projectId').varchar(36).primary.notNull,
				column('userId').uuid.primary.notNull,
				column('role').varchar().notNull,
			)
			.withIndexOn('projectId')
			.withIndexOn('userId')
			.withForeignKey('projectId', {
				tableName: projectTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: 'user',
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
	}

	async alterSharedTable(
		table: Table,
		{
			escape,
			isMysql,
			runQuery,
			schemaBuilder: { addForeignKey, addColumns, addNotNull, createIndex, column },
		}: MigrationContext,
	) {
		// Add projectId column, this is set to a blank string by default because it's a primary key
		const projectIdColumn = column('projectId').varchar(36).default('NULL');
		const projectIdColumnName = escape.columnName('projectId');
		const userIdColumnName = escape.columnName('userId');
		await addColumns(table, [projectIdColumn]);

		const tableName = escape.tableName(table);
		const projectName = escape.tableName(projectTable);
		const relationTableName = escape.tableName(projectRelationTable);
		// const resourceIdColumn = resourceIdColumns[table];

		// Populate projectId
		const subQuery = `
				SELECT P.id as ${projectIdColumnName}, T.${userIdColumnName}
				FROM ${relationTableName} T
				LEFT JOIN ${projectName} P
				ON T.${projectIdColumnName} = P.id AND P.type = 'personal'
				LEFT JOIN ${tableName} S
				ON T.${userIdColumnName} = S.${userIdColumnName}
				WHERE P.id IS NOT NULL
		`;
		const swQuery = isMysql
			? `UPDATE ${tableName}, (${subQuery}) as mapping
				    SET ${tableName}.${projectIdColumnName} = mapping.${projectIdColumnName}
				    WHERE ${tableName}.${userIdColumnName} = mapping.${userIdColumnName}`
			: `UPDATE ${tableName}
						SET ${projectIdColumnName} = mapping.${projectIdColumnName}
				    FROM (${subQuery}) as mapping
				    WHERE ${tableName}.${userIdColumnName} = mapping.${userIdColumnName}`;

		await runQuery(swQuery);

		await addForeignKey(table, 'projectId', ['project', 'id']);

		await addNotNull(table, 'projectId');

		// Index the new projectId column
		await createIndex(table, ['projectId']);
	}

	async alterSharedCredentials({
		escape,
		runQuery,
		schemaBuilder: { column, createTable, dropTable },
	}: MigrationContext) {
		await createTable(sharedCredentialsTemp)
			.withColumns(
				column('credentialsId').varchar(36).notNull.primary,
				column('projectId').varchar(36).notNull.primary,
				column('role').text.notNull,
			)
			.withForeignKey('credentialsId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: projectTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		const updatedAtColumnName = escape.columnName('updatedAt');
		const createdAtColumnName = escape.columnName('createdAt');
		const credentialsIdColumnName = escape.columnName('credentialsId');
		const projectIdColumnName = escape.columnName('projectId');
		const roleColumnName = escape.columnName('role');

		await runQuery(`
			INSERT INTO ${escape.tableName(
				sharedCredentialsTemp,
			)} (${createdAtColumnName}, ${updatedAtColumnName}, ${credentialsIdColumnName}, ${projectIdColumnName}, ${roleColumnName})
			SELECT ${createdAtColumnName}, ${updatedAtColumnName}, ${credentialsIdColumnName}, ${projectIdColumnName}, ${roleColumnName} FROM ${escape.tableName(
				sharedCredentials,
			)};
		`);

		await dropTable(sharedCredentials);
		await runQuery(
			`ALTER TABLE ${escape.tableName(sharedCredentialsTemp)} RENAME TO ${escape.tableName(
				sharedCredentials,
			)};`,
		);
	}

	async alterSharedWorkflow({
		escape,
		runQuery,
		schemaBuilder: { column, createTable, dropTable },
	}: MigrationContext) {
		await createTable(sharedWorkflowTemp)
			.withColumns(
				column('workflowId').varchar(36).notNull.primary,
				column('projectId').varchar(36).notNull.primary,
				column('role').text.notNull,
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('projectId', {
				tableName: projectTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		const updatedAtColumnName = escape.columnName('updatedAt');
		const createdAtColumnName = escape.columnName('createdAt');
		const workflowIdColumnName = escape.columnName('workflowId');
		const projectIdColumnName = escape.columnName('projectId');
		const roleColumnName = escape.columnName('role');

		const escapedSharedWorkflowTemp = escape.tableName(sharedWorkflowTemp);
		const escapedTableName = escape.tableName(sharedWorkflow);

		await runQuery(`
			INSERT INTO ${escapedSharedWorkflowTemp} (${createdAtColumnName}, ${updatedAtColumnName}, ${workflowIdColumnName}, ${projectIdColumnName}, ${roleColumnName})
			SELECT ${createdAtColumnName}, ${updatedAtColumnName}, ${workflowIdColumnName}, ${projectIdColumnName}, ${roleColumnName} FROM ${escapedTableName};
		`);

		await dropTable(sharedWorkflow);
		await runQuery(`ALTER TABLE ${escapedSharedWorkflowTemp} RENAME TO ${escapedTableName};`);
	}

	async createUserPersonalProjects({ runQuery, runInBatches, escape }: MigrationContext) {
		const userTable = escape.tableName('user');
		const projectName = escape.tableName(projectTable);
		const projectRelationName = escape.tableName('project_relation');
		const projectIdColumn = escape.columnName('projectId');
		const userIdColumn = escape.columnName('userId');
		const firstNameColumn = escape.columnName('firstName');
		const lastNameColumn = escape.columnName('lastName');
		const emailColumn = escape.columnName('email');
		const getUserQuery = `SELECT id, ${firstNameColumn}, ${lastNameColumn}, ${emailColumn} FROM ${userTable}`;
		await runInBatches<Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>>(
			getUserQuery,
			async (users) => {
				await Promise.all(
					users.map(async (user) => {
						const projectId = generateNanoId();
						const name = this.createPersonalProjectName(user.firstName, user.lastName, user.email);
						await runQuery(
							`INSERT INTO ${projectName} (id, type, name) VALUES (:projectId, 'personal', :name)`,
							{
								projectId,
								name,
							},
						);

						await runQuery(
							`INSERT INTO ${projectRelationName} (${projectIdColumn}, ${userIdColumn}, role) VALUES (:projectId, :userId, :projectRole)`,
							{
								projectId,
								userId: user.id,
								projectRole: projectAdminRole,
							},
						);
					}),
				);
			},
		);
	}

	// Duplicated from packages/cli/src/databases/entities/User.ts
	// Reason:
	// This migration should work the same even if we refactor the function in
	// `User.ts`.
	createPersonalProjectName(firstName?: string, lastName?: string, email?: string) {
		if (firstName && lastName && email) {
			return `${firstName} ${lastName} <${email}>`;
		} else if (email) {
			return `<${email}>`;
		} else {
			return 'Unnamed Project';
		}
	}

	async up(context: MigrationContext) {
		await this.setupTables(context);
		await this.createUserPersonalProjects(context);
		await this.alterSharedTable('shared_credentials', context);
		await this.alterSharedCredentials(context);
		await this.alterSharedTable('shared_workflow', context);
		await this.alterSharedWorkflow(context);
	}

	async down({ logger, escape, runQuery, schemaBuilder: sb }: MigrationContext) {
		const c = {
			createdAt: escape.columnName('createdAt'),
			updatedAt: escape.columnName('updatedAt'),
			workflowId: escape.columnName('workflowId'),
			credentialsId: escape.columnName('credentialsId'),
			role: escape.columnName('role'),
			userId: escape.columnName('userId'),
			projectId: escape.columnName('projectId'),
			type: escape.columnName('type'),
		};

		// 0. check if all projects are personal projects
		const [{ count: nonPersonalProjects }] = await runQuery<[{ count: number }]>(
			`SELECT COUNT(*) FROM ${projectTable} WHERE ${c.type} <> 'personal';`,
		);

		if (nonPersonalProjects > 0) {
			const message =
				'Down migration only possible if there are only personal projects. Please delete all team projects.';
			logger.error(message);
			throw new ApplicationError(message);
		}

		// 1. create temp table for shared workflows
		await sb
			.createTable(sharedWorkflowTemp)
			.withColumns(
				sb.column('workflowId').varchar(36).notNull.primary,
				// sb.column('userId').varchar().notNull.primary,
				// TODO: does this still work with sqlite?
				sb.column('userId').uuid.notNull.primary,
				sb.column('role').text.notNull,
			)
			.withForeignKey('workflowId', {
				tableName: 'workflow_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: userTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;

		// 2. migrate data into temp table
		await runQuery(`
			INSERT INTO ${sharedWorkflowTemp} (${c.createdAt}, ${c.updatedAt}, ${c.workflowId}, ${c.role}, ${c.userId})
			SELECT SW.${c.createdAt}, SW.${c.updatedAt}, SW.${c.workflowId}, SW.${c.role}, PR.${c.userId}
			FROM ${sharedWorkflow} SW
			LEFT JOIN project_relation PR on SW.${c.projectId} = PR.${c.projectId} AND PR.${c.role} = 'project:personalOwner'
		`);

		// 3. drop shared workflow table
		await sb.dropTable(sharedWorkflow);

		// 4. rename temp table
		await runQuery(`ALTER TABLE ${sharedWorkflowTemp} RENAME TO ${sharedWorkflow};`);

		// 5. same for shared creds
		await sb
			.createTable(sharedCredentialsTemp)
			.withColumns(
				sb.column('credentialsId').varchar(36).notNull.primary,
				// sb.column('userId').varchar().notNull.primary,
				// TODO: does this still work with sqlite?
				sb.column('userId').uuid.notNull.primary,
				sb.column('role').text.notNull,
			)
			.withForeignKey('credentialsId', {
				tableName: 'credentials_entity',
				columnName: 'id',
				onDelete: 'CASCADE',
			})
			.withForeignKey('userId', {
				tableName: userTable,
				columnName: 'id',
				onDelete: 'CASCADE',
			}).withTimestamps;
		await runQuery(`
			INSERT INTO ${sharedCredentialsTemp} (${c.createdAt}, ${c.updatedAt}, ${c.credentialsId}, ${c.role}, ${c.userId})
			SELECT SC.${c.createdAt}, SC.${c.updatedAt}, SC.${c.credentialsId}, SC.${c.role}, PR.${c.userId}
			FROM ${sharedCredentials} SC
			LEFT JOIN project_relation PR on SC.${c.projectId} = PR.${c.projectId} AND PR.${c.role} = 'project:personalOwner'
		`);
		await sb.dropTable(sharedCredentials);
		await runQuery(`ALTER TABLE ${sharedCredentialsTemp} RENAME TO ${sharedCredentials};`);

		// 6. drop project and project relation table
		await sb.dropTable(projectRelationTable);
		await sb.dropTable(projectTable);
	}
}
