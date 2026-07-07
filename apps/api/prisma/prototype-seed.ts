import { PrismaClient, Role, TicketStatus } from '@prisma/client';
const prisma = new PrismaClient();
const users = [{ id: 'customer', username: 'customer', displayName: 'سارا احمدی', role: Role.CUSTOMER }, { id: 'support', username: 'support', displayName: 'علی رضایی', role: Role.SUPPORT }, { id: 'test', username: 'test', displayName: 'مریم مرادی', role: Role.TEST }, { id: 'manager', username: 'manager', displayName: 'مدیر سامانه', role: Role.MANAGER }, { id: 'sales', username: 'sales', displayName: 'نرگس محمدی', role: Role.SALES }, { id: 'developer', username: 'developer', displayName: 'امیر کاظمی', role: Role.DEVELOPER }];
const employers = [{ id: 'emp-1', name: 'شرکت راهکار نوین' }, { id: 'emp-2', name: 'گروه صنعتی پارس' }];
const products = [{ id: 'prod-win', name: 'تدکار ویندوز' }, { id: 'prod-web', name: 'شهاب تحت وب' }];
const departments = [{ id: 'sales', name: 'فروش' }, { id: 'support-dept', name: 'پشتیبانی' }, { id: 'test-dept', name: 'تست نرم‌افزار' }, { id: 'dev-dept', name: 'توسعه' }];
const causes = [{ id: 'cause-training', name: 'نیاز به آموزش سامانه' }, { id: 'cause-process', name: 'ابهام در فرایند کاری' }, { id: 'cause-system', name: 'اشکال فنی سامانه' }];
const faqs = [['faq-1', 'چگونه رمز عبور را تغییر دهم؟', 'از بخش پروفایل، گزینه تغییر رمز عبور را انتخاب کنید.', 'prod-win', 'support-dept'], ['faq-2', 'چرا گزارش چاپ نمی‌شود؟', 'چاپگر پیش‌فرض و دسترسی مرورگر را بررسی کنید.', 'prod-win', 'support-dept'], ['faq-3', 'نسخه جدید چگونه نصب می‌شود؟', 'بسته به‌روزرسانی را از کارشناس پشتیبانی دریافت کنید.', 'prod-win', 'support-dept'], ['faq-4', 'چگونه کاربر جدید بسازم؟', 'از تنظیمات کاربران، دکمه کاربر جدید را بزنید.', 'prod-web', 'support-dept'], ['faq-5', 'شرایط خرید محصول چیست؟', 'کارشناس فروش پس از ثبت درخواست با شما تماس می‌گیرد.', 'prod-web', 'sales'], ['faq-6', 'آیا نسخه آزمایشی ارائه می‌شود؟', 'درخواست خود را برای واحد فروش ثبت کنید.', 'prod-win', 'sales']] as const;
const guideFaqs = [
  ['guide-faq-1', 'چگونه وارد سامانه شهاب شوم؟', 'آدرس سامانه را در مرورگر وارد کنید، نام کاربری و رمز عبور را بزنید و روی «ورود به سامانه» کلیک کنید.', 'prod-web', 'support-dept'],
  ['guide-faq-2', 'اولین بار که وارد سامانه می‌شوم چه کاری باید انجام دهم؟', 'در اولین ورود، برای رعایت نکات امنیتی باید رمز عبور خود را تغییر دهید.', 'prod-web', 'support-dept'],
  ['guide-faq-3', 'اگر رمز عبور یا نام کاربری را فراموش کنم چه باید بکنم؟', 'در صورت فراموشی نام کاربری یا رمز عبور، با ادمین سامانه سازمان خود تماس بگیرید.', 'prod-web', 'support-dept'],
  ['guide-faq-4', 'چرا سامانه از من کد امنیتی می‌خواهد؟', 'اگر چند بار نام کاربری یا رمز عبور را اشتباه وارد کنید، سامانه برای افزایش امنیت، وارد کردن کد امنیتی را الزامی می‌کند.', 'prod-web', 'support-dept'],
  ['guide-faq-5', 'آیا امکان ورود با توکن سخت‌افزاری وجود دارد؟', 'بله. گزینه «استفاده از توکن سخت‌افزاری» را انتخاب کرده، نام کاربری و کد امنیتی را وارد کنید و سپس روی «امضا و ورود به سامانه» کلیک نمایید.', 'prod-web', 'support-dept'],
  ['guide-faq-6', 'چگونه یک پیمان جدید ایجاد کنم؟', 'وارد بخش پیمان‌ها شوید، روی «جدید» کلیک کنید، اطلاعات پیمان را وارد نمایید و سپس ذخیره کنید.', 'prod-win', 'support-dept'],
  ['guide-faq-7', 'هنگام ایجاد پیمان چه اطلاعاتی باید وارد شود؟', 'عنوان پیمان، سال فهرست‌بها، شماره قرارداد، تاریخ قرارداد، تاریخ شروع، مدت پیمان، مبلغ اولیه و عوامل اجرایی.', 'prod-win', 'support-dept'],
  ['guide-faq-8', 'چگونه یک پیمان را ویرایش کنم؟', 'پیمان موردنظر را انتخاب کرده و روی گزینه «ویرایش» کلیک کنید.', 'prod-win', 'support-dept'],
  ['guide-faq-9', 'چگونه ردیف موردنظر را در فهرست‌بها پیدا کنم؟', 'از کادر جستجو استفاده کنید و کد، شرح، واحد یا بهای واحد را وارد نمایید.', 'prod-win', 'support-dept'],
  ['guide-faq-10', 'آیا می‌توان بر اساس مبلغ جستجو انجام داد؟', 'بله. در ستون بهای واحد از جستجوی پیشرفته استفاده کرده و گزینه‌های «برابر با»، «کمتر از» یا «بیشتر از» را انتخاب کنید.', 'prod-win', 'support-dept'],
  ['guide-faq-11', 'چگونه آنالیز یک ردیف را مشاهده کنم؟', 'ردیف موردنظر را انتخاب کرده و روی آیکون آنالیز کلیک نمایید.', 'prod-win', 'support-dept'],
  ['guide-faq-12', 'در آنالیز ردیف چه اطلاعاتی نمایش داده می‌شود؟', 'مواردی مانند نیروی انسانی، ماشین‌آلات، مصالح و حمل نمایش داده می‌شود.', 'prod-win', 'support-dept'],
  ['guide-faq-13', 'چگونه مصالح مشمول حمل را مشاهده کنم؟', 'پس از انتخاب ردیف، روی گزینه «مصالح مشمول حمل» کلیک کنید.', 'prod-win', 'support-dept'],
  ['guide-faq-14', 'چگونه خروجی اکسل از فهرست‌بها بگیرم؟', 'از گزینه «ارسال به اکسل» استفاده کنید و در صورت نیاز، سرستون‌های دلخواه را انتخاب نمایید.', 'prod-win', 'support-dept'],
  ['guide-faq-15', 'چگونه ستون‌های جدول را تغییر دهم؟', 'روی گزینه «سفارشی‌سازی سرستون‌ها» کلیک کرده و ستون‌های موردنظر را فعال یا غیرفعال کنید.', 'prod-win', 'support-dept'],
  ['guide-faq-16', 'شاخص‌ها را از کجا مشاهده کنم؟', 'از بخش شاخص‌ها می‌توانید شاخص‌های فصلی، رشته‌ای و سالانه را مشاهده و جستجو کنید.', 'prod-win', 'support-dept'],
  ['guide-faq-17', 'پیمان مشاور چیست؟', 'پیمان مشاور برای قراردادهای خدمات مهندسان مشاور استفاده می‌شود و فرم‌های حق‌الزحمه خدمات نظارت را فعال می‌کند.', 'prod-win', 'sales'],
  ['guide-faq-18', 'حق‌الزحمه خدمات نظارت شامل چه بخش‌هایی است؟', 'حق‌الزحمه خدمات نظارت در سه دوره قبل از اجرا، حین اجرا و بعد از اجرا محاسبه می‌شود.', 'prod-win', 'sales'],
  ['guide-faq-19', 'چگونه گزارش‌های سامانه را مشاهده کنم؟', 'از بخش گزارش‌ها می‌توانید گزارش‌های آماری، نظارت، کنترل پروژه، تعدیل و سایر گزارش‌های مدیریتی را مشاهده کنید.', 'prod-web', 'support-dept'],
  ['guide-faq-20', 'اگر پاسخ سؤال من در راهنمای شهاب وجود نداشت چه کنم؟', 'پاسخ سؤال شما را نمی‌دانم و باید با پشتیبان تلفنی شرکت تدکار نرم‌افزار تماس بگیرید.', 'prod-web', 'support-dept'],
] as const;
async function main(): Promise<void> {
  await prisma.statusHistory.deleteMany(); await prisma.ticketMessage.deleteMany(); await prisma.ticket.deleteMany(); await prisma.faq.deleteMany(); await prisma.user.deleteMany(); await prisma.employer.deleteMany(); await prisma.product.deleteMany(); await prisma.department.deleteMany(); await prisma.rootCause.deleteMany();
  await prisma.user.createMany({ data: users }); await prisma.employer.createMany({ data: employers }); await prisma.product.createMany({ data: products }); await prisma.department.createMany({ data: departments }); await prisma.rootCause.createMany({ data: causes });
  await prisma.faq.createMany({ data: [...faqs, ...guideFaqs].map(([id, question, answer, productId, departmentId], i) => ({ id, question, answer, productId, departmentId, usageCount: i + 2 })) });
  const statuses = Object.values(TicketStatus);
  for (let i = 0; i < 10; i += 1) {
    const status = statuses[i % statuses.length]!;
    const ticket = await prisma.ticket.create({ data: { trackingNumber: `TDK-1405-${String(i + 1).padStart(4, '0')}`, title: ['خطا در ورود به سامانه', 'درخواست راهنمای گزارش', 'کندی صفحه کاربران'][i % 3]!, description: 'این تیکت نمونه برای نمایش گردش کار و گزارش مدیریتی ایجاد شده است.', status, customerId: 'customer', employerId: i % 2 ? 'emp-2' : 'emp-1', productId: i % 2 ? 'prod-web' : 'prod-win', departmentId: [TicketStatus.REFERRED_TO_TEST, TicketStatus.TEST_IN_REVIEW].includes(status) ? 'test-dept' : 'support-dept', rootCauseId: status === TicketStatus.CLOSED_RESOLVED ? 'cause-training' : null, pbiIdentifier: status === TicketStatus.CLOSED_REQUIRES_DEVELOPMENT ? 'PBI-2481' : null, probableFixedVersion: status === TicketStatus.CLOSED_REQUIRES_DEVELOPMENT ? '3.4.0' : null, rating: status === TicketStatus.CLOSED_RESOLVED ? 5 : null, firstResponseAt: i > 0 ? new Date(Date.now() - (i + 1) * 3600000) : null, createdAt: new Date(Date.now() - (i + 2) * 86400000) } });
    await prisma.ticketMessage.create({ data: { ticketId: ticket.id, authorId: 'customer', body: ticket.description } });
    await prisma.statusHistory.create({ data: { ticketId: ticket.id, actorId: 'customer', to: TicketStatus.NEW, note: 'ثبت تیکت' } });
    if (status !== TicketStatus.NEW) await prisma.statusHistory.create({ data: { ticketId: ticket.id, actorId: 'support', from: TicketStatus.NEW, to: status, note: 'وضعیت داده نمایشی' } });
  }
  // Sales department tickets
  const salesTicket1 = await prisma.ticket.create({ data: { trackingNumber: 'TDK-1405-0011', title: 'درخواست استعلام قیمت', description: 'مشتری درخواست استعلام قیمت محصول شهاب تحت وب را دارد.', status: TicketStatus.IN_REVIEW, customerId: 'customer', employerId: 'emp-2', productId: 'prod-web', departmentId: 'sales', createdAt: new Date(Date.now() - 3 * 86400000) } });
  await prisma.ticketMessage.create({ data: { ticketId: salesTicket1.id, authorId: 'customer', body: salesTicket1.description } });
  await prisma.statusHistory.create({ data: { ticketId: salesTicket1.id, actorId: 'customer', to: TicketStatus.NEW, note: 'ثبت تیکت' } });
  await prisma.statusHistory.create({ data: { ticketId: salesTicket1.id, actorId: 'support', from: TicketStatus.NEW, to: TicketStatus.IN_REVIEW, note: 'بررسی فروش' } });
  const salesTicket2 = await prisma.ticket.create({ data: { trackingNumber: 'TDK-1405-0012', title: 'پیش‌فاکتور سفارش جدید', description: 'صادر کردن پیش‌فاکتور برای سفارش ۵۰ لایسنس.', status: TicketStatus.NEW, customerId: 'customer', employerId: 'emp-1', productId: 'prod-win', departmentId: 'sales', createdAt: new Date(Date.now() - 1 * 86400000) } });
  await prisma.ticketMessage.create({ data: { ticketId: salesTicket2.id, authorId: 'customer', body: salesTicket2.description } });
  await prisma.statusHistory.create({ data: { ticketId: salesTicket2.id, actorId: 'customer', to: TicketStatus.NEW, note: 'ثبت تیکت' } });
  // Development-required tickets
  const devTicket1 = await prisma.ticket.create({ data: { trackingNumber: 'TDK-1405-0013', title: 'رفع باگ چاپ گزارش', description: 'گزارش‌های PDF در برخی مرورگرها چاپ نمی‌شوند.', status: TicketStatus.CLOSED_REQUIRES_DEVELOPMENT, customerId: 'customer', employerId: 'emp-1', productId: 'prod-win', departmentId: 'dev-dept', pbiIdentifier: 'PBI-3001', probableFixedVersion: '3.5.0', createdAt: new Date(Date.now() - 5 * 86400000), firstResponseAt: new Date(Date.now() - 4 * 86400000) } });
  await prisma.ticketMessage.create({ data: { ticketId: devTicket1.id, authorId: 'customer', body: devTicket1.description } });
  await prisma.statusHistory.create({ data: { ticketId: devTicket1.id, actorId: 'customer', to: TicketStatus.NEW, note: 'ثبت تیکت' } });
  await prisma.statusHistory.create({ data: { ticketId: devTicket1.id, actorId: 'support', from: TicketStatus.NEW, to: TicketStatus.CLOSED_REQUIRES_DEVELOPMENT, note: 'نیاز به توسعه' } });
  const devTicket2 = await prisma.ticket.create({ data: { trackingNumber: 'TDK-1405-0014', title: 'بهینه‌سازی عملکرد جستجو', description: 'جستجو در تیکت‌ها کند است و بهینه‌سازی نیاز دارد.', status: TicketStatus.IN_REVIEW, customerId: 'customer', employerId: 'emp-2', productId: 'prod-web', departmentId: 'dev-dept', pbiIdentifier: 'PBI-3002', probableFixedVersion: '3.6.0', createdAt: new Date(Date.now() - 7 * 86400000), firstResponseAt: new Date(Date.now() - 6 * 86400000) } });
  await prisma.ticketMessage.create({ data: { ticketId: devTicket2.id, authorId: 'customer', body: devTicket2.description } });
  await prisma.statusHistory.create({ data: { ticketId: devTicket2.id, actorId: 'customer', to: TicketStatus.NEW, note: 'ثبت تیکت' } });
  await prisma.statusHistory.create({ data: { ticketId: devTicket2.id, actorId: 'support', from: TicketStatus.NEW, to: TicketStatus.IN_REVIEW, note: 'بررسی توسعه' } });
  const devTicket3 = await prisma.ticket.create({ data: { trackingNumber: 'TDK-1405-0015', title: 'عدم همگام‌سازی داده‌ها در موبایل', description: 'داده‌های کاربر در نسخه موبایل به‌روزرسانی نمی‌شوند.', status: TicketStatus.AWAITING_EXPERT, customerId: 'customer', employerId: 'emp-1', productId: 'prod-win', departmentId: 'dev-dept', pbiIdentifier: 'PBI-3010', probableFixedVersion: '3.7.0', createdAt: new Date(Date.now() - 2 * 86400000), firstResponseAt: new Date(Date.now() - 1 * 86400000) } });
  await prisma.ticketMessage.create({ data: { ticketId: devTicket3.id, authorId: 'customer', body: devTicket3.description } });
  await prisma.statusHistory.create({ data: { ticketId: devTicket3.id, actorId: 'customer', to: TicketStatus.NEW, note: 'ثبت تیکت' } });
  await prisma.statusHistory.create({ data: { ticketId: devTicket3.id, actorId: 'support', from: TicketStatus.NEW, to: TicketStatus.AWAITING_EXPERT, note: 'در انتظار کارشناسی توسعه' } });
  const devTicket4 = await prisma.ticket.create({ data: { trackingNumber: 'TDK-1405-0016', title: 'خطای بارگذاری فایل‌های ضمیمه', description: 'فایل‌های ضمیمه در برخی حساب‌ها با خطا بارگذاری می‌شوند.', status: TicketStatus.REFERRED_TO_TEST, customerId: 'customer', employerId: 'emp-2', productId: 'prod-web', departmentId: 'dev-dept', pbiIdentifier: 'PBI-3014', probableFixedVersion: '3.8.0', createdAt: new Date(Date.now() - 4 * 86400000), firstResponseAt: new Date(Date.now() - 3 * 86400000) } });
  await prisma.ticketMessage.create({ data: { ticketId: devTicket4.id, authorId: 'customer', body: devTicket4.description } });
  await prisma.statusHistory.create({ data: { ticketId: devTicket4.id, actorId: 'customer', to: TicketStatus.NEW, note: 'ثبت تیکت' } });
  await prisma.statusHistory.create({ data: { ticketId: devTicket4.id, actorId: 'support', from: TicketStatus.NEW, to: TicketStatus.REFERRED_TO_TEST, note: 'ارجاع به تست' } });
  const devTicket5 = await prisma.ticket.create({ data: { trackingNumber: 'TDK-1405-0017', title: 'واکنش‌پذیری فرم‌های ورود', description: 'فرم ورود در صفحه نمایش‌های کوچک به‌خوبی باز نمی‌شود.', status: TicketStatus.TEST_IN_REVIEW, customerId: 'customer', employerId: 'emp-1', productId: 'prod-win', departmentId: 'dev-dept', pbiIdentifier: 'PBI-3017', probableFixedVersion: '3.9.0', createdAt: new Date(Date.now() - 6 * 86400000), firstResponseAt: new Date(Date.now() - 5 * 86400000) } });
  await prisma.ticketMessage.create({ data: { ticketId: devTicket5.id, authorId: 'customer', body: devTicket5.description } });
  await prisma.statusHistory.create({ data: { ticketId: devTicket5.id, actorId: 'customer', to: TicketStatus.NEW, note: 'ثبت تیکت' } });
  await prisma.statusHistory.create({ data: { ticketId: devTicket5.id, actorId: 'test', from: TicketStatus.NEW, to: TicketStatus.TEST_IN_REVIEW, note: 'بررسی تست' } });
}
main().finally(() => prisma.$disconnect());
