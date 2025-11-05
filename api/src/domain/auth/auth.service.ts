import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as speakeasy from 'speakeasy';
import * as bcrypt from 'bcrypt';
import * as qrcode from 'qrcode';
import { LoginDto, RegisterDto, ResetMfaDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
  ) { }

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userService.create({
      ...dto,
      password: hashedPassword,
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    if (user.mfa && user.mfaEnabledAt) {
      if (!dto.mfaCode) {
        return { mfaRequired: true };
      }
      this.verifyMfa(user, dto.mfaCode);
      return this.generateJwt(user);
    }

    return { mfaSetupRequired: true };
  }

  generateJwt(user: any) {
    const payload = { sub: user.id, role: user.role };
    return { access_token: this.jwtService.sign(payload) };
  }

  verifyMfa(user: any, code: string) {
    if (!user.mfaSecret)
      throw new UnauthorizedException('MFA secret not found');

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
    });

    if (!verified) throw new UnauthorizedException('Invalid MFA code');
    return true;
  }

  private async buildMfaResponse(
    userId: number,
    secretBase32: string,
    otpauthUrl?: string,
  ) {
    const resolvedOtpauthUrl =
      otpauthUrl ??
      speakeasy.otpauthURL({
        secret: secretBase32,
        label: `GrãoSeguro (${userId})`,
        encoding: 'base32',
      });

    const qrCodeDataUrl = await qrcode.toDataURL(resolvedOtpauthUrl);

    return {
      otpauth_url: resolvedOtpauthUrl,
      qrCodeDataUrl,
    };
  }

  async generateMfaSecret(userId: number) {
    const secret = speakeasy.generateSecret({ name: `GrãoSeguro (${userId})` });
    await this.userService.update(userId, { mfaSecret: secret.base32 });

    return this.buildMfaResponse(userId, secret.base32, secret.otpauth_url);
  }

  async prepareMfaSetup(user: any) {
    if (user.mfaSecret) {
      return this.buildMfaResponse(user.id, user.mfaSecret);
    }

    return this.generateMfaSecret(user.id);
  }

  async enableMfa(user: any, code: string) {
    this.verifyMfa(user, code);
    await this.userService.update(user.id, {
      mfaEnabledAt: new Date(),
    });
    const jwt = this.generateJwt(user);
    return {
      message: 'MFA enabled successfully',
      ...jwt,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async getUser(id: number) {
    const user = await this.userService.findById(id);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  async getUserByEmail(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }
}
