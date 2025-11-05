import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../infra/database/redis/redis.module';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { MqttService } from './mqtt.service';
import { CreateDeviceDto, UpdateDeviceDto } from './dto/device.dto';
import { Silo } from 'src/domain/silos/entities/silo.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan } from 'typeorm';
export interface ChartDataPoint {
  timestamp: number;
  value: any;
}
@Injectable()
export class DevicesService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis, //
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    private readonly mqttService: MqttService,
  ) {}

  // --- LÓGICA REDIS (SSE) - SEM MUDANÇAS ---
  async getDeviceHistory(deviceId: string): Promise<ChartDataPoint[]> {
    const historyKey = `device:history:${deviceId}`;
    const results = await this.redisClient.zrange(historyKey, 0, -1);
    if (!results || results.length === 0) return [];
    return results.map((jsonData) => {
      const data = JSON.parse(jsonData);
      return { timestamp: data.timestamp, value: data.payload };
    });
  }

  // --- LÓGICA MQTT (Comandos) ---
  sendCommand(deviceId: string, command: string) {
    this.mqttService.sendCommand(deviceId, command);
  }

  // --- LÓGICA MQTT (Status via Postgres) ---
  @OnEvent('device.hello')
  async handleDeviceHello({ deviceId }: { deviceId: string }) {
    const device = await this.deviceRepo.findOne({ where: { id: deviceId } });
    if (!device) {
      return;
    }

    device.isOnline = true;
    device.lastSeenAt = new Date();
    await this.deviceRepo.save(device);
  }

  // --- LÓGICA POSTGRES (CRUD) ---
  async create(dto: CreateDeviceDto): Promise<Device> {
    const { siloId, ...deviceData } = dto;

    const device = this.deviceRepo.create({
      ...deviceData,
      ...(siloId && { silo: { id: siloId } }),
    });

    return this.deviceRepo.save(device);
  }

  async findAll(): Promise<Device[]> {
    return this.deviceRepo.find({ relations: ['silo'] });
  }

  async findOne(id: string): Promise<Device> {
    const device = await this.deviceRepo.findOne({
      where: { id },
      relations: ['silo'],
    });
    if (!device) throw new NotFoundException(`Device #${id} not found`);
    return device;
  }

  async findOnlineBySilo(siloId: number): Promise<Device[]> {
    return this.deviceRepo.find({
      where: {
        isOnline: true,
        silo: { id: siloId },
      },
      relations: ['silo'],
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkOfflineDevices() {
    const fiveMinutesAgo = new Date(Date.now() - 1 * 60 * 1000);

    const offlineCandidates = await this.deviceRepo.find({
      where: {
        isOnline: true,
        lastSeenAt: LessThan(fiveMinutesAgo),
      },
    });

    if (offlineCandidates.length > 0) {
      for (const device of offlineCandidates) {
        device.isOnline = false;
        await this.deviceRepo.save(device);
        console.log(`[OfflineWatcher] ${device.id} marcado como OFFLINE`);
      }
    }
  }
}
