// Em: auth.controller.ts

import {
  Controller,
  Post,
  Body,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'; // Adicione Request, HttpCode, HttpStatus
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  MfaDto,
  ResetMfaDto,
} from './dto/auth.dto'; // Adicione MfaDto
import { Public } from './decorators/decorator.jwt';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);

    if ('mfaRequired' in result && result.mfaRequired) {
      return {
        message: 'MFA code required'
      }
    }

    if ('mfaSetupRequired' in result && result.mfaSetupRequired) {
      const user = await this.authService.getUserByEmail(dto.email);
      const mfaData = await this.authService.prepareMfaSetup(user);

      return {
        message: 'MFA setup required',
        mfaSetupRequired: true,
        ...mfaData,
      };
    }

    return result;
  }

  @Public()
  @Post('mfa/enable')
  async enableMfa(@Body() dto: { email: string; mfaCode: string }) {
    const user = await this.authService.getUserByEmail(dto.email);
    return this.authService.enableMfa(user, dto.mfaCode);
  }
}
