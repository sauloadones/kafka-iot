import { IsNumber, IsOptional, IsDate, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Exclude, Expose, Transform, Type } from 'class-transformer';


export class CreateDataProcessDto {
  @IsNumber()
  siloId: number; // referência ao silo

  @Type(() => Date)
  @IsDate()
  periodStart: Date;

  @Type(() => Date)
  @IsDate()
  periodEnd: Date;

  // Médias
  @IsNumber()
  @IsOptional()
  averageTemperature?: number;

  @IsNumber()
  @IsOptional()
  averageHumidity?: number;

  @IsNumber()
  @IsOptional()
  averageAirQuality?: number;

  // Extremos
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

  // Desvios padrão
  @IsNumber()
  @IsOptional()
  stdTemperature?: number;

  @IsNumber()
  @IsOptional()
  stdHumidity?: number;

  @IsNumber()
  @IsOptional()
  stdAirQuality?: number;

  // Alertas
  @IsNumber()
  @IsOptional()
  alertsCount?: number;

  @IsNumber()
  @IsOptional()
  criticalAlertsCount?: number;

  @IsNumber()
  @IsOptional()
  percentOverTempLimit?: number;

  @IsNumber()
  @IsOptional()
  percentOverHumLimit?: number;

  @IsNumber()
  @IsOptional()
  environmentScore?: number;

  // SPOILAGE RISK 
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  spoilageRiskProbability?: number; // 0.0 a 1.0 (0% a 100%)

  @IsString()
  @IsOptional()
  spoilageRiskCategory?: string; // "BAIXO", "MODERADO", "ALTO", "CRÍTICO"
  //
}

export class UpdateDataProcessDto extends PartialType(CreateDataProcessDto) {}

@Exclude()
export class ReadDataProcessDto {
  @Expose()
  id: number;

  @Expose()
  @Transform(({ obj }) => obj.silo?.name)
  siloName: string;

  @Expose()
  periodStart: Date;

  @Expose()
  periodEnd: Date;

  @Expose()
  averageTemperature?: number;

  @Expose()
  averageHumidity?: number;

  @Expose()
  averageAirQuality?: number;

  @Expose()
  maxTemperature?: number;

  @Expose()
  minTemperature?: number;

  @Expose()
  maxHumidity?: number;

  @Expose()
  minHumidity?: number;

  @Expose()
  stdTemperature?: number;

  @Expose()
  stdHumidity?: number;

  @Expose()
  stdAirQuality?: number;

  @Expose()
  alertsCount: number;

  @Expose()
  criticalAlertsCount: number;

  @Expose()
  percentOverTempLimit?: number;

  @Expose()
  percentOverHumLimit?: number;

  @Expose()
  environmentScore?: number;

  // ====== NOVOS CAMPOS: SPOILAGE RISK ======
  @Expose()
  spoilageRiskProbability?: number; // Probability 0.0-1.0

  @Expose()
  spoilageRiskCategory?: string; // Risk category name
  // =========================================

  @Expose()
  createdAt: Date;
}
