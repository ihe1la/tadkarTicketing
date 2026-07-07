import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
export interface EmployeeAuthAdapter { demoAccounts(): Promise<unknown[]>; login(userId: string): Promise<unknown>; }
@Injectable()
export class LocalEmployeeAuthAdapter implements EmployeeAuthAdapter {
  constructor(private readonly prisma: PrismaService) {}
  demoAccounts() { return this.prisma.user.findMany({ orderBy: { role: 'asc' } }); }
  login(userId: string) { return this.prisma.user.findUniqueOrThrow({ where: { id: userId } }); }
}
