import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../infra/database/redis/redis.module'; //

@Injectable()
export class MqttService implements OnModuleInit {
  private readonly logger = new Logger(MqttService.name);
  private client: mqtt.MqttClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis, 
  ) {}

  onModuleInit() {
    const brokerUrl = this.configService.get<string>('MQTT_BROKER_URL', 'mqtt://broker.hivemq.com');
    
    this.client = mqtt.connect(brokerUrl);

    this.client.on('connect', () => {
      this.logger.log(`Conectado ao MQTT Broker em ${brokerUrl}`);
      this.client.subscribe('devices/+/data');
      this.client.subscribe('devices/+/hello');
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload.toString());
    });
  }

  private handleMessage(topic: string, payload: string) {
    const topicParts = topic.split('/');
    const deviceId = topicParts[1];
    const messageType = topicParts[2];
    
    if (messageType === 'hello') {
      this.eventEmitter.emit('device.hello', { deviceId });
    } 
    
  }

  sendCommand(deviceId: string, command: string) {
    const commandTopic = `devices/${deviceId}/commands`;
    this.client.publish(commandTopic, command, (err) => {
      if (err) this.logger.error(`Falha ao enviar comando para ${deviceId}`, err);
      else this.logger.log(`Comando '${command}' enviado para ${deviceId}`);
    });
  }
}