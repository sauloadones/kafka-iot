import { Company } from 'src/domain/companies/entities/company.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'silos' })
export class Silo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  grain: string; 

  @Column({ type: 'boolean', default: false })
  inUse: boolean; 

  // Limites de monitoramento
  @Column({ type: 'float', nullable: true })
  maxTemperature?: number;

  @Column({ type: 'float', nullable: true })
  minTemperature?: number;

  @Column({ type: 'float', nullable: true })
  maxHumidity?: number;

  @Column({ type: 'float', nullable: true })
  minHumidity?: number;

  @Column({ type: 'float', nullable: true })
  maxAirQuality?: number;

  @Column({ type: 'float', nullable: true })
  minAirQuality?: number;

  @ManyToOne(() => Company, (company) => company.silos, { onDelete: 'CASCADE' })
  company: Company;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
