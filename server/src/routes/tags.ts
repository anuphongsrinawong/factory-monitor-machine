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

// Bulk write: [{ tagId, value }]
router.post('/bulk/write', requireRole(['ADMIN', 'ENGINEER']), async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const io = req.app.get('io');
  const body = req.body as Array<{ tagId: number; value: unknown }>;
  if (!Array.isArray(body) || body.length === 0) return res.status(400).json({ message: 'Invalid payload' });
  const results: Array<{ tagId: number; ok: boolean; error?: string }> = [];
  for (const item of body) {
    try {
      const tag = await prisma.tag.findUnique({ where: { id: item.tagId } });
      if (!tag) { results.push({ tagId: item.tagId, ok: false, error: 'Tag not found' }); continue; }
      await prisma.tagValueHistory.create({ data: { tagId: item.tagId, value: String(item.value) } });
      io.emit('tag:update', { tagId: item.tagId, value: item.value });
      results.push({ tagId: item.tagId, ok: true });
    } catch (e: any) {
      results.push({ tagId: item.tagId, ok: false, error: e?.message ?? 'Write failed' });
    }
  }
  res.json({ results });
});

