import { Module } from '@nestjs/common';
import { SilosService } from './silos.service';
import { SilosController } from './silos.controller';
import { Silo } from './entities/silo.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Silo])],
  controllers: [SilosController],
  providers: [SilosService],
  exports: [TypeOrmModule]
})
export class SilosModule {}
