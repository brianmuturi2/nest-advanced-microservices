import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { AlarmsServiceService } from './alarms-service.service';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { NATS_MESSAGE_BROKER, NOTIFICATIONS_SERVICE } from './constants';
import { lastValueFrom } from 'rxjs';
import { TracingLogger } from '@app/tracing/tracing.logger';
import { NatsClientProxy } from '@app/tracing/nats-client/nats-client.proxy';

@Controller()
export class AlarmsServiceController {
  // private readonly logger = new Logger(AlarmsServiceController.name);

  constructor(
    private readonly natsMessageBroker: NatsClientProxy,
    @Inject(NOTIFICATIONS_SERVICE)
    private readonly notificationsService: ClientProxy,
    private readonly logger: TracingLogger 
  ) {}

  @EventPattern('alarm.created')
  async create(@Payload() data: {name: string; buildingId: number}) {
    this.logger.debug(
      `Received new "alarm.created" event: ${JSON.stringify(data)}`,
    );

    // If we decided to use the choreography pattern instead, we would simply emit an event here and let other services handle the rest
    //
    // So for example:
    // 1. "Alarms service" would emit an event to the "Alarms classifier service" to classify the alarm.
    // 2. "Alarm classifier service" would classify the alarm and emit an event to the "Notifications service" to notify other services about the alarm
    // 3. "Notifications service" would subscribe to the "alarm.classified" event and notify other services about the alarm
    const alarmClassification = await lastValueFrom(
      this.natsMessageBroker.send('alarm.classify', data)
    );
    this.logger.debug(
      `Alarm "${data.name}" classified as ${alarmClassification.category}`
    );

    const notify$ = this.notificationsService.emit('notification.send', {
      alarm: data,
      category: alarmClassification.category,
    });
    await lastValueFrom(notify$);
    this.logger.debug(`Dispatched "notification.send" event`);
  }
}
