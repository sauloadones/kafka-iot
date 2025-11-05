import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Silo } from './entities/silo.entity';
import { CreateSiloDto, UpdateSiloDto } from './dto/silo.dto';
import { Company } from 'src/domain/companies/entities/company.entity';

@Injectable()
export class SilosService {
  constructor(
    @InjectRepository(Silo)
    private readonly siloRepo: Repository<Silo>,
  ) {}

  async create(dto: CreateSiloDto): Promise<Silo> {
    const { companyId, ...siloData } = dto;

    const silo = this.siloRepo.create({
      ...siloData,
      company: { id: companyId },
    });
    return this.siloRepo.save(silo);
  }

  async findAll(): Promise<Silo[]> {
    return this.siloRepo.find({ relations: ['company'] });
  }

  async findTest(id: number) {
    const silo = await this.siloRepo.findOneBy({ id });
    return !!silo;
  }

  async findOne(id: number): Promise<Silo> {
    const silo = await this.siloRepo.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!silo) {
      throw new NotFoundException(`Silo #${id} not found`);
    }
    return silo;
  }

  async update(id: number, dto: UpdateSiloDto): Promise<Silo> {
    const { companyId, ...siloData } = dto;

    const silo = await this.siloRepo.preload({
      id: id,
      ...siloData,
    });

    if (!silo) {
      throw new NotFoundException(`Silo #${id} not found`);
    }

    if (companyId) {
      silo.company = { id: companyId } as Company;
    }

    return this.siloRepo.save(silo);
  }

  async remove(id: number): Promise<void> {
    const silo = await this.findOne(id);
    await this.siloRepo.remove(silo);
  }
}
