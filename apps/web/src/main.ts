import { Component, computed, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, RouterOutlet } from '@angular/router';

type Locale = 'fa' | 'en';
const copy = {
  fa: {
    title: 'تادکار',
    dashboard: 'داشبورد',
    tasks: 'کارها',
    forms: 'فرم‌ها',
    profile: 'پروفایل',
    logout: 'خروج',
    skip: 'رفتن به محتوای اصلی',
  },
  en: {
    title: 'Tadkar',
    dashboard: 'Dashboard',
    tasks: 'Tasks',
    forms: 'Forms',
    profile: 'Profile',
    logout: 'Log out',
    skip: 'Skip to main content',
  },
} as const;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: ` <a class="skip" href="#content">{{ text().skip }}</a>
    <div class="shell" [attr.dir]="locale() === 'fa' ? 'rtl' : 'ltr'" [class.dark]="dark()">
      <header>
        <strong>{{ text().title }}</strong>
        <div class="actions">
          <button type="button" (click)="toggleLocale()">
            {{ locale() === 'fa' ? 'EN' : 'فا' }}</button
          ><button type="button" (click)="dark.set(!dark())" aria-label="Toggle theme">◐</button
          ><button type="button">{{ text().profile }}</button>
        </div>
      </header>
      <aside aria-label="Primary">
        <nav>
          <a href="/">{{ text().dashboard }}</a
          ><a href="/tasks">{{ text().tasks }}</a
          ><a href="/forms">{{ text().forms }}</a>
        </nav>
      </aside>
      <main id="content" tabindex="-1">
        <h1>{{ text().dashboard }}</h1>
        <section class="cards" aria-label="Summary">
          <article>
            <b>0</b><span>{{ text().tasks }}</span>
          </article>
          <article>
            <b>0</b><span>{{ text().forms }}</span>
          </article>
        </section>
        <router-outlet />
      </main>
    </div>`,
})
class AppComponent {
  readonly locale = signal<Locale>('fa');
  readonly dark = signal(false);
  readonly text = computed(() => copy[this.locale()]);
  toggleLocale(): void {
    this.locale.update((value) => (value === 'fa' ? 'en' : 'fa'));
    document.documentElement.lang = this.locale();
    document.documentElement.dir = this.locale() === 'fa' ? 'rtl' : 'ltr';
  }
}

bootstrapApplication(AppComponent, { providers: [provideRouter([])] }).catch((error: unknown) =>
  console.error(error),
);
