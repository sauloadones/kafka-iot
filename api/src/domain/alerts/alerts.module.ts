import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from './entities/alert.entity';
import { SilosModule } from '../silos/silos.module';

@Module({
  imports: [TypeOrmModule.forFeature([Alert]), SilosModule],
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}
