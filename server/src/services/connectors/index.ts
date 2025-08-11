import { PrismaClient } from '@prisma/client';
import { Server as IOServer } from 'socket.io';

type Connector = {
  start(): Promise<void>;
  stop(): Promise<void>;
  read(tagAddress: string): Promise<string>;
  write(tagAddress: string, value: unknown): Promise<void>;
};

const deviceIdToConnector: Map<number, Connector> = new Map();
const tagLatestValue: Map<number, string> = new Map();

export async function initConnectors(_prisma: PrismaClient, _io: IOServer) {
  // ที่นี่สามารถเตรียม resource สำหรับโปรโตคอลจริง เช่น OPC UA client pool เป็นต้น
}

function createSimConnector(): Connector {
  return {
    async start() {},
    async stop() {},
    async read(_addr: string) {
      return '0';
    },
    async write(_addr: string, _value: unknown) {
      // mock: no-op
    },
  };
}

async function getOrCreateConnector(prisma: PrismaClient, deviceId: number): Promise<Connector> {
  let conn = deviceIdToConnector.get(deviceId);
  if (conn) return conn;
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) throw new Error('Device not found');
  // เลือกจาก protocol (SIM/OPCUA/MC/KUKA_KRL/MQTT)
  // ตอนนี้ทำ SIM เป็น default
  conn = createSimConnector();
  deviceIdToConnector.set(deviceId, conn);
  await conn.start();
  return conn;
}

export async function writeViaConnector(prisma: PrismaClient, io: IOServer, tagId: number, value: unknown) {
  const tag = await prisma.tag.findUnique({ where: { id: tagId }, include: { device: true } });
  if (!tag) throw new Error('Tag not found');
  const connector = await getOrCreateConnector(prisma, tag.deviceId);
  await connector.write(tag.address, value);
  const valueStr = String(value);
  tagLatestValue.set(tagId, valueStr);
  await prisma.tagValueHistory.create({ data: { tagId, value: valueStr } });
  io.emit('tag:update', { tagId, value });
}

export async function bulkWriteViaConnector(prisma: PrismaClient, io: IOServer, items: Array<{ tagId: number; value: unknown }>) {
  for (const it of items) {
    try {
      await writeViaConnector(prisma, io, it.tagId, it.value);
    } catch {
      // ข้าม error รายตัวเพื่อไม่ให้ทั้ง batch ล้ม
    }
  }
}

export function startMockStreaming(prisma: PrismaClient, io: IOServer) {
  // อัปเดตเฉพาะอุปกรณ์ที่ protocol = SIM และ enabled เท่านั้น
  setInterval(async () => {
    const devices = await prisma.device.findMany({ where: { enabled: true } });
    for (const device of devices) {
      if (device.protocol && device.protocol !== 'SIM') continue;
      await prisma.device.update({ where: { id: device.id }, data: { status: 'ONLINE', lastSeenAt: new Date() } });
      const tags = await prisma.tag.findMany({ where: { deviceId: device.id } });
      for (const tag of tags) {
        let value: string = '0';
        switch (tag.dataType) {
          case 'BOOL':
            value = Math.random() > 0.5 ? '1' : '0';
            break;
          case 'INT':
            value = String(Math.floor(Math.random() * 200));
            break;
          case 'REAL':
            value = (Math.random() * 100).toFixed(2);
            break;
          case 'STRING':
            value = 'OK';
            break;
        }
        tagLatestValue.set(tag.id, value);
        await prisma.tagValueHistory.create({ data: { tagId: tag.id, value } });
        io.emit('tag:update', { tagId: tag.id, value });
      }
    }
  }, 2000);
}

export async function readLatestValue(prisma: PrismaClient, tagId: number): Promise<{ value: string | null; at: Date | null }> {
  const cached = tagLatestValue.get(tagId);
  if (cached !== undefined) {
    const last = await prisma.tagValueHistory.findFirst({ where: { tagId }, orderBy: { createdAt: 'desc' } });
    return { value: cached, at: last?.createdAt ?? null };
  }
  const last = await prisma.tagValueHistory.findFirst({ where: { tagId }, orderBy: { createdAt: 'desc' } });
  return { value: last?.value ?? null, at: last?.createdAt ?? null };
}

