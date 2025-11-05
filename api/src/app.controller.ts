import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './domain/auth/decorators/decorator.jwt';

@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Public()
  @Get('/health')
  healthCheck() {
    return { status: 'ok' };
  }
}
