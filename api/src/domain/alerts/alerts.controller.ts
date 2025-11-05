import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto, ReadAlertDto, UpdateAlertDto } from './dto/alert.dto';
import { plainToInstance } from 'class-transformer'; 

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  async create(@Body() createAlertDto: CreateAlertDto): Promise<ReadAlertDto> {
    const alert = await this.alertsService.create(createAlertDto);
    return plainToInstance(ReadAlertDto, alert, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  async findAll(): Promise<ReadAlertDto[]> {
    const alerts = await this.alertsService.findAll();
    return plainToInstance(ReadAlertDto, alerts, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ReadAlertDto> {
    const alert = await this.alertsService.findOne(+id);
    return plainToInstance(ReadAlertDto, alert, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAlertDto: UpdateAlertDto,
  ): Promise<ReadAlertDto> {
    const alert = await this.alertsService.update(+id, updateAlertDto);
    return plainToInstance(ReadAlertDto, alert, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.alertsService.remove(+id);
  }
}