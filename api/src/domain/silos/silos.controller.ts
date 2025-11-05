import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SilosService } from './silos.service';
import { CreateSiloDto, UpdateSiloDto, ReadSiloDto } from './dto/silo.dto';
import { plainToInstance } from 'class-transformer';
import { Public } from '../auth/decorators/decorator.jwt';

@Controller('silos')
export class SilosController {
  constructor(private readonly silosService: SilosService) {}

  @Post()
  async create(@Body() createSiloDto: CreateSiloDto): Promise<ReadSiloDto> {
    const silo = await this.silosService.create(createSiloDto);
    return plainToInstance(ReadSiloDto, silo, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  async findAll(): Promise<ReadSiloDto[]> {
    const silos = await this.silosService.findAll();
    return plainToInstance(ReadSiloDto, silos, {
      excludeExtraneousValues: true,
    });
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ReadSiloDto> {
    const silo = await this.silosService.findOne(+id);
    return plainToInstance(ReadSiloDto, silo, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateSiloDto: UpdateSiloDto,
  ): Promise<ReadSiloDto> {
    const silo = await this.silosService.update(+id, updateSiloDto);
    return plainToInstance(ReadSiloDto, silo, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.silosService.remove(+id);
  }

  @Public()
  @Get('/conf/:id')
  async findConf(@Param('id') id: string){
    const silo = await this.silosService.findTest(+id);
    return silo;
  }
}