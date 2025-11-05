import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity'; 
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto'; 

@Injectable()
export class CompanysService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const company = this.companyRepo.create(createCompanyDto);
    return this.companyRepo.save(company);
  }

  async findAll(): Promise<Company[]> {
    return this.companyRepo.find({ relations: ['users', 'silos'] });
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id },
      relations: ['users', 'silos'],
    });

    if (!company) {
      throw new NotFoundException(`Company #${id} not found`);
    }
    return company;
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const company = await this.companyRepo.preload({
      id: id,
      ...updateCompanyDto,
    });

    if (!company) {
      throw new NotFoundException(`Company #${id} not found`);
    }
    return this.companyRepo.save(company);
  }

  async remove(id: number): Promise<void> {
    const company = await this.findOne(id);
    await this.companyRepo.remove(company);
  }
}