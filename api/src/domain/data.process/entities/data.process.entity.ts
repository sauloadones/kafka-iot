import { Silo } from 'src/domain/silos/entities/silo.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity({ name: 'data_process' })
export class DataProcess {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Silo, (silo) => silo.id, { onDelete: 'CASCADE' })
  silo: Silo;

  // Período de referência (ex: "2025-10-16" para agregações diárias)
  @Column({ type: 'timestamp' })
  periodStart: Date;

  @Column({ type: 'timestamp' })
  periodEnd: Date;

  // Médias
  @Column({ type: 'float', nullable: true })
  averageTemperature: number;

  @Column({ type: 'float', nullable: true })
  averageHumidity: number;

  @Column({ type: 'float', nullable: true })
  averageAirQuality: number;

  // Extremos
  @Column({ type: 'float', nullable: true })
  maxTemperature: number;

  @Column({ type: 'float', nullable: true })
  minTemperature: number;

  @Column({ type: 'float', nullable: true })
  maxHumidity: number;

  @Column({ type: 'float', nullable: true })
  minHumidity: number;

  // Desvios padrão
  @Column({ type: 'float', nullable: true })
  stdTemperature: number;

  @Column({ type: 'float', nullable: true })
  stdHumidity: number;

  @Column({ type: 'float', nullable: true })
  stdAirQuality: number;

  // Alertas
  @Column({ type: 'int', default: 0 })
  alertsCount: number;

  @Column({ type: 'int', default: 0 })
  criticalAlertsCount: number;

  // Outros indicadores
  @Column({ type: 'float', nullable: true })
  percentOverTempLimit: number;

  @Column({ type: 'float', nullable: true })
  percentOverHumLimit: number;

  @Column({ type: 'float', nullable: true })
  environmentScore: number; // índice geral de qualidade (0-100)

  @CreateDateColumn()
  createdAt: Date;
}
