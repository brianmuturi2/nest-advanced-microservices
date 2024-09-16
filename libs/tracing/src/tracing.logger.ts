import { ConsoleLogger, Inject, Injectable, Scope } from "@nestjs/common";
import { INQUIRER } from "@nestjs/core";
import { CONTEXT, NatsContext, RequestContext } from "@nestjs/microservices";

@Injectable({scope: Scope.REQUEST})
export class TracingLogger extends ConsoleLogger {
    constructor(
        @Inject(CONTEXT) private readonly ctx: RequestContext<unknown, NatsContext>, // Rep execution context of the incoming request
        @Inject(INQUIRER) host: object, // Extract name of class using the logger
    ) {
        const clsName = host?.constructor?.name;
        super(clsName);
    }

    protected formatContext(context: string): string {
        // To add support for other message brokers, you can simply check the instance type of this.ctx
        // For example, if (this.ctx instanceof RmqContext) {...}
        const traceId = this.ctx.getContext().getHeaders().get('traceId');
        return super.formatContext(context) + `[traceId: ${traceId}]`;
    }
}