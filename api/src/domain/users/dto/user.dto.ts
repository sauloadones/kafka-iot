import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  IsDate,
  IsNumber,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Exclude, Expose, Type } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsEnum(['admin', 'user'])
  @IsOptional()
  role?: 'admin' | 'user';

  @IsBoolean()
  @IsOptional()
  mfa?: boolean;

  @IsString()
  @IsOptional()
  mfaSecret?: string;

  @IsDate()
  @IsOptional()
  mfaEnabledAt?: Date;

  @IsNumber()
  companyId: number;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class CompanySummaryDto {
  @Expose()
  id: number;

  @Expose()
  name: string;
}

@Exclude()
export class ReadUserDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  email: string;

  @Expose()
  role: 'admin' | 'user';

  @Expose()
  mfa: boolean;

  @Expose()
  mfaEnabledAt?: Date;

  @Expose()
  @Type(() => CompanySummaryDto)
  company: CompanySummaryDto;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
