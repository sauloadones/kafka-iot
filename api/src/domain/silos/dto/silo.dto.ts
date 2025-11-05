import { IsString, IsOptional, IsBoolean, IsNumber, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Exclude, Expose, Transform, Type } from 'class-transformer';

export class CreateSiloDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  grain: string;

  @IsBoolean()
  @IsOptional()
  inUse?: boolean;

  @IsNumber()
  @IsOptional()
  maxTemperature?: number;

  @IsNumber()
  @IsOptional()
  minTemperature?: number;

  @IsNumber()
  @IsOptional()
  maxHumidity?: number;

  @IsNumber()
  @IsOptional()
  minHumidity?: number;

  @IsNumber()
  @IsOptional()
  maxAirQuality?: number;

  @IsNumber()
  @IsOptional()
  minAirQuality?: number;

  @IsNumber()
  companyId: number; // referência à Company
}

export class UpdateSiloDto extends PartialType(CreateSiloDto) {}

@Exclude()
export class ReadSiloDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  description?: string;

  @Expose()
  grain: string;

  @Expose()
  inUse: boolean;

  @Expose()
  maxTemperature?: number;

  @Expose()
  minTemperature?: number;

  @Expose()
  maxHumidity?: number;

  @Expose()
  minHumidity?: number;

  @Expose()
  maxAirQuality?: number;

  @Expose()
  minAirQuality?: number;

  @Expose()
  @Transform(({ obj }) => obj.company?.name)
  companyName: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
