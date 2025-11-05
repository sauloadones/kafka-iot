import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import type { AlertType, AlertLevel } from '../entities/alert.entity';
import { PartialType } from '@nestjs/mapped-types';
import { Exclude, Expose, Type } from 'class-transformer';

export class SiloSummaryDto {
  @Expose()
  id: number;

  @Expose()
  name: string;
}
export class CreateAlertDto {
  @IsEnum(['temperature', 'humidity', 'airQuality'])
  type: AlertType;

  @IsEnum(['info', 'warning', 'critical'])
  @IsOptional()
  level?: AlertLevel;

  @IsNumber()
  @IsOptional()
  currentValue?: number;

  @IsBoolean()
  @IsOptional()
  emailSent?: boolean;

  @IsString()
  @IsOptional()
  message?: string;

  @IsNumber()
  siloId: number;
}

export class UpdateAlertDto extends PartialType(CreateAlertDto) {}

@Exclude()
export class ReadAlertDto {
  @Expose()
  id: number;

  @Expose()
  type: AlertType;

  @Expose()
  level: AlertLevel;

  @Expose()
  currentValue?: number;

  @Expose()
  emailSent: boolean;

  @Expose()
  message?: string;

  @Expose()
  @Type(() => SiloSummaryDto)
  silo: SiloSummaryDto;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
