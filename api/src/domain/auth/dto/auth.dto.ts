import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @IsOptional()
  mfaCode?: string; // TOTP code se MFA estiver ativada
}

export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsEnum(['admin', 'user'])
  role: 'admin' | 'user';

  @IsString()
  companyId: number; // id da empresa
}

export class MfaDto {
  @IsString()
  mfaCode: string;
}

export class ResetMfaDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
