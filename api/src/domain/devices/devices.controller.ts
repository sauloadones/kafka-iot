import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Sse,
  MessageEvent,
  Patch,
  Delete,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, filter, map } from 'rxjs';
import { DevicesService } from './devices.service';
import {
  CreateDeviceDto,
  UpdateDeviceDto,
  ReadDeviceDto,
  DeviceCommandDto,
} from './dto/device.dto';
import { plainToInstance } from 'class-transformer';

@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // --- ENDPOINT SSE (TEMPO REAL) ---
  @Sse(':id/updates')
  sseDeviceUpdates(@Param('id') deviceId: string): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, 'device.update').pipe(
      filter((data: { channel: string; message: string }) => {
        return data.channel === `device-updates:${deviceId}`;
      }),
      map((data: { channel: string; message: string }): MessageEvent => {
        return { data: JSON.parse(data.message) };
      }),
    );
  }

  // --- ENDPOINT DE HISTÓRICO (REDIS) ---
  @Get(':id/history')
  getDeviceHistory(@Param('id') deviceId: string) {
    return this.devicesService.getDeviceHistory(deviceId); 
  }

  // --- ENDPOINTS DE COMANDO (MQTT) --
  @Post(':id/commands')
  sendCommand(
    @Param('id') deviceId: string,
    @Body() commandDto: DeviceCommandDto,
  ) {
    this.devicesService.sendCommand(deviceId, commandDto.command);
    return { message: 'Comando enviado.' };
  }

  // --- ENDPOINTS DE GERENCIAMENTO (POSTGRES) ---
  @Post()
  async create(
    @Body() createDeviceDto: CreateDeviceDto,
  ): Promise<ReadDeviceDto> {
    const device = await this.devicesService.create(createDeviceDto);
    return plainToInstance(ReadDeviceDto, device, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  async findAll(): Promise<ReadDeviceDto[]> {
    const devices = await this.devicesService.findAll();
    return plainToInstance(ReadDeviceDto, devices, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ReadDeviceDto> {
    const device = await this.devicesService.findOne(id);
    return plainToInstance(ReadDeviceDto, device, {
      excludeExtraneousValues: true,
    });
  }

  @Get('silo/:siloId/online')
  async findOnlineBySilo(@Param('siloId') siloId: number) {
    const devices = await this.devicesService.findOnlineBySilo(siloId);
    return {
      online_count: devices.length,
      devices: plainToInstance(ReadDeviceDto, devices, {
        excludeExtraneousValues: true,
      }),
    };
  }
}
