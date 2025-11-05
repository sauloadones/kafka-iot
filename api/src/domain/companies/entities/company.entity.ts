import { Silo } from 'src/domain/silos/entities/silo.entity';
import { User } from 'src/domain/users/entities/user.entity';
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'companies' })
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({unique: true})
  CNPJ: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  address?: string;

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @OneToMany(() => Silo, (silo) => silo.company)
  silos: Silo[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
