import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
const app = await NestFactory.create(AppModule, { logger: false });
app.setGlobalPrefix('api/v1');
await app.listen(3101, '127.0.0.1');
const base = 'http://127.0.0.1:3101/api/v1';
const request = async (path, body) => {
  const response = await fetch(`${base}${path}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response.json();
};
try {
  const created = await request('/tickets', { userId: 'customer', employerId: 'emp-1', productId: 'prod-win', departmentId: 'support-dept', title: 'تست گردش کامل', description: 'بررسی خودکار مسیر ارجاع تا توسعه' });
  await request(`/tickets/${created.id}/actions`, { userId: 'support', action: 'OPEN' });
  await request(`/tickets/${created.id}/actions`, { userId: 'support', action: 'REFER_TEST' });
  await request(`/tickets/${created.id}/actions`, { userId: 'test', action: 'OPEN_TEST' });
  const closed = await request(`/tickets/${created.id}/actions`, { userId: 'test', action: 'CONFIRM_DEVELOPMENT', pbiIdentifier: 'PBI-SMOKE-1', probableFixedVersion: '9.9.0' });
  if (closed.status !== 'CLOSED_REQUIRES_DEVELOPMENT' || closed.pbiIdentifier !== 'PBI-SMOKE-1') throw new Error('Unexpected final state');
  console.log('demo-smoke: passed');
} finally { await app.close(); }
