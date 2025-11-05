import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataProcess } from './entities/data.process.entity';
import {
  CreateDataProcessDto,
  UpdateDataProcessDto,
} from './dto/data.process.dto';
import { Silo } from 'src/domain/silos/entities/silo.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class DataProcessService {
  constructor(
    @InjectRepository(DataProcess)
    private readonly dataRepo: Repository<DataProcess>,
    @InjectRepository(Silo)
    private readonly siloRepo: Repository<Silo>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateDataProcessDto): Promise<DataProcess> {
    const { siloId, ...data } = dto;

    // 4. Buscar o Silo para achar a Company
    const silo = await this.siloRepo.findOne({
      where: { id: siloId },
      relations: ['company'],
    });
    if (!silo) {
      throw new NotFoundException(`Silo #${siloId} not found`);
    }
    const companyId = silo.company.id;
    const dataProcess = this.dataRepo.create({
      ...data,
      silo: { id: siloId },
    });
    const savedData = await this.dataRepo.save(dataProcess);

    const dataForEvent = {
      ...savedData,
      silo: { id: silo.id, name: silo.name },
    };

    this.eventEmitter.emit('data.processed', {
      data: dataForEvent,
      companyId: companyId,
    });
    savedData.silo = silo;
    return savedData;
  }

  async findAll(): Promise<DataProcess[]> {
    return this.dataRepo.find({ relations: ['silo'] });
  }

  async findOne(id: number): Promise<DataProcess> {
    const dataProcess = await this.dataRepo.findOne({
      where: { id },
      relations: ['silo'],
    });
    if (!dataProcess) {
      throw new NotFoundException(`DataProcess #${id} not found`);
    }
    return dataProcess;
  }
  
  async update(id: number, dto: UpdateDataProcessDto): Promise<DataProcess> {
    const { siloId, ...data } = dto;
    const dataProcess = await this.dataRepo.preload({
      id: id,
      ...data,
    });

    if (!dataProcess) {
      throw new NotFoundException(`DataProcess #${id} not found`);
    }

    if (siloId) {
      dataProcess.silo = { id: siloId } as Silo;
    }

    return this.dataRepo.save(dataProcess);
  }

  async remove(id: number): Promise<void> {
    const dataProcess = await this.findOne(id);
    await this.dataRepo.remove(dataProcess);
  }
}
