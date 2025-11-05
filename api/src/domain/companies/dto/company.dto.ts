import { IsString, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Exclude, Expose, Type } from 'class-transformer';

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsString()
  CNPJ: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  address?: string;
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}


export class UserSummaryDto {
  @Expose()
  id: number;

  @Expose()
  name: string;
}


export class SiloSummaryDto {
  @Expose()
  id: number;

  @Expose()
  name: string;
}

@Exclude()
export class ReadCompanyDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  @Expose()
  CNPJ: string;

  @Expose()
  description?: string;

  @Expose()
  address?: string;

  @Expose()
  @Type(() => UserSummaryDto)
  users: UserSummaryDto[];

  @Expose()
  @Type(() => SiloSummaryDto)
  silos: SiloSummaryDto[];

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}