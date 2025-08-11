import { Router } from 'express';
import { PrismaClient, DeviceType } from '@prisma/client';
import { requireRole } from './auth';

export const router = Router();

router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const devices = await prisma.device.findMany({ include: { tags: true } });
  res.json(devices);
});

router.post('/', requireRole(['ADMIN', 'ENGINEER']), async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const { name, type } = req.body as { name: string; type: DeviceType };
  const device = await prisma.device.create({ data: { name, type } });
  res.status(201).json(device);
});

router.patch('/:id', requireRole(['ADMIN', 'ENGINEER']), async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const id = Number(req.params.id);
  const device = await prisma.device.update({ where: { id }, data: req.body });
  res.json(device);
});

router.delete('/:id', requireRole(['ADMIN']), async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const id = Number(req.params.id);
  await prisma.device.delete({ where: { id } });
  res.status(204).send();
});

