import { Module } from '@nestjs/common';
import { DevicesModule } from './devices/devices.module';
import { DataProcessModule } from './data.process/data.process.module';
import { UsersModule } from './users/users.module';
import { CompanysModule } from './companies/companys.module';
import { SilosModule } from './silos/silos.module';
import { AlertsModule } from './alerts/alerts.module';
import { AuthModule } from './auth/auth.module';
import { NotificationsModule } from './notifications.gateway/notifications.module';

@Module({
  imports: [ DevicesModule, DataProcessModule, UsersModule, CompanysModule, SilosModule, AlertsModule, AuthModule, NotificationsModule],
})
export class DomainModule {}
