import { Module } from '@nestjs/common';
import { DataProcessService } from './data.process.service';
import { DataProcessController } from './data.process.controller';
import { DataProcess } from './entities/data.process.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SilosModule } from '../silos/silos.module';

@Module({
  imports: [TypeOrmModule.forFeature([DataProcess]), SilosModule],
  controllers: [DataProcessController],
  providers: [DataProcessService],
})
export class DataProcessModule {}
