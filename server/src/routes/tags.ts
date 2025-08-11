import { Router } from 'express';
import { PrismaClient, AccessType, DataType } from '@prisma/client';
import { requireRole } from './auth';
import { readLatestValue, writeViaConnector, bulkWriteViaConnector } from '../services/connectors/index';

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
  const last = await readLatestValue(prisma, id);
  res.json({ tagId: id, value: last.value, at: last.at });
});

router.post('/:id/write', requireRole(['ADMIN', 'ENGINEER']), async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const io = req.app.get('io');
  const id = Number(req.params.id);
  const { value } = req.body as { value: unknown };
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) return res.status(404).json({ message: 'Not found' });

  await writeViaConnector(prisma, io, id, value);
  res.json({ ok: true });
});

// Bulk write: [{ tagId, value }]
router.post('/bulk/write', requireRole(['ADMIN', 'ENGINEER']), async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const io = req.app.get('io');
  const body = req.body as Array<{ tagId: number; value: unknown }>;
  if (!Array.isArray(body) || body.length === 0) return res.status(400).json({ message: 'Invalid payload' });
  await bulkWriteViaConnector(prisma, io, body);
  res.json({ ok: true });
});

