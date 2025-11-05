import { IsNumber, IsOptional, IsString , } from 'class-validator';
import { Exclude, Expose, Transform,   } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreateDeviceDto {
  @IsString()
  id: string; 

  @IsString()
  name: string;

  @IsNumber()
  @IsOptional()
  siloId?: number;
}

export class UpdateDeviceDto extends PartialType(CreateDeviceDto) {}

export class DeviceCommandDto {
  @IsString()
  command: string;
}

@Exclude()
export class ReadDeviceDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  isOnline: boolean;

  @Expose()
  lastSeenAt?: Date;

  @Expose()
  @Transform(({ obj }) => obj.silo?.id)
  siloId?: number;

  @Expose()
  @Transform(({ obj }) => obj.silo?.name)
  siloName?: string;
  
  @Expose()
  createdAt: Date;
}