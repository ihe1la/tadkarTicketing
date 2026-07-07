import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Module,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  Prisma,
  Role,
  TicketStatus,
  type Ticket,
  type User,
} from '@prisma/client';

import { LocalEmployeeAuthAdapter } from './adapters/employee-auth.adapter.js';
import { FakeTfsAdapter } from './adapters/tfs.adapter.js';
import { PrismaService } from './prisma.service.js';

const includeTicket = {
  customer: true,
  employer: true,
  product: true,
  department: true,
  rootCause: true,
  messages: {
    include: { author: true },
    orderBy: { createdAt: 'asc' as const },
  },
  history: {
    include: { actor: true },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.TicketInclude;

const closed: TicketStatus[] = [
  TicketStatus.CLOSED_RESOLVED,
  TicketStatus.CLOSED_REQUIRES_DEVELOPMENT,
];

type TicketWithRelations = Prisma.TicketGetPayload<{
  include: typeof includeTicket;
}>;

type MetricTicket = Prisma.TicketGetPayload<{
  include: {
    product: true;
    department: true;
  };
}>;

function isWorkingHours(): boolean {
  const now = new Date();

  const iranMinutes =
    (now.getUTCHours() * 60 + now.getUTCMinutes() + 3 * 60 + 30) %
    (24 * 60);

  const iranDate = new Date(now.getTime() + 3.5 * 60 * 60 * 1000);
  const day = iranDate.getUTCDay();

  const workStart = 8 * 60;
  const workEnd = 17 * 60;

  return day >= 1 && day <= 5 && iranMinutes >= workStart && iranMinutes < workEnd;
}

@Controller()
class PrototypeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: LocalEmployeeAuthAdapter,
    private readonly tfs: FakeTfsAdapter,
  ) {}

  @Get('health')
  health(): { status: string; service: string } {
    return {
      status: 'ok',
      service: 'tadkar-prototype',
    };
  }

  @Get('demo/accounts')
  accounts() {
    return this.auth.demoAccounts();
  }

  @Post('demo/login')
  login(@Body('userId') userId: string) {
    return this.auth.login(userId);
  }

  @Get('working-hours')
  workingHours(): { isWorkingHours: boolean } {
    return {
      isWorkingHours: isWorkingHours(),
    };
  }

  @Get('master-data')
  async masterData(
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return {
      employers: await this.prisma.employer.findMany(),
      products: await this.prisma.product.findMany(),
      departments: await this.prisma.department.findMany({
        where: {
          id: {
            in: ['sales', 'support-dept', 'dev-dept'],
          },
        },
      }),
      rootCauses: await this.prisma.rootCause.findMany(),
      faqs: await this.prisma.faq.findMany({
        where: {
          ...(productId ? { productId } : {}),
          ...(departmentId ? { departmentId } : {}),
        },
        orderBy: {
          usageCount: 'desc',
        },
      }),
    };
  }

  @Get('tickets')
  async tickets(@Query('userId') userId: string) {
    const user = await this.user(userId);

    const where: Prisma.TicketWhereInput =
      user.role === Role.CUSTOMER
        ? { customerId: user.id }
        : user.role === Role.SUPPORT
          ? { departmentId: { in: ['sales', 'support-dept'] } }
          : user.role === Role.TEST
            ? {
                OR: [
                  {
                    departmentId: 'test-dept',
                    status: {
                      in: [
                        TicketStatus.REFERRED_TO_TEST,
                        TicketStatus.TEST_IN_REVIEW,
                      ],
                    },
                  },
                  {
                    departmentId: 'test-dept',
                    status: TicketStatus.AWAITING_EXPERT,
                  },
                ],
              }
            : user.role === Role.SALES
              ? { departmentId: 'sales' }
              : user.role === Role.DEVELOPER
                ? {
                    OR: [
                      {
                        status: TicketStatus.CLOSED_REQUIRES_DEVELOPMENT,
                      },
                      {
                        pbiIdentifier: {
                          not: null,
                        },
                      },
                    ],
                  }
                : {};

    return this.prisma.ticket.findMany({
      where,
      include: includeTicket,
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  @Get('tickets/:id')
  async ticket(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ): Promise<TicketWithRelations> {
    const user = await this.user(userId);
    const ticket = await this.getTicket(id);

    this.assertVisible(user, ticket);

    return ticket;
  }

  @Post('tickets')
  async create(
    @Body()
    body: {
      userId: string;
      employerId: string;
      productId: string;
      departmentId: string;
      title: string;
      description: string;
      faqId?: string;
    },
  ): Promise<TicketWithRelations> {
    const user = await this.user(body.userId);

    if (user.role !== Role.CUSTOMER) {
      throw new ForbiddenException('فقط مشتری می‌تواند تیکت ثبت کند.');
    }

    if (!['sales', 'support-dept'].includes(body.departmentId)) {
      throw new BadRequestException('واحد انتخاب‌شده مجاز نیست.');
    }

    if (!body.title?.trim() || !body.description?.trim()) {
      throw new BadRequestException('عنوان و شرح الزامی است.');
    }

    const trackingNumber = `TDK-1405-${String(
      (await this.prisma.ticket.count()) + 1,
    ).padStart(4, '0')}`;

    const ticket = await this.prisma.ticket.create({
      data: {
        trackingNumber,
        title: body.title.trim(),
        description: body.description.trim(),
        customerId: user.id,
        employerId: body.employerId,
        productId: body.productId,
        departmentId: body.departmentId,
        messages: {
          create: {
            authorId: user.id,
            body: body.description.trim(),
          },
        },
        history: {
          create: {
            actorId: user.id,
            to: TicketStatus.NEW,
            note: 'ثبت تیکت',
          },
        },
      },
      include: includeTicket,
    });

    if (body.faqId) {
      await this.prisma.faq.update({
        where: {
          id: body.faqId,
        },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      });
    }

    return ticket;
  }

  @Post('tickets/:id/actions')
  async action(
    @Param('id') id: string,
    @Body()
    body: {
      userId: string;
      action: string;
      message?: string;
      rootCauseId?: string;
      pbiIdentifier?: string;
      probableFixedVersion?: string;
      rating?: number;
    },
  ): Promise<TicketWithRelations> {
    const user = await this.user(body.userId);
    const ticket = await this.getTicket(id);

    this.assertVisible(user, ticket);

    if (closed.includes(ticket.status) && body.action !== 'RATE') {
      throw new BadRequestException('تیکت بسته است.');
    }

    let next: TicketStatus | undefined;
    let departmentId: string | undefined;

    const data: Prisma.TicketUpdateInput = {};

    if (
      body.action === 'OPEN' &&
      (user.role === Role.SUPPORT || user.role === Role.SALES) &&
      ([TicketStatus.NEW, TicketStatus.RETURNED_TO_SUPPORT] as TicketStatus[]).includes(ticket.status)
    ) {
      next = TicketStatus.IN_REVIEW;
    } else if (
      body.action === 'OPEN_TEST' &&
      user.role === Role.TEST &&
      ticket.status === TicketStatus.REFERRED_TO_TEST
    ) {
      next = TicketStatus.TEST_IN_REVIEW;
    } else if (
      body.action === 'REPLY' &&
      user.role === Role.CUSTOMER &&
      ticket.status === TicketStatus.AWAITING_CUSTOMER
    ) {
      next = TicketStatus.AWAITING_EXPERT;
    } else if (
      body.action === 'REPLY' &&
      ([Role.SUPPORT, Role.TEST, Role.SALES, Role.DEVELOPER] as Role[]).includes(user.role) &&
      ([
        TicketStatus.IN_REVIEW,
        TicketStatus.AWAITING_EXPERT,
        TicketStatus.TEST_IN_REVIEW,
      ] as TicketStatus[]).includes(ticket.status)
    ) {
      next = TicketStatus.AWAITING_CUSTOMER;
    } else if (
      body.action === 'CONFIRM' &&
      user.role === Role.CUSTOMER &&
      ticket.status === TicketStatus.AWAITING_CUSTOMER
    ) {
      next = TicketStatus.CLOSED_RESOLVED;
    } else if (
      body.action === 'REFER_TEST' &&
      (user.role === Role.SUPPORT || user.role === Role.SALES) &&
      ([TicketStatus.IN_REVIEW, TicketStatus.AWAITING_EXPERT] as TicketStatus[]).includes(ticket.status)
    ) {
      next = TicketStatus.REFERRED_TO_TEST;
      departmentId = 'test-dept';
    } else if (
      body.action === 'RETURN_SUPPORT' &&
      user.role === Role.TEST &&
      ([TicketStatus.TEST_IN_REVIEW, TicketStatus.AWAITING_EXPERT] as TicketStatus[]).includes(
        ticket.status,
      ) &&
      ticket.departmentId === 'test-dept'
    ) {
      next = TicketStatus.RETURNED_TO_SUPPORT;
      departmentId = 'support-dept';
    } else if (
      body.action === 'CONFIRM_DEVELOPMENT' &&
      user.role === Role.TEST &&
      ([TicketStatus.TEST_IN_REVIEW, TicketStatus.AWAITING_EXPERT] as TicketStatus[]).includes(
        ticket.status,
      ) &&
      ticket.departmentId === 'test-dept'
    ) {
      if (!body.probableFixedVersion?.trim()) {
        throw new BadRequestException('نسخه احتمالی رفع الزامی است.');
      }

      next = TicketStatus.CLOSED_REQUIRES_DEVELOPMENT;
      data.pbiIdentifier = this.tfs.normalizePbi(body.pbiIdentifier);
      data.probableFixedVersion = body.probableFixedVersion.trim();
    } else if (
      body.action === 'RESOLVE' &&
      (user.role === Role.SUPPORT || user.role === Role.SALES) &&
      ([TicketStatus.IN_REVIEW, TicketStatus.AWAITING_EXPERT] as TicketStatus[]).includes(ticket.status)
    ) {
      if (!body.rootCauseId) {
        throw new BadRequestException('دسته‌بندی علت ریشه‌ای الزامی است.');
      }

      next = TicketStatus.AWAITING_CUSTOMER;
      data.rootCause = {
        connect: {
          id: body.rootCauseId,
        },
      };
    } else if (
      body.action === 'RATE' &&
      user.role === Role.CUSTOMER &&
      ticket.status === TicketStatus.CLOSED_RESOLVED &&
      typeof body.rating === 'number' &&
      body.rating >= 1 &&
      body.rating <= 5
    ) {
      data.rating = body.rating;
    } else {
      throw new ForbiddenException(
        'این اقدام برای نقش یا وضعیت فعلی مجاز نیست.',
      );
    }

    if (body.message?.trim() && body.action !== 'RATE') {
      await this.prisma.ticketMessage.create({
        data: {
          ticketId: id,
          authorId: user.id,
          body: body.message.trim(),
        },
      });
    }

    if (next) {
      data.status = next;

      if (departmentId) {
        data.department = {
          connect: {
            id: departmentId,
          },
        };
      }

      if (!ticket.firstResponseAt && user.role !== Role.CUSTOMER) {
        data.firstResponseAt = new Date();
      }

      await this.prisma.statusHistory.create({
        data: {
          ticketId: id,
          actorId: user.id,
          from: ticket.status,
          to: next,
          note: body.action,
        },
      });
    }

    return this.prisma.ticket.update({
      where: {
        id,
      },
      data,
      include: includeTicket,
    });
  }

  @Get('manager/metrics')
  async metrics(
    @Query('userId') userId: string,
    @Query('productId') productId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const user = await this.user(userId);

    if (user.role !== Role.MANAGER) {
      throw new ForbiddenException();
    }

    const where: Prisma.TicketWhereInput = {};

    if (productId) {
      where.productId = productId;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (dateFrom || dateTo) {
      const createdAt: Prisma.DateTimeFilter = {};

      if (dateFrom) {
        const parsedFrom = new Date(dateFrom);

        if (Number.isNaN(parsedFrom.getTime())) {
          throw new BadRequestException('تاریخ شروع نامعتبر است.');
        }

        createdAt.gte = parsedFrom;
      }

      if (dateTo) {
        const parsedTo = new Date(dateTo);

        if (Number.isNaN(parsedTo.getTime())) {
          throw new BadRequestException('تاریخ پایان نامعتبر است.');
        }

        createdAt.lte = parsedTo;
      }

      where.createdAt = createdAt;
    }

    const tickets: MetricTicket[] = await this.prisma.ticket.findMany({
      where,
      include: {
        product: true,
        department: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const grouped = (
      key: 'product' | 'department',
    ): Array<{ name: string; count: number }> => {
      const result = tickets.reduce<
        Record<string, { name: string; count: number }>
      >((acc, ticket) => {
        const name = ticket[key].name;

        acc[name] = {
          name,
          count: (acc[name]?.count ?? 0) + 1,
        };

        return acc;
      }, {});

      return Object.values(result);
    };

    const responseHours: number[] = tickets
      .filter(
        (
          ticket,
        ): ticket is MetricTicket & {
          firstResponseAt: Date;
        } => ticket.firstResponseAt !== null,
      )
      .map(
        (ticket) =>
          (ticket.firstResponseAt.getTime() - ticket.createdAt.getTime()) /
          3_600_000,
      );

    const averageFirstResponseHours =
      responseHours.length > 0
        ? Math.max(
            0,
            responseHours.reduce(
              (total: number, hours: number) => total + hours,
              0,
            ) / responseHours.length,
          ).toFixed(1)
        : '0';

    return {
      total: tickets.length,
      open: tickets.filter((ticket) => !closed.includes(ticket.status)).length,
      resolved: tickets.filter(
        (ticket) => ticket.status === TicketStatus.CLOSED_RESOLVED,
      ).length,
      development: tickets.filter(
        (ticket) =>
          ticket.status === TicketStatus.CLOSED_REQUIRES_DEVELOPMENT,
      ).length,
      averageFirstResponseHours,
      byProduct: grouped('product'),
      byDepartment: grouped('department'),
      recent: tickets.slice(0, 6),
    };
  }

  private async user(id: string): Promise<User> {
    if (!id) {
      throw new BadRequestException('کاربر مشخص نشده است.');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد.');
    }

    return user;
  }

  private async getTicket(id: string): Promise<TicketWithRelations> {
    const ticket = await this.prisma.ticket.findUnique({
      where: {
        id,
      },
      include: includeTicket,
    });

    if (!ticket) {
      throw new NotFoundException('تیکت یافت نشد.');
    }

    return ticket;
  }

  private assertVisible(user: User, ticket: Ticket): void {
    if (user.role === Role.CUSTOMER && ticket.customerId !== user.id) {
      throw new ForbiddenException();
    }

    if (
      user.role === Role.TEST &&
      ticket.departmentId !== 'test-dept' &&
      ([
        TicketStatus.AWAITING_EXPERT,
        TicketStatus.CLOSED_REQUIRES_DEVELOPMENT,
      ] as TicketStatus[]).includes(ticket.status) === false
    ) {
      throw new ForbiddenException();
    }

    if (user.role === Role.SALES && ticket.departmentId !== 'sales') {
      throw new ForbiddenException();
    }

    if (
      user.role === Role.DEVELOPER &&
      ticket.status !== TicketStatus.CLOSED_REQUIRES_DEVELOPMENT &&
      !ticket.pbiIdentifier
    ) {
      throw new ForbiddenException();
    }
  }
}

@Module({
  controllers: [PrototypeController],
  providers: [PrismaService, LocalEmployeeAuthAdapter, FakeTfsAdapter],
})
export class AppModule {}
