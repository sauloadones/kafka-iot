import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './entities/alert.entity';
import { CreateAlertDto, UpdateAlertDto } from './dto/alert.dto';
import { Silo } from 'src/domain/silos/entities/silo.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    @InjectRepository(Silo)
    private readonly siloRepo: Repository<Silo>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateAlertDto): Promise<Alert> {
  const { siloId, ...alertData } = dto;
  const silo = await this.siloRepo.findOne({
    where: { id: siloId },
    relations: ['company'],
  });
  if (!silo) {
    throw new NotFoundException(`Silo #${siloId} not found`);
  }
  const companyId = silo.company.id;
  const alert = this.alertRepo.create({
    ...alertData,
    silo: { id: siloId },
  });
  const savedAlert = await this.alertRepo.save(alert);
  const alertForEvent = {
    ...savedAlert,
    silo: { id: silo.id, name: silo.name },
  };
  this.eventEmitter.emit('alert.created', {
    alert: alertForEvent,
    companyId: companyId,
  });
  savedAlert.silo = silo;
  return savedAlert;
}

  async findAll(): Promise<Alert[]> {
    return this.alertRepo.find({ relations: ['silo'] });
  }

  async findOne(id: number): Promise<Alert> {
    const alert = await this.alertRepo.findOne({
      where: { id },
      relations: ['silo'],
    });
    if (!alert) throw new NotFoundException(`Alert #${id} not found`);
    return alert;
  }

  async update(id: number, dto: UpdateAlertDto): Promise<Alert> {
    const { siloId, ...alertData } = dto;
    const alert = await this.alertRepo.preload({
      id: id,
      ...alertData,
    });

    if (!alert) {
      throw new NotFoundException(`Alert #${id} not found`);
    }

    if (siloId) {
      alert.silo = { id: siloId } as Silo;
    }

    return this.alertRepo.save(alert);
  }

  async remove(id: number): Promise<void> {
    const alert = await this.findOne(id);
    await this.alertRepo.remove(alert);
  }
}
