import { CommonModule } from '@angular/common';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { Component, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { bootstrapApplication } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

type Account = { id: string; displayName: string; role: 'CUSTOMER' | 'SUPPORT' | 'TEST' | 'MANAGER' | 'SALES' | 'DEVELOPER' };
type Named = { id: string; name: string };
type Faq = { id: string; question: string; answer: string; usageCount: number };
type HistoryEntry = { id: string; from: string | null; to: string; note?: string; createdAt: string; actor: Account };
type Ticket = { id: string; trackingNumber: string; title: string; description: string; status: string; customer: Account; employer: Named; product: Named; department: Named; rootCause?: Named; pbiIdentifier?: string; probableFixedVersion?: string; rating?: number; createdAt: string; updatedAt: string; firstResponseAt?: string; messages: { id: string; body: string; createdAt: string; author: Account }[]; history: HistoryEntry[] };
type Master = { employers: Named[]; products: Named[]; departments: Named[]; rootCauses: Named[]; faqs: Faq[] };
type Metrics = { total: number; open: number; resolved: number; development: number; averageFirstResponseHours: string; byProduct: { name: string; count: number }[]; byDepartment: { name: string; count: number }[]; recent: Ticket[] };
type NavigationState = { view?: 'dashboard' | 'tickets' | 'new' | 'detail'; ticketId?: string };
type ReplyTemplate = { label: string; text: string };
type QuestionTemplate = { label: string; title: string; description: string };
const labels: Record<string, string> = { NEW: 'جدید', IN_REVIEW: 'در حال بررسی', AWAITING_CUSTOMER: 'منتظر پاسخ مشتری', AWAITING_EXPERT: 'منتظر پاسخ کارشناس', REFERRED_TO_TEST: 'ارجاع به تست', TEST_IN_REVIEW: 'بررسی تیم تست', RETURNED_TO_SUPPORT: 'بازگشت به پشتیبانی', CLOSED_RESOLVED: 'خاتمه یافته ـ حل شده', CLOSED_REQUIRES_DEVELOPMENT: 'توسعه در جریان' };
const questionTemplates: QuestionTemplate[] = [
  { label: 'ورود به سامانه', title: 'چگونه وارد سامانه شهاب شوم؟', description: 'آدرس سامانه را وارد کردم اما برای ورود به نام کاربری و رمز نیاز دارم.' },
  { label: 'تغییر رمز', title: 'اولین بار که وارد می‌شوم چه کنم؟', description: 'می‌خواهم بدانم اولین ورود چه مراحلی دارد و آیا باید رمز را عوض کنم.' },
  { label: 'فراموشی رمز', title: 'اگر رمز عبور را فراموش کنم چه کنم؟', description: 'نام کاربری یا رمز عبور را فراموش کرده‌ام و راهنمایی می‌خواهم.' },
  { label: 'کد امنیتی', title: 'چرا سامانه کد امنیتی می‌خواهد؟', description: 'پس از چند بار ورود ناموفق، سامانه کد امنیتی نمایش می‌دهد.' },
  { label: 'توکن سخت‌افزاری', title: 'آیا ورود با توکن سخت‌افزاری ممکن است؟', description: 'می‌خواهم با توکن سخت‌افزاری وارد سامانه شوم.' },
  { label: 'ایجاد پیمان', title: 'چگونه یک پیمان جدید ایجاد کنم؟', description: 'برای ایجاد پیمان جدید راهنمایی مرحله‌به‌مرحله می‌خواهم.' },
  { label: 'فهرست اطلاعات', title: 'هنگام ایجاد پیمان چه اطلاعاتی لازم است؟', description: 'لطفاً فیلدهای لازم برای ثبت پیمان را اعلام کنید.' },
  { label: 'گزارش چاپ', title: 'چرا گزارش چاپ نمی‌شود؟', description: 'گزارش چاپ نمی‌شود و نیاز به بررسی تنظیمات دارم.' },
];
const replyTemplates: Record<string, ReplyTemplate[]> = {
  CUSTOMER: [
    { label: 'تایید حل شد', text: 'ممنون، مشکل برطرف شد و نیازی به پیگیری بیشتر نیست.' },
    { label: 'هنوز باقی است', text: 'موضوع هنوز باقی است، لطفاً بررسی بیشتری انجام دهید.' },
    { label: 'اطلاعات بیشتر', text: 'اگر اطلاعات، اسکرین‌شات یا نمونه بیشتری لازم است، ارسال می‌کنم.' },
  ],
  SUPPORT: [
    { label: 'در حال بررسی', text: 'تیکت در صف بررسی است و نتیجه پس از بررسی اعلام می‌شود.' },
    { label: 'اطلاعات تکمیلی', text: 'لطفاً نسخه اجرا، زمان وقوع و اسکرین‌شات را ارسال کنید.' },
    { label: 'ارجاع به تست', text: 'موضوع برای بررسی فنی به تیم تست ارجاع شد.' },
    { label: 'پاسخ FAQ', text: 'بر اساس راهنمای سامانه، لطفاً مراحل را طبق مستندات انجام دهید. اگر مسئله باقی بود، جزئیات بیشتری ارسال کنید.' },
  ],
  SALES: [
    { label: 'پیگیری فروش', text: 'درخواست شما ثبت شد و کارشناس فروش با شما هماهنگ می‌کند.' },
    { label: 'اطلاعات محصول', text: 'لطفاً تعداد لایسنس یا پلن مدنظر را ارسال کنید تا دقیق‌تر پیگیری شود.' },
    { label: 'پیشنهاد اولیه', text: 'برای انتخاب بهتر، نیاز اصلی خود را بفرمایید تا مناسب‌ترین گزینه پیشنهاد شود.' },
  ],
  TEST: [
    { label: 'اطلاعات تکمیلی', text: 'برای بازتولید، نسخه دقیق، محیط اجرا، مراحل انجام و نتیجه مورد انتظار را ارسال کنید.' },
    { label: 'تایید باگ', text: 'اشکال بازتولید شد و برای توسعه ثبت می‌شود.' },
    { label: 'بازگشت به پشتیبانی', text: 'برای تکمیل بررسی، لطفاً نمونه یا لاگ بیشتری از پشتیبانی دریافت شود.' },
    { label: 'سؤال از مشتری', text: 'برای ادامه بررسی، لطفاً دقیقاً بفرمایید در کدام مرحله مشکل رخ می‌دهد و خروجی مورد انتظار چیست.' },
  ],
  DEVELOPER: [
    { label: 'ثبت PBI', text: 'موضوع برای توسعه ثبت شد و PBI در حال نهایی‌سازی است.' },
    { label: 'آماده رفع', text: 'ایراد بررسی شد و در نسخه بعدی برای اصلاح برنامه‌ریزی می‌شود.' },
    { label: 'تایید فنی', text: 'علت فنی تایید شد و راهکار اصلاحی در صف اجرا قرار گرفت.' },
    { label: 'نیاز به جزئیات', text: 'برای تکمیل بررسی توسعه، لطفاً نمونه خطا، مسیر بازتولید یا اسکرین‌شات ارسال شود.' },
  ],
};

@Component({ selector: 'app-root', standalone: true, imports: [CommonModule, FormsModule], styleUrls: ['./prototype.css'], template: `
<main dir="rtl" [class.dark]="dark">

<!-- LOGIN -->
<section class="login" *ngIf="!user">
  <div class="brand"><span>ت</span><div><h1>تدکار</h1><p>سامانه یکپارچه پشتیبانی مشتریان</p></div></div>
  <div class="login-card">
    <h2>ورود با حساب آزمایشی</h2>
    <p class="muted">برای مشاهده گردش کار، یکی از نقش‌ها را انتخاب کنید.</p>
    <div class="accounts" *ngIf="!loadingAccounts">
      <button *ngFor="let a of accounts; trackBy: trackById" (click)="login(a)" [class]="'role-'+a.role.toLowerCase()">
        <b>{{a.displayName}}</b><small>{{role(a.role)}}</small>
      </button>
    </div>
    <div class="loading" *ngIf="loadingAccounts"><div class="spinner"></div><p>در حال بارگذاری...</p></div>
    <p class="error" *ngIf="error">{{error}}</p>
  </div>
</section>

<!-- APP SHELL -->
<div class="app" *ngIf="user" [class.dark]="dark">
  <header>
    <div class="header-right">
      <div class="user"><div><b>{{user.displayName}}</b><small>{{role(user.role)}}</small></div></div>
    </div>
    <div class="brand compact header-center"><span>ت</span><div><b>شهاب تدکار</b><small>پشتیبانی مشتریان</small></div></div>
    <div class="header-left">
      <button class="ghost theme-toggle" type="button" (click)="toggleTheme()" [attr.aria-label]="dark ? 'فعال‌کردن حالت روشن' : 'فعال‌کردن حالت تاریک'">{{ dark ? '☀ روشن' : '◐ تاریک' }}</button>
      <button class="ghost logout" type="button" (click)="logout()">خروج</button>
    </div>
  </header>
  <aside>
    <p class="eyebrow">منوی اصلی</p>
    <button [class.active]="view==='dashboard'" (click)="dashboard()">نمای کلی</button>
    <button *ngIf="user.role!=='MANAGER'" [class.active]="view==='tickets'" (click)="list()">تیکت‌ها</button>
    <button *ngIf="user.role==='CUSTOMER'" [class.active]="view==='new'" (click)="newTicket()">ثبت تیکت جدید</button>
  </aside>

  <nav class="mobile-nav" aria-label="منوی اصلی">
    <button [class.active]="view==='dashboard'" (click)="dashboard()">نمای کلی</button>
    <button *ngIf="user.role!=='MANAGER'" [class.active]="view==='tickets'||view==='detail'" (click)="list()">تیکت‌ها</button>
    <button *ngIf="user.role==='CUSTOMER'" [class.active]="view==='new'" (click)="newTicket()">تیکت جدید</button>
  </nav>

  <section class="content">
    <div class="page-head">
      <div><p class="eyebrow">{{today}}</p><h1>{{title}}</h1></div>
      <button class="primary" *ngIf="user.role==='CUSTOMER'&&view!=='new'" (click)="newTicket()">+ ثبت تیکت جدید</button>
    </div>
    <p class="notice" *ngIf="notice">{{notice}}</p>
    <p class="error" *ngIf="error">{{error}}</p>

    <!-- LOADING -->
    <div class="loading" *ngIf="loading"><div class="spinner"></div><p>در حال بارگذاری...</p></div>

    <!-- DASHBOARD: non-manager -->
    <ng-container *ngIf="view==='dashboard'&&user.role!=='MANAGER'&&!loading">
      <div class="stats">
        <article><small>همه تیکت‌ها</small><b>{{tickets.length}}</b></article>
        <article><small>در انتظار اقدام</small><b>{{openCount}}</b></article>
        <article><small>خاتمه‌یافته</small><b>{{tickets.length-openCount}}</b></article>
      </div>
      <section class="panel">
        <div class="panel-head"><h2>آخرین تیکت‌ها</h2><button class="link" (click)="list()">مشاهده همه</button></div>
        <ng-container *ngTemplateOutlet="table"></ng-container>
      </section>
    </ng-container>

    <!-- DASHBOARD: manager -->
    <ng-container *ngIf="view==='dashboard'&&user.role==='MANAGER'&&!loading">
      <div class="filters" *ngIf="master.products.length">
        <label>محصول<select [(ngModel)]="filter.productId" (change)="loadMetrics()"><option value="">همه</option><option *ngFor="let p of master.products" [value]="p.id">{{p.name}}</option></select></label>
        <label>واحد<select [(ngModel)]="filter.departmentId" (change)="loadMetrics()"><option value="">همه</option><option *ngFor="let d of allDepartments" [value]="d.id">{{d.name}}</option></select></label>
        <label>از تاریخ<input type="date" [(ngModel)]="filter.dateFrom" (change)="loadMetrics()"></label>
        <label>تا تاریخ<input type="date" [(ngModel)]="filter.dateTo" (change)="loadMetrics()"></label>
      </div>
      <div class="stats five" *ngIf="metrics">
        <article><small>کل تیکت‌ها</small><b>{{metrics.total}}</b></article>
        <article><small>باز</small><b>{{metrics.open}}</b></article>
        <article><small>حل‌شده</small><b>{{metrics.resolved}}</b></article>
        <article><small>نیازمند توسعه</small><b>{{metrics.development}}</b></article>
        <article><small>میانگین پاسخ اول</small><b>{{metrics.averageFirstResponseHours}} ساعت</b></article>
      </div>
      <div class="grid-2">
        <section class="panel"><h2>بر اساس محصول</h2>
          <div class="bar" *ngFor="let r of metrics.byProduct"><span>{{r.name}}</span><i [style.width.%]="barWidth(r.count, metrics.total)"></i><b>{{r.count}}</b></div>
          <div class="empty" *ngIf="!metrics.byProduct.length">داده‌ای موجود نیست.</div>
        </section>
        <section class="panel"><h2>بر اساس واحد</h2>
          <div class="bar" *ngFor="let r of metrics.byDepartment"><span>{{r.name}}</span><i [style.width.%]="barWidth(r.count, metrics.total)"></i><b>{{r.count}}</b></div>
          <div class="empty" *ngIf="!metrics.byDepartment.length">داده‌ای موجود نیست.</div>
        </section>
      </div>
      <section class="panel"><h2>تیکت‌های اخیر</h2>
        <ng-container *ngTemplateOutlet="table;context:{list:metrics.recent}"></ng-container>
      </section>
    </ng-container>

    <!-- TICKET LIST -->
    <section class="panel" *ngIf="view==='tickets'&&!loading">
      <div class="panel-head"><h2>{{queue}}</h2><span class="count">{{filteredTickets.length}} / {{tickets.length}} مورد</span></div>
      <label class="search-label">
        جستجو در تیکت‌ها
        <input type="search" [(ngModel)]="searchQuery" (ngModelChange)="updateFilteredTickets()" placeholder="عنوان، شماره، محصول یا واحد">
      </label>
      <ng-container *ngTemplateOutlet="table;context:{list:filteredTickets}"></ng-container>
    </section>

    <!-- NEW TICKET -->
    <section *ngIf="view==='new'" class="grid-2">
      <section class="panel">
        <h2>مشخصات درخواست</h2>
        <p class="working-hours" *ngIf="!outsideHours">ساعات کاری: پاسخ‌دهی سریع‌تر خواهد بود.</p>
        <p class="working-hours off" *ngIf="outsideHours">خارج از ساعات کاری: تیکت ثبت می‌شود ولی پاسخ‌دهی در ساعات کاری بعدی خواهد بود.</p>
        <label>کارفرما<select [(ngModel)]="draft.employerId"><option *ngFor="let x of master.employers" [value]="x.id">{{x.name}}</option></select></label>
        <label>محصول<select [(ngModel)]="draft.productId" (change)="faqs()"><option *ngFor="let x of master.products" [value]="x.id">{{x.name}}</option></select></label>
        <label>واحد مقصد<select [(ngModel)]="draft.departmentId" (change)="faqs()"><option *ngFor="let x of master.departments" [value]="x.id">{{x.name}}</option></select></label>
        <label>عنوان<input [(ngModel)]="draft.title" placeholder="عنوان کوتاه و روشن"></label>
        <label>شرح مشکل<textarea [(ngModel)]="draft.description" rows="5"></textarea></label>
        <button class="primary" (click)="create()" [disabled]="busyAction || !canCreate">{{busyAction ? 'در حال ثبت…' : 'ثبت و دریافت شماره پیگیری'}}</button>
      </section>
      <section class="panel faq">
        <p class="eyebrow">پیش از ثبت تیکت</p>
        <h2>پاسخ‌های پیشنهادی</h2>
        <div class="quick-picks" *ngIf="questionTemplates.length">
          <div class="reply-bank-head">
            <p class="eyebrow">سؤال‌های آماده</p>
            <span class="count">برای پر کردن سریع عنوان و شرح</span>
          </div>
          <div class="reply-bank-grid">
            <button type="button" *ngFor="let template of questionTemplates" (click)="applyQuestionTemplate(template)">
              {{template.label}}
            </button>
          </div>
        </div>
        <details *ngFor="let f of master.faqs" (toggle)="draft.faqId=f.id">
          <summary>{{f.question}}</summary>
          <p>{{f.answer}}</p>
          <small>{{f.usageCount}} بار مفید بوده</small>
        </details>
        <div class="empty" *ngIf="!master.faqs.length">پاسخی یافت نشد.</div>
      </section>
    </section>

    <!-- TICKET DETAIL -->
    <section *ngIf="view==='detail'&&selected">
        <div class="ticket-head panel">
        <div>
          <span [class]="'status status-'+selected.status.toLowerCase()">{{status(selected.status)}}</span>
          <h2>{{selected.title}}</h2>
          <p><span class="ltr">{{selected.trackingNumber}}</span> · {{selected.product.name}} · {{selected.department.name}}</p>
          <p class="muted" *ngIf="selected.rootCause">علت: {{selected.rootCause.name}}</p>
        </div>
        <b *ngIf="selected.pbiIdentifier" class="ltr">{{selected.pbiIdentifier}} / {{selected.probableFixedVersion}}</b>
      </div>
      <div class="grid-detail">
        <section class="panel conversation">
          <h2>گفت‌وگو</h2>
          <article *ngFor="let m of selected.messages" [class.mine]="m.author.id===user.id">
            <div><b>{{m.author.displayName}}</b><small>{{m.createdAt|date:'yyyy/MM/dd، HH:mm'}}</small></div>
            <p>{{m.body}}</p>
          </article>
          <div class="empty" *ngIf="!selected.messages.length">پیامی ثبت نشده.</div>
          <div class="reply-bank" *ngIf="replyTemplates.length">
            <div class="reply-bank-head">
              <p class="eyebrow">پاسخ‌های آماده</p>
              <span class="count">یک‌کلیک برای پر کردن متن</span>
            </div>
            <div class="reply-bank-grid">
              <button type="button" *ngFor="let template of replyTemplates" (click)="applyReplyTemplate(template)">
                {{template.label}}
              </button>
            </div>
          </div>
          <label *ngIf="canWriteMessage"><textarea [(ngModel)]="action.message" rows="3" placeholder="متن پیام داخلی..."></textarea></label>
          <button class="primary" *ngIf="canReply" (click)="act('REPLY')">ارسال پاسخ</button>
          <button class="primary" *ngIf="canDeveloperReply" (click)="act('COMPLETE_DEVELOPMENT')" [disabled]="!canConfirmDevelopment">ثبت و ارسال به پشتیبانی</button>
        </section>
        <aside class="panel actions-panel">
          <h2>اقدامات مجاز</h2>
          <button *ngIf="(user.role==='SUPPORT'||user.role==='SALES')&&(selected.status==='NEW'||selected.status==='RETURNED_TO_SUPPORT')" (click)="act('OPEN')">باز کردن تیکت</button>
          <button *ngIf="user.role==='TEST'&&selected.status==='REFERRED_TO_TEST'" (click)="act('OPEN_TEST')">شروع بررسی تست</button>

          <ng-container *ngIf="(user.role==='SUPPORT'||user.role==='SALES')&&(selected.status==='IN_REVIEW'||selected.status==='AWAITING_EXPERT'||selected.status==='RETURNED_TO_SUPPORT')">
            <label>علت ریشه‌ای<select [(ngModel)]="action.rootCauseId"><option value="">انتخاب کنید</option><option *ngFor="let x of master.rootCauses" [value]="x.id">{{x.name}}</option></select></label>
            <button class="primary" (click)="act('RESOLVE')">اعلام راه‌حل</button>
            <button class="warning" (click)="act('REFER_TEST')">ارجاع به تیم تست</button>
          </ng-container>

          <ng-container *ngIf="user.role==='TEST'&&(selected.status==='TEST_IN_REVIEW'||selected.status==='AWAITING_EXPERT')">
            <button class="secondary" (click)="act('RETURN_SUPPORT')">ارسال به پشتیبانی</button>
            <div class="action-divider"><span>تأیید نیاز به توسعه</span></div>
            <label class="pbi-group"><span>PBI-</span><input [(ngModel)]="action.pbiNumber" class="ltr" placeholder="XXXX" maxlength="20"></label>
            <label>نسخه احتمالی رفع<input [(ngModel)]="action.probableFixedVersion" class="ltr" placeholder="3.4.0"></label>
            <button class="warning" [disabled]="!canConfirmDevelopment" (click)="act('CONFIRM_DEVELOPMENT')">ثبت و ارجاع به توسعه</button>
          </ng-container>

          <ng-container *ngIf="user.role==='DEVELOPER'&&selected.status==='CLOSED_REQUIRES_DEVELOPMENT'">
            <label class="pbi-group"><span>PBI-</span><input [(ngModel)]="action.pbiNumber" class="ltr" placeholder="XXXX" maxlength="20"></label>
            <label>نسخه احتمالی رفع<input [(ngModel)]="action.probableFixedVersion" class="ltr" placeholder="3.4.0"></label>
            <label>متن پاسخ<textarea [(ngModel)]="action.message" rows="4" placeholder="متن پاسخ یا درخواست اطلاعات تکمیلی..."></textarea></label>
            <button class="primary" (click)="act('COMPLETE_DEVELOPMENT')">ارسال به پشتیبانی پس از توسعه</button>
          </ng-container>

          <button class="primary" *ngIf="user.role==='CUSTOMER'&&selected.status!=='CLOSED_RESOLVED'" (click)="act('CONFIRM')">تأیید حل مشکل</button>

          <div class="rating" *ngIf="user.role==='CUSTOMER'&&selected.status==='CLOSED_RESOLVED'">
            <p class="eyebrow">امتیازدهی</p>
            <button *ngFor="let r of [1,2,3,4,5]" (click)="rate(r)" [class.rated]="selected.rating&&r<=selected.rating">★</button>
            <p class="muted" *ngIf="selected.rating">امتیاز: {{selected.rating}} از ۵</p>
          </div>

          <div class="dev-info" *ngIf="selected.pbiIdentifier">
            <p class="eyebrow">اطلاعات توسعه</p>
            <p>شناسه PBI: <span class="ltr">{{selected.pbiIdentifier}}</span></p>
            <p>نسخه رفع احتمالی: <span class="ltr">{{selected.probableFixedVersion}}</span></p>
            <p class="muted">این تیکت برای توسعه به واحد IT واگذار شده و پس از بررسی مشتری بسته می‌شود.</p>
          </div>

          <!-- HISTORY -->
          <div class="history" *ngIf="selected.history&&selected.history.length">
            <h2>تاریخچه</h2>
            <div *ngFor="let h of selected.history" class="history-entry">
              <small>{{h.createdAt|date:'yyyy/MM/dd، HH:mm'}}</small>
              <p><b>{{h.actor.displayName}}</b> {{status(h.to)}} <span *ngIf="h.from">از {{status(h.from)}}</span></p>
              <p class="muted" *ngIf="h.note">{{actionLabel(h.note)}}</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </section>
</div>
</main>

<!-- TABLE TEMPLATE -->
<ng-template #table let-list="list">
  <div class="table">
    <button class="row" *ngFor="let t of list||tickets; trackBy: trackById" (click)="open(t)">
      <span><b>{{t.title}}</b><small>{{t.trackingNumber}}</small></span>
      <span>{{t.product.name}}</span>
      <span>{{t.department.name}}</span>
      <span [class]="'status status-'+t.status.toLowerCase()">{{status(t.status)}}</span>
    </button>
    <div class="empty" *ngIf="!(list||tickets).length">موردی وجود ندارد.</div>
  </div>
</ng-template>` })
class AppComponent implements OnInit, OnDestroy {
  private api = 'http://localhost:3000/api/v1';
  dark = false;
  accounts: Account[] = [];
  user: Account | undefined;
  tickets: Ticket[] = [];
  selected: Ticket | undefined;
  metrics: Metrics = { total: 0, open: 0, resolved: 0, development: 0, averageFirstResponseHours: '0', byProduct: [], byDepartment: [], recent: [] };
  master: Master = { employers: [], products: [], departments: [], rootCauses: [], faqs: [] };
  allDepartments: Named[] = [];
  questionTemplates = questionTemplates;
  view = 'dashboard';
  error = '';
  notice = '';
  loading = false;
  loadingAccounts = false;
  outsideHours = false;
  today = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(new Date());
  draft = { employerId: '', productId: '', departmentId: '', title: '', description: '', faqId: '' };
  action = { message: '', rootCauseId: '', pbiIdentifier: '', pbiNumber: '', probableFixedVersion: '' };
  filter = { productId: '', departmentId: '', dateFrom: '', dateTo: '' };
  searchQuery = '';
  filteredTickets: Ticket[] = [];
  busyAction = false;
  private readonly popStateHandler = (event: PopStateEvent) => void this.navigateState(event.state as NavigationState | null);

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.dark = this.readThemePreference();
    this.applyTheme();
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('popstate', this.popStateHandler);
    }
    void this.loadAccounts();
  }

  ngOnDestroy() {
    if (typeof window !== 'undefined') window.removeEventListener('popstate', this.popStateHandler);
  }

  toggleTheme() {
    this.dark = !this.dark;
    this.applyTheme();
  }

  private readThemePreference(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem('tadkar-theme') === 'dark';
  }

  private applyTheme() {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', this.dark);
    document.body.classList.toggle('dark', this.dark);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('tadkar-theme', this.dark ? 'dark' : 'light');
    }
  }

  private async loadAccounts() {
    try {
      this.loadingAccounts = true;
      this.accounts = await firstValueFrom(this.http.get<Account[]>(`${this.api}/demo/accounts`));
    } catch { this.error = 'اتصال به API برقرار نشد.'; } finally { this.loadingAccounts = false; this.cdr.markForCheck(); }
  }

  async login(a: Account) {
    try {
      this.error = '';
      this.loading = true;
      this.user = await firstValueFrom(this.http.post<Account>(`${this.api}/demo/login`, { userId: a.id }));
      const m = await firstValueFrom(this.http.get<Master>(`${this.api}/master-data`));
      this.master = m;
      this.allDepartments = [...m.departments, { id: 'test-dept', name: 'تست نرم‌افزار' }];
      const wh = await firstValueFrom(this.http.get<{ isWorkingHours: boolean }>(`${this.api}/working-hours`));
      this.outsideHours = !wh.isWorkingHours;
      await this.dashboard(false);
      this.replaceState({ view: 'dashboard' });
    } catch { this.error = 'ورود ناموفق بود.'; } finally { this.loading = false; this.cdr.markForCheck(); }
  }

  logout() { this.user = undefined; this.tickets = []; this.selected = undefined; this.metrics = { total: 0, open: 0, resolved: 0, development: 0, averageFirstResponseHours: '0', byProduct: [], byDepartment: [], recent: [] }; this.cdr.markForCheck(); }

  role(r: string) { return ({ CUSTOMER: 'مشتری', SUPPORT: 'کارشناس پشتیبانی', TEST: 'کارشناس تست', MANAGER: 'مدیر', SALES: 'کارشناس فروش', DEVELOPER: 'کارشناس IT / توسعه' } as Record<string, string>)[r] || r; }
  status(s: string) { return labels[s] || s; }
  trackById(_: number, item: { id: string }) { return item.id; }
  barWidth(count: number, total: number) { return total > 0 ? (count / total) * 100 : 0; }

  actionLabel(note: string): string {
    const map: Record<string, string> = { OPEN: 'باز کردن', OPEN_TEST: 'شروع بررسی تست', REPLY: 'ارسال پاسخ', CONFIRM: 'تأیید حل', REFER_TEST: 'ارجاع به تست', RETURN_SUPPORT: 'بازگشت به پشتیبانی', CONFIRM_DEVELOPMENT: 'تأیید نیاز توسعه', RESOLVE: 'اعلام راه‌حل', RATE: 'امتیازدهی', REFER_SUPPORT: 'ارجاع به پشتیبانی', REFER_SALES: 'ارجاع به واحد فروش', REFER_DEVELOPMENT: 'ارجاع به واحد توسعه', COMPLETE_DEVELOPMENT: 'ارسال به پشتیبانی پس از توسعه' };
    return map[note] || note;
  }

  get title() {
    return this.view === 'new' ? 'ثبت تیکت جدید' : this.view === 'detail' ? 'جزئیات تیکت' : this.view === 'tickets' ? this.queue : this.user?.role === 'MANAGER' ? 'داشبورد مدیریتی' : `سلام، ${this.user?.displayName}`;
  }
  get queue() { return this.user?.role === 'CUSTOMER' ? 'تیکت‌های من' : this.user?.role === 'TEST' ? 'صف بررسی تست' : this.user?.role === 'SALES' ? 'تیکت‌های فروش' : this.user?.role === 'DEVELOPER' ? 'تیکت‌های توسعه' : 'صف کارشناسی'; }
  get openCount() { return this.tickets.filter(t => t.status !== 'CLOSED_RESOLVED').length; }
  get canCreate() { return Boolean(this.draft.employerId && this.draft.productId && this.draft.departmentId && this.draft.title.trim() && this.draft.description.trim()); }
  get canConfirmDevelopment() { return Boolean(this.action.pbiNumber.trim() && this.action.probableFixedVersion.trim()); }
  get canReply() {
    if (!this.selected) return false;
    if (this.user?.role === 'CUSTOMER') return this.selected.status === 'AWAITING_CUSTOMER';
    return (this.user?.role === 'SUPPORT' || this.user?.role === 'SALES') && ['IN_REVIEW', 'AWAITING_EXPERT', 'TEST_IN_REVIEW'].includes(this.selected.status);
  }
  get canDeveloperReply() {
    return this.user?.role === 'DEVELOPER' && this.selected?.status === 'CLOSED_REQUIRES_DEVELOPMENT';
  }
  get replyTemplates(): ReplyTemplate[] {
    if (!this.selected || !this.user) return [];
    const templates = replyTemplates[this.user.role] || [];
    if (this.user.role === 'CUSTOMER') return this.selected.status === 'AWAITING_CUSTOMER' ? templates : [];
    if (this.user.role === 'SUPPORT' || this.user.role === 'SALES') return ['IN_REVIEW', 'AWAITING_EXPERT', 'TEST_IN_REVIEW'].includes(this.selected.status) ? templates : [];
    if (this.user.role === 'TEST') return ['TEST_IN_REVIEW', 'AWAITING_EXPERT'].includes(this.selected.status) ? templates : [];
    if (this.user.role === 'DEVELOPER') return this.selected.status === 'CLOSED_REQUIRES_DEVELOPMENT' ? templates : [];
    return templates;
  }
  get canWriteMessage() {
    return this.canReply || this.canDeveloperReply || (this.user?.role === 'TEST' && this.selected && ['TEST_IN_REVIEW', 'AWAITING_EXPERT'].includes(this.selected.status));
  }

  async dashboard(pushHistory = true) {
    this.clear(); this.view = 'dashboard'; this.loading = true;
    try {
      if (this.user?.role === 'MANAGER') {
        this.metrics = await firstValueFrom(this.http.get<Metrics>(`${this.api}/manager/metrics?userId=${this.user.id}`));
        await this.loadMetrics();
      } else {
        await this.load();
      }
      if (pushHistory) this.pushState({ view: 'dashboard' });
    } finally { this.loading = false; this.cdr.markForCheck(); }
  }

  async loadMetrics() {
    if (!this.user) return;
    const params = new URLSearchParams({ userId: this.user.id });
    Object.entries(this.filter).forEach(([key, value]) => { if (value) params.set(key, value); });
    this.metrics = await firstValueFrom(this.http.get<Metrics>(`${this.api}/manager/metrics?${params}`));
    this.cdr.markForCheck();
  }

  newTicket(pushHistory = true) {
    this.view = 'new';
    this.clear();
    this.draft = {
      employerId: this.master.employers[0]?.id || '',
      productId: this.master.products[0]?.id || '',
      departmentId: this.master.departments[0]?.id || '',
      title: '',
      description: '',
      faqId: ''
    };
    this.cdr.markForCheck();
    void this.faqs();
    if (pushHistory) this.pushState({ view: 'new' });
  }

  async list(pushHistory = true) { this.clear(); this.view = 'tickets'; await this.load(); if (pushHistory) this.pushState({ view: 'tickets' }); }
  async load() {
    this.loading = true;
    try {
      this.tickets = await firstValueFrom(this.http.get<Ticket[]>(`${this.api}/tickets?userId=${this.user!.id}`));
      this.updateFilteredTickets();
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async open(t: Ticket, pushHistory = true) {
    this.loading = true;
    try {
      this.selected = await firstValueFrom(this.http.get<Ticket>(`${this.api}/tickets/${t.id}?userId=${this.user!.id}`));
      this.view = 'detail';
      this.clear();
      if (pushHistory) this.pushState({ view: 'detail', ticketId: t.id });
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async openById(id: string, pushHistory = true) {
    this.loading = true;
    try {
      this.selected = await firstValueFrom(this.http.get<Ticket>(`${this.api}/tickets/${id}?userId=${this.user!.id}`));
      this.view = 'detail';
      this.clear();
      if (pushHistory) this.pushState({ view: 'detail', ticketId: id });
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  updateFilteredTickets() {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredTickets = this.tickets;
      return;
    }
    this.filteredTickets = this.tickets.filter((ticket) =>
      ticket.title.toLowerCase().includes(query)
      || ticket.trackingNumber.toLowerCase().includes(query)
      || ticket.product.name.toLowerCase().includes(query)
      || ticket.department.name.toLowerCase().includes(query)
    );
  }

  applyReplyTemplate(template: ReplyTemplate) {
    this.action.message = template.text;
    this.cdr.markForCheck();
  }

  applyQuestionTemplate(template: QuestionTemplate) {
    this.draft.title = template.title;
    this.draft.description = template.description;
    this.cdr.markForCheck();
  }


  async faqs() {
    const x = await firstValueFrom(this.http.get<Master>(`${this.api}/master-data?productId=${this.draft.productId}&departmentId=${this.draft.departmentId}`));
    this.master = { ...this.master, faqs: x.faqs };
    this.cdr.markForCheck();
  }

  private pushState(state: Record<string, unknown>) {
    if (typeof window !== 'undefined' && window.history && window.history.pushState) {
      window.history.pushState(state, '', '');
    }
  }

  private replaceState(state: Record<string, unknown>) {
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      window.history.replaceState(state, '', '');
    }
  }

  private async navigateState(state: NavigationState | null) {
    if (!state || !state.view) state = { view: 'dashboard' };
    if (state.view === 'detail' && state.ticketId) {
      await this.openById(String(state.ticketId), false);
    } else if (state.view === 'tickets') {
      await this.list(false);
    } else if (state.view === 'new') {
      this.newTicket(false);
    } else {
      await this.dashboard(false);
    }
  }

  async create() {
    if (!this.canCreate || this.busyAction) return;
    try {
      this.busyAction = true;
      this.clear();
      const t = await firstValueFrom(this.http.post<Ticket>(`${this.api}/tickets`, { ...this.draft, userId: this.user!.id }));
      await this.open(t);
      this.notice = `تیکت ${t.trackingNumber} ثبت شد.`;
    } catch (e) { this.fail(e); } finally { this.busyAction = false; }
    this.cdr.markForCheck();
  }

  async act(kind: string) {
    try {
      if ((kind === 'CONFIRM_DEVELOPMENT' || kind === 'COMPLETE_DEVELOPMENT') && this.action.pbiNumber?.trim()) {
        this.action.pbiIdentifier = `PBI-${this.action.pbiNumber.trim().replace(/^PBI-?/i, '')}`;
      }
      this.selected = await firstValueFrom(this.http.post<Ticket>(`${this.api}/tickets/${this.selected!.id}/actions`, { ...this.action, action: kind, userId: this.user!.id }));
      this.notice = 'اقدام ثبت شد.';
      if (kind === 'CONFIRM_DEVELOPMENT' || kind === 'COMPLETE_DEVELOPMENT') this.action.pbiNumber = '';
      this.action.message = '';
    } catch (e) { this.fail(e); }
    this.cdr.markForCheck();
  }

  rate(r: number) { void this.rateAsync(r); }
  private async rateAsync(r: number) {
    this.selected = await firstValueFrom(this.http.post<Ticket>(`${this.api}/tickets/${this.selected!.id}/actions`, { userId: this.user!.id, action: 'RATE', rating: r }));
    this.notice = 'امتیاز ثبت شد.';
    this.cdr.markForCheck();
  }

  clear() { this.error = ''; this.notice = ''; }
  private fail(e: unknown) { this.error = (e as { error?: { message?: string } }).error?.message || 'انجام عملیات ممکن نشد.'; }
}

bootstrapApplication(AppComponent, { providers: [provideHttpClient()] }).catch(console.error);
