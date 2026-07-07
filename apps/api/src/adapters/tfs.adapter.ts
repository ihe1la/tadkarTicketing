import { Injectable } from '@nestjs/common';
export interface TfsAdapter { normalizePbi(value?: string): string; }
@Injectable()
export class FakeTfsAdapter implements TfsAdapter {
  normalizePbi(value?: string): string { return value?.trim() || `PBI-DEMO-${Math.floor(1000 + Math.random() * 9000)}`; }
}
