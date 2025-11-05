import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { Company } from '../companies/entities/company.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

 async create(dto: CreateUserDto): Promise<User> {
    const { companyId, ...userData } = dto;
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = this.userRepo.create({
      ...userData,
      password: hashedPassword,
      company: { id: companyId }, 
    });

    return this.userRepo.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepo.find({ relations: ['company'] });
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['company'] });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email }, relations: ['company'] });
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const { companyId, ...userData } = dto;
    const user = await this.findById(id); 

    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    Object.assign(user, userData);
    if (companyId) {
      user.company = { id: companyId } as Company; 
    }

    return this.userRepo.save(user);
  }
  async remove(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepo.remove(user);
  }

  async updateMfa(userId: number, data: Partial<User>): Promise<User> {
    const user = await this.findById(userId);
    Object.assign(user, data);
    return this.userRepo.save(user);
  }
}
