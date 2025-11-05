import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { AuthModule } from 'src/domain/auth/auth.module';
import { UsersModule } from 'src/domain/users/users.module';

@Module({
  imports: [AuthModule, UsersModule],
  providers: [NotificationsGateway],
})
export class NotificationsModule {}
