import { Router } from 'express';
import { PrismaClient, AccessType, DataType } from '@prisma/client';
import { requireRole } from './auth';

export const router = Router();

router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const { deviceId } = req.query as { deviceId?: string };
  const where = deviceId ? { deviceId: Number(deviceId) } : {};
  const tags = await prisma.tag.findMany({ where });
  res.json(tags);
});

router.post('/', requireRole(['ADMIN', 'ENGINEER']), async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const { deviceId, name, address, dataType, access, description } = req.body as {
    deviceId: number; name: string; address: string; dataType: DataType; access: AccessType; description?: string;
  };
  const tag = await prisma.tag.create({ data: { deviceId, name, address, dataType, access, description } });
  res.status(201).json(tag);
});

router.patch('/:id', requireRole(['ADMIN', 'ENGINEER']), async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const id = Number(req.params.id);
  const tag = await prisma.tag.update({ where: { id }, data: req.body });
  res.json(tag);
});

router.delete('/:id', requireRole(['ADMIN', 'ENGINEER']), async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const id = Number(req.params.id);
  await prisma.tag.delete({ where: { id } });
  res.status(204).send();
});

// Read current value (from cache/mock) and write value request
router.get('/:id/value', async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const id = Number(req.params.id);
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) return res.status(404).json({ message: 'Not found' });
  // For demo, value from history last record
  const last = await prisma.tagValueHistory.findFirst({ where: { tagId: id }, orderBy: { createdAt: 'desc' } });
  res.json({ tagId: id, value: last?.value ?? null, at: last?.createdAt ?? null });
});

router.post('/:id/write', requireRole(['ADMIN', 'ENGINEER']), async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const io = req.app.get('io');
  const id = Number(req.params.id);
  const { value } = req.body as { value: unknown };
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) return res.status(404).json({ message: 'Not found' });

  // TODO: route to connector by device
  // For mock, just store value and emit
  await prisma.tagValueHistory.create({ data: { tagId: id, value: String(value) } });
  io.emit('tag:update', { tagId: id, value });
  res.json({ ok: true });
});

