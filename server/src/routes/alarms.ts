import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

export const router = Router();

router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const { deviceId } = req.query as { deviceId?: string };
  const where = deviceId ? { deviceId: Number(deviceId) } : {};
  const alarms = await prisma.alarm.findMany({ where, orderBy: { occurredAt: 'desc' } });
  res.json(alarms);
});

router.post('/ack/:id', async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const id = Number(req.params.id);
  const alarm = await prisma.alarm.update({ where: { id }, data: { clearedAt: new Date() } });
  res.json(alarm);
});

