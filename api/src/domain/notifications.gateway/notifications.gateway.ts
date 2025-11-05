import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt'; // 1. Importar
import { UsersService } from 'src/domain/users/users.service'; // 2. Importar
import { plainToInstance } from 'class-transformer';
import { ReadAlertDto } from '../alerts/dto/alert.dto';
import { ReadDataProcessDto } from '../data.process/dto/data.process.dto';

@WebSocketGateway({ cors: true })
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        return client.disconnect(true);
      }
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub); //

      if (!user || !user.company) {
        return client.disconnect(true);
      }
      const roomName = `company-${user.company.id}`;
      client.join(roomName);
      console.log(`Cliente ${client.id} entrou na sala ${roomName}`);
    } catch (e) {
      return client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Cliente desconectado: ${client.id}`);
  }

  @OnEvent('alert.created')
  handleAlertCreatedEvent(payload: { alert: any; companyId: number }) {
    const roomName = `company-${payload.companyId}`;
    const alertDto = plainToInstance(ReadAlertDto, payload.alert, {
      excludeExtraneousValues: true,
    });
    this.server.to(roomName).emit('newAlert', alertDto);
  }

  @OnEvent('data.processed')
  handleDataProcessedEvent(payload: { data: any; companyId: number }) {
    const roomName = `company-${payload.companyId}`;
    const dataDto = plainToInstance(ReadDataProcessDto, payload.data, {
      excludeExtraneousValues: true,
    });
    this.server.to(roomName).emit('newDataProcess', dataDto);
  }
}
