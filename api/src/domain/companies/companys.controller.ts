import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CompanysService } from './companys.service';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  ReadCompanyDto,
} from './dto/company.dto';
import { plainToInstance } from 'class-transformer';
import { Public } from '../auth/decorators/decorator.jwt';

@Controller('companies')
export class CompanysController {
  constructor(private readonly companysService: CompanysService) {}

  @Public()
  @Post()
  async create(
    @Body() createCompanyDto: CreateCompanyDto,
  ): Promise<ReadCompanyDto> {
    const company = await this.companysService.create(createCompanyDto);
    return plainToInstance(ReadCompanyDto, company, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  async findAll(): Promise<ReadCompanyDto[]> {
    const companies = await this.companysService.findAll();
    return plainToInstance(ReadCompanyDto, companies, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ReadCompanyDto> {
    const company = await this.companysService.findOne(+id);
    return plainToInstance(ReadCompanyDto, company, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ): Promise<ReadCompanyDto> {
    const company = await this.companysService.update(+id, updateCompanyDto);
    return plainToInstance(ReadCompanyDto, company, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.companysService.remove(+id);
  }
}
