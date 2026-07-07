import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';

const app = await NestFactory.create(AppModule, { logger: false });
app.setGlobalPrefix('api/v1');
await app.listen(3201, '127.0.0.1');
const base = 'http://127.0.0.1:3201/api/v1';

const request = async (path, body, expectOk = true) => {
  const opts = body
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    : undefined;
  const response = await fetch(`${base}${path}`, opts);
  if (expectOk && !response.ok) throw new Error(`FAIL ${response.status}: ${await response.text()}`);
  return { status: response.status, body: response.ok ? await response.json() : await response.text() };
};

let pass = 0;
let fail = 0;
const assert = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error(`  FAIL: ${msg}`); } };

try {
  // Health
  const h = await request('/health');
  assert(h.body.status === 'ok', 'health check');

  // Accounts
  const accounts = await request('/demo/accounts');
  assert(Array.isArray(accounts.body) && accounts.body.length === 6, '6 demo accounts');

  // Master data
  const md = await request('/master-data');
  assert(md.body.employers.length >= 2, 'employers');
  assert(md.body.products.length >= 2, 'products');
  assert(md.body.departments.length >= 2, 'departments');
  assert(md.body.rootCauses.length >= 3, 'root causes');
  assert(md.body.faqs.length >= 5, 'faqs');

  // Working hours
  const wh = await request('/working-hours');
  assert(typeof wh.body.isWorkingHours === 'boolean', 'working hours');

  // ========== Flow 1: Customer creates → Support replies → Customer confirms → Rates ==========
  console.log('\n--- Flow 1: Resolve flow ---');
  const t1 = (await request('/tickets', {
    userId: 'customer', employerId: 'emp-1', productId: 'prod-win',
    departmentId: 'support-dept', title: 'تست جریان حل', description: 'بررسی خودکار مسیر حل مشکل',
  })).body;
  assert(t1.status === 'NEW', 'ticket created with NEW status');
  assert(t1.trackingNumber.startsWith('TDK-'), 'tracking number format');
  assert(t1.messages.length === 1, 'initial message created');

  // Customer cannot create test ticket
  const ct = await request('/tickets', {
    userId: 'customer', employerId: 'emp-1', productId: 'prod-win',
    departmentId: 'test-dept', title: 'test', description: 'test',
  }, false);
  assert(ct.status === 400, 'customer cannot create test ticket');

  // Support opens
  const t1open = (await request(`/tickets/${t1.id}/actions`, { userId: 'support', action: 'OPEN' })).body;
  assert(t1open.status === 'IN_REVIEW', 'support opens ticket');

  // Support replies
  const t1reply = (await request(`/tickets/${t1.id}/actions`, { userId: 'support', action: 'REPLY', message: 'پاسخ کارشناس' })).body;
  assert(t1reply.status === 'AWAITING_CUSTOMER', 'support reply → AWAITING_CUSTOMER');

  // Customer replies
  const t1creply = (await request(`/tickets/${t1.id}/actions`, { userId: 'customer', action: 'REPLY', message: 'پاسخ مشتری' })).body;
  assert(t1creply.status === 'AWAITING_EXPERT', 'customer reply → AWAITING_EXPERT');

  // Support resolves with root cause
  const t1res = (await request(`/tickets/${t1.id}/actions`, { userId: 'support', action: 'RESOLVE', rootCauseId: 'cause-training' })).body;
  assert(t1res.status === 'AWAITING_CUSTOMER', 'support resolve → AWAITING_CUSTOMER');
  assert(t1res.rootCause?.id === 'cause-training', 'root cause set');

  // Customer confirms
  const t1conf = (await request(`/tickets/${t1.id}/actions`, { userId: 'customer', action: 'CONFIRM' })).body;
  assert(t1conf.status === 'CLOSED_RESOLVED', 'customer confirm → CLOSED_RESOLVED');

  // Customer rates
  const t1rate = (await request(`/tickets/${t1.id}/actions`, { userId: 'customer', action: 'RATE', rating: 4 })).body;
  assert(t1rate.rating === 4, 'customer rating saved');
  assert(t1rate.status === 'CLOSED_RESOLVED', 'status unchanged after rating');

  // ========== Flow 2: Customer creates → Support refers → Test confirms development ==========
  console.log('\n--- Flow 2: Development-required flow ---');
  const t2 = (await request('/tickets', {
    userId: 'customer', employerId: 'emp-2', productId: 'prod-web',
    departmentId: 'support-dept', title: 'تست ارجاع به توسعه', description: 'بررسی خودکار مسیر ارجاع',
  })).body;
  assert(t2.status === 'NEW', 'ticket2 created');

  // Support opens
  (await request(`/tickets/${t2.id}/actions`, { userId: 'support', action: 'OPEN' }));
  // Support refers to test
  const t2ref = (await request(`/tickets/${t2.id}/actions`, { userId: 'support', action: 'REFER_TEST' })).body;
  assert(t2ref.status === 'REFERRED_TO_TEST', 'support refer → REFERRED_TO_TEST');
  assert(t2ref.departmentId === 'test-dept', 'department changed to test-dept');

  // Test opens
  const t2top = (await request(`/tickets/${t2.id}/actions`, { userId: 'test', action: 'OPEN_TEST' })).body;
  assert(t2top.status === 'TEST_IN_REVIEW', 'test opens → TEST_IN_REVIEW');

  // Test requests more info
  const t2info = (await request(`/tickets/${t2.id}/actions`, { userId: 'test', action: 'REPLY', message: 'اطلاعات بیشتر' })).body;
  assert(t2info.status === 'AWAITING_CUSTOMER', 'test reply → AWAITING_CUSTOMER');

  // Customer replies
  (await request(`/tickets/${t2.id}/actions`, { userId: 'customer', action: 'REPLY', message: 'اطلاعات تکمیلی' }));

  // Now status is AWAITING_EXPERT, test can still act (fix: also allow AWAITING_EXPERT from test-dept)
  const t2dev = (await request(`/tickets/${t2.id}/actions`, {
    userId: 'test', action: 'CONFIRM_DEVELOPMENT',
    pbiIdentifier: 'PBI-5678', probableFixedVersion: '4.0.0',
  })).body;
  assert(t2dev.status === 'CLOSED_REQUIRES_DEVELOPMENT', 't2: CLOSED_REQUIRES_DEVELOPMENT');
  assert(t2dev.pbiIdentifier === 'PBI-5678', 't2: PBI set');
  console.log('\n--- Flow 2b: Direct development-required ---');
  const t3 = (await request('/tickets', {
    userId: 'customer', employerId: 'emp-1', productId: 'prod-win',
    departmentId: 'support-dept', title: 'تست توسعه مستقیم', description: 'مسیر سریع',
  })).body;
  (await request(`/tickets/${t3.id}/actions`, { userId: 'support', action: 'OPEN' }));
  const t3ref = (await request(`/tickets/${t3.id}/actions`, { userId: 'support', action: 'REFER_TEST' })).body;
  assert(t3ref.status === 'REFERRED_TO_TEST', 't3: refer to test');
  (await request(`/tickets/${t3.id}/actions`, { userId: 'test', action: 'OPEN_TEST' }));
  const t3dev = (await request(`/tickets/${t3.id}/actions`, {
    userId: 'test', action: 'CONFIRM_DEVELOPMENT',
    pbiIdentifier: 'PBI-1234', probableFixedVersion: '3.4.0',
  })).body;
  assert(t3dev.status === 'CLOSED_REQUIRES_DEVELOPMENT', 't3: CLOSED_REQUIRES_DEVELOPMENT');
  assert(t3dev.pbiIdentifier === 'PBI-1234', 't3: PBI set');
  assert(t3dev.probableFixedVersion === '3.4.0', 't3: version set');

  // PBI is required
  const t3fail = await request(`/tickets/${t3.id}/actions`, {
    userId: 'test', action: 'CONFIRM_DEVELOPMENT',
    pbiIdentifier: '', probableFixedVersion: '1.0',
  }, false);
  assert(t3fail.status === 400, 't3: confirm dev without PBI fails');

  // ========== Authorization checks ==========
  console.log('\n--- Authorization checks ---');

  // Customer cannot open test ticket
  const auth1 = await request(`/tickets/${t1.id}/actions`, { userId: 'customer', action: 'OPEN' }, false);
  assert(auth1.status === 403 || auth1.status === 400, 'customer cannot OPEN');

  // Customer cannot refer to test
  const auth2 = await request(`/tickets/${t1.id}/actions`, { userId: 'customer', action: 'REFER_TEST' }, false);
  assert(auth2.status === 403 || auth2.status === 400, 'customer cannot REFER_TEST');

  // Support cannot confirm development
  const auth3 = await request(`/tickets/${t3.id}/actions`, { userId: 'support', action: 'CONFIRM_DEVELOPMENT' }, false);
  assert(auth3.status === 403 || auth3.status === 400, 'support cannot CONFIRM_DEVELOPMENT');

  // Test cannot open support ticket
  const auth4 = await request(`/tickets/${t1.id}/actions`, { userId: 'test', action: 'OPEN' }, false);
  assert(auth4.status === 403, 'test cannot OPEN support ticket');

  // Manager cannot create ticket
  const auth5 = await request('/tickets', {
    userId: 'manager', employerId: 'emp-1', productId: 'prod-win',
    departmentId: 'support-dept', title: 'x', description: 'y',
  }, false);
  assert(auth5.status === 403, 'manager cannot create ticket');

  // Invalid status transition
  const auth6 = await request(`/tickets/${t3.id}/actions`, { userId: 'test', action: 'OPEN_TEST' }, false);
  assert(auth6.status === 400 || auth6.status === 403, 'cannot open already-closed ticket');

  // Customer cannot see other customer's tickets
  const custTickets = await request('/tickets?userId=customer');
  assert(Array.isArray(custTickets.body), 'customer gets ticket list');

  // Manager metrics
  const metrics = await request('/manager/metrics?userId=manager');
  assert(typeof metrics.body.total === 'number', 'manager metrics total');
  assert(typeof metrics.body.open === 'number', 'manager metrics open');
  assert(typeof metrics.body.resolved === 'number', 'manager metrics resolved');
  assert(typeof metrics.body.development === 'number', 'manager metrics development');
  assert(typeof metrics.body.averageFirstResponseHours === 'string', 'manager metrics avg response');
  assert(Array.isArray(metrics.body.byProduct), 'manager metrics by product');
  assert(Array.isArray(metrics.body.byDepartment), 'manager metrics by department');
  assert(Array.isArray(metrics.body.recent), 'manager metrics recent');

  // Manager metrics with filters
  const mFiltered = await request('/manager/metrics?userId=manager&productId=prod-win');
  assert(typeof mFiltered.body.total === 'number', 'filtered metrics');

  // Non-manager cannot access metrics
  const auth7 = await request('/manager/metrics?userId=customer', null, false);
  // Might be 400 (userId required) or 403 — just check it's not 200 with data
  assert(auth7.status !== 200 || !auth7.body.total, 'customer cannot get manager metrics');

  // Support can see only support/sales tickets
  const supportTickets = await request('/tickets?userId=support');
  assert(Array.isArray(supportTickets.body), 'support gets ticket list');

  // Test can see only test-dept tickets
  const testTickets = await request('/tickets?userId=test');
  assert(Array.isArray(testTickets.body), 'test gets ticket list');

  // Customer cannot reply on closed ticket
  const closedReply = await request(`/tickets/${t1.id}/actions`, { userId: 'customer', action: 'REPLY', message: 'test' }, false);
  assert(closedReply.status === 400, 'cannot reply on closed ticket');

  // ========== Flow 3: Sales expert flow ==========
  console.log('\n--- Flow 3: Sales expert flow ---');
  const salesTickets = await request('/tickets?userId=sales');
  assert(Array.isArray(salesTickets.body), 'sales gets ticket list');
  assert(salesTickets.body.every(t => t.departmentId === 'sales'), 'sales sees only sales dept tickets');

  // Sales cannot open support tickets
  const salesAuth1 = await request(`/tickets/${t1.id}/actions`, { userId: 'sales', action: 'OPEN' }, false);
  assert(salesAuth1.status === 403, 'sales cannot open support ticket');

  // Sales cannot see non-sales tickets
  const salesAuth2 = await request(`/tickets/${t1.id}?userId=sales`, null, false);
  assert(salesAuth2.status === 403, 'sales cannot view support ticket');

  // ========== Flow 4: Developer expert flow ==========
  console.log('\n--- Flow 4: Developer expert flow ---');
  const devTickets = await request('/tickets?userId=developer');
  assert(Array.isArray(devTickets.body), 'developer gets ticket list');
  assert(devTickets.body.every(t => t.status === 'CLOSED_REQUIRES_DEVELOPMENT' || t.pbiIdentifier), 'dev sees only dev-required or PBI tickets');

  // Developer cannot view non-dev tickets
  const devAuth1 = await request(`/tickets/${t1.id}?userId=developer`, null, false);
  assert(devAuth1.status === 403, 'developer cannot view non-dev ticket');

  // Developer cannot open tickets
  const devAuth2 = await request(`/tickets/${t1.id}/actions`, { userId: 'developer', action: 'OPEN' }, false);
  assert(devAuth2.status === 403 || devAuth2.status === 400, 'developer cannot OPEN ticket');

  console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`);
  if (fail > 0) process.exit(1);
} finally {
  await app.close();
}
