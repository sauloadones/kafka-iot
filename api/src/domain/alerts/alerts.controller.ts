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
import { Public } from '../auth/decorators/decorator.jwt';

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

  @Public()
  @Get('silo/:siloId')
  async findBySilo(@Param('siloId') siloId: string) {
    const alerts = await this.alertsService.findBySilo(+siloId);
    return plainToInstance(ReadAlertDto, alerts, {
      excludeExtraneousValues: true,
    });
  }
  @Public()
  @Get('silo/:siloId/recent')
  async findRecent(@Param('siloId') siloId: string) {
    const alerts = await this.alertsService.findLastFive(+siloId);
    return plainToInstance(ReadAlertDto, alerts, {
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
