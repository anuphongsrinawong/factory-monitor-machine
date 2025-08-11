import { PrismaClient, Role, DeviceType, DataType, AccessType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const engineerPassword = await bcrypt.hash('Engineer@123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', name: 'Admin', password: adminPassword, role: Role.ADMIN },
  });

  await prisma.user.upsert({
    where: { email: 'engineer@example.com' },
    update: {},
    create: { email: 'engineer@example.com', name: 'Engineer', password: engineerPassword, role: Role.ENGINEER },
  });

  const kuka = await prisma.device.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'KUKA Robot 1', type: DeviceType.KUKA, status: 'ONLINE' },
  });

  const melsec = await prisma.device.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: 'Mitsubishi Line A', type: DeviceType.MITSUBISHI, status: 'ONLINE' },
  });

  const existing = await prisma.tag.findMany({});
  if (existing.length === 0) {
    await prisma.tag.createMany({
      data: [
        { deviceId: kuka.id, name: 'Robot_Status', address: '$ROB_STATE', dataType: DataType.STRING, access: AccessType.READ },
        { deviceId: kuka.id, name: 'Current_Step', address: '$PRO_STATE.C_STEP', dataType: DataType.INT, access: AccessType.READ },
        { deviceId: kuka.id, name: 'Override_Speed', address: '$OV_PRO', dataType: DataType.REAL, access: AccessType.READ_WRITE },
        { deviceId: melsec.id, name: 'Temperature', address: 'D100', dataType: DataType.REAL, access: AccessType.READ },
        { deviceId: melsec.id, name: 'Start_Cmd', address: 'M10', dataType: DataType.BOOL, access: AccessType.WRITE },
      ],
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

