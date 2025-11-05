import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { InfraModule } from './infra/infra.module';
import { DomainModule } from './domain/domain.module';
import { RedisModule } from './infra/database/redis/redis.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    EventEmitterModule.forRoot({
      global: true,
    }),
    InfraModule,
    DomainModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}