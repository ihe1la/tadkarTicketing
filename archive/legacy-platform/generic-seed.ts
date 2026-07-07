import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';
const prisma = new PrismaClient();
const main = async (): Promise<void> => {
  for (const key of ['*', 'submission:create', 'submission:read', 'task:read'])
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: {},
    create: { name: 'Administrator' },
  });
  const userRole = await prisma.role.upsert({
    where: { name: 'User' },
    update: {},
    create: { name: 'User' },
  });
  const adminPermission = await prisma.permission.findUniqueOrThrow({ where: { key: '*' } });
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: adminRole.id, permissionId: adminPermission.id } },
    update: {},
    create: { roleId: adminRole.id, permissionId: adminPermission.id },
  });
  const passwordHash = await hash(process.env['SEED_PASSWORD'] ?? 'LocalOnly-ChangeMe-2026!', {
    type: 2,
  });
  for (const account of [
    { username: 'admin', displayName: 'Local Administrator', roleId: adminRole.id },
    { username: 'user', displayName: 'Local User', roleId: userRole.id },
  ]) {
    const user = await prisma.user.upsert({
      where: { username: account.username },
      update: {},
      create: { username: account.username, displayName: account.displayName, passwordHash },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: account.roleId } },
      update: {},
      create: { userId: user.id, roleId: account.roleId },
    });
  }
};
main().finally(async () => prisma.$disconnect());
