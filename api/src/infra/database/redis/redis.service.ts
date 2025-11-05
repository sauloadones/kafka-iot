import { Inject, Injectable, OnModuleInit, forwardRef } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.module';

@Injectable()
export class RedisSubscriberService implements OnModuleInit {
  private readonly subscriber: Redis;
  private subscribed = false;

  constructor(
    @Inject(forwardRef(() => REDIS_CLIENT)) private readonly redisClient: Redis,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.subscriber = this.redisClient.duplicate();
  }

  onModuleInit() {
    if (this.subscribed) {
      console.log(
        '[RedisSubscriberService] Assinatura já ativa, ignorando nova inicialização.',
      );
      return;
    }
    this.subscribed = true;

    console.log('[RedisSubscriberService] Inicializando assinatura Redis...');
    this.subscriber.psubscribe('device-updates:*');
    this.subscriber.on('pmessage', (pattern, channel, message) => {
      this.eventEmitter.emit('device.update', { channel, message });
    });
  }
}
