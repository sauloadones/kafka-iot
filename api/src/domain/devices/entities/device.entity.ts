import { Silo } from 'src/domain/silos/entities/silo.entity';
import {
  Column,
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';

@Entity({ name: 'devices' })
export class Device {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => Silo, (silo) => silo.id, { nullable: true, onDelete: 'SET NULL' })
  silo?: Silo; 

  @Column({ default: false })
  isOnline: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}