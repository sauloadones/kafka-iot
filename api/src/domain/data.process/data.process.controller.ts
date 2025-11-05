import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DataProcessService } from './data.process.service';
import { 
  CreateDataProcessDto, 
  UpdateDataProcessDto, 
  ReadDataProcessDto 
} from './dto/data.process.dto';
import { plainToInstance } from 'class-transformer';
import { Public } from '../auth/decorators/decorator.jwt';

@Controller('data-process')
export class DataProcessController {
  constructor(private readonly dataProcessService: DataProcessService) {}
  @Public()
  @Post()
  async create(
    @Body() createDataProcessDto: CreateDataProcessDto
  ): Promise<ReadDataProcessDto> {
    const data = await this.dataProcessService.create(createDataProcessDto);
    return plainToInstance(ReadDataProcessDto, data, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  async findAll(): Promise<ReadDataProcessDto[]> {
    const data = await this.dataProcessService.findAll();
    return plainToInstance(ReadDataProcessDto, data, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ReadDataProcessDto> {
    const data = await this.dataProcessService.findOne(+id);
    return plainToInstance(ReadDataProcessDto, data, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDataProcessDto: UpdateDataProcessDto,
  ): Promise<ReadDataProcessDto> {
    const data = await this.dataProcessService.update(+id, updateDataProcessDto);
    return plainToInstance(ReadDataProcessDto, data, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.dataProcessService.remove(+id);
  }
}