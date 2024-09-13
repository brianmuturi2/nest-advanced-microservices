import { InboxService } from "@app/inbox";
import { Inbox } from "@app/inbox/entities/inbox.entity";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EntityManager } from "typeorm";
import { Workflow } from "./entities/workflow.entity";

@Injectable()
export class WorkflowsInboxProcessor {
    private readonly logger = new Logger(WorkflowsInboxProcessor.name);

    constructor(private readonly inboxService: InboxService) {}

    /**
     * This method will be executed every 10 seconds
     * Production-ready applications should use a more reasonable interval
     * Also, in the real-world system, we would rather use "@nestjs/bull" instead of "@nestjs/schedule"
     * because it provides more sophisticated features (e.g locking, supports multiple nodes running in parallel e.t.c)
     * */ 
    @Cron(CronExpression.EVERY_10_SECONDS)
    async processInboxMessages() {
        this.logger.debug(`${WorkflowsInboxProcessor.name} Processing inbox messages`);

        await this.inboxService.processInboxMessages(
            async (messages, manager) => {
                return Promise.all(
                    messages.map((message) => {
                        if (message.pattern === 'workflows.create') {
                            return this.createWorkflow(message, manager)
                        }
                    })
                )
            },
            {
                take: 100
            }
        )
    }

    async createWorkflow(message: Inbox, manager: EntityManager) {
        const workflowRepository = manager.getRepository(Workflow);

        const workflow = workflowRepository.create({
            ...message.payload
        });
        const newWorkflowEntity = await workflowRepository.save(workflow);
        this.logger.debug(
            `Created workflow with id ${newWorkflowEntity.id} for building ${newWorkflowEntity.buildingId}`,
        );

        // Update the message status to "processed"
        await manager.update(Inbox, message.id, {
            status: 'processed'
        })
    }
}