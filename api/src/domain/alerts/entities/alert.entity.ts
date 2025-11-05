import { Silo } from 'src/domain/silos/entities/silo.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AlertType = 'temperature' | 'humidity' | 'airQuality';
export type AlertLevel = 'info' | 'warning' | 'critical';

@Entity({ name: 'alerts' })
export class Alert {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Silo, (silo) => silo.id, { onDelete: 'CASCADE' })
  silo: Silo;

  @Column({ type: 'enum', enum: ['temperature', 'humidity', 'airQuality'] })
  type: AlertType;

  @Column({ type: 'enum', enum: ['info', 'warning', 'critical'], default: 'info' })
  level: AlertLevel;

  @Column({ type: 'float', nullable: true })
  currentValue?: number; // valor atual que gerou o alerta

  @Column({ type: 'boolean', default: false })
  emailSent: boolean; // se foi enviado por email

  @Column({ nullable: true })
  message?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
