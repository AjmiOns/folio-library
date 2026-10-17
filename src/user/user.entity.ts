import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { UserRole } from './user-role.enum';

// Table is named "users": "user" is a reserved word in PostgreSQL.
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30, unique: true })
  email: string;

  @Column({ length: 30, unique: true })
  username: string;

  // select: false → never returned by default (not even through relations)
  @Column({ select: false })
  password: string;

  @Column({ select: false })
  salt: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;
}
