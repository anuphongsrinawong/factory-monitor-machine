import { PrismaClient, DeviceType, AlarmSeverity } from '@prisma/client';
import { Server as IOServer } from 'socket.io';

type Connector = {
  start(): Promise<void>;
  stop(): Promise<void>;
  read(tagAddress: string): Promise<string | number | boolean>;
  write(tagAddress: string, value: unknown): Promise<void>;
};

export async function initConnectors(_prisma: PrismaClient, _io: IOServer) {
  // Placeholder: Here you would initialize real connectors (OPC UA, MC Protocol, etc.)
}

export function startMockStreaming(prisma: PrismaClient, io: IOServer) {
  // Simulate device telemetry and alarms every 2 seconds
  setInterval(async () => {
    const devices = await prisma.device.findMany({});
    for (const device of devices) {
      await prisma.device.update({ where: { id: device.id }, data: { status: 'ONLINE', lastSeenAt: new Date() } });
    }

    const tags = await prisma.tag.findMany({});
    for (const tag of tags) {
      // Simple random value generator by datatype
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
      await prisma.tagValueHistory.create({ data: { tagId: tag.id, value } });
      io.emit('tag:update', { tagId: tag.id, value });
    }

    // Occasionally raise an alarm
    if (Math.random() < 0.1) {
      const device = devices[Math.floor(Math.random() * devices.length)];
      if (device) {
        const alarm = await prisma.alarm.create({
          data: {
            deviceId: device.id,
            code: 'E' + Math.floor(Math.random() * 1000),
            message: 'Random simulated alarm',
            severity: Math.random() < 0.5 ? 'WARNING' : 'CRITICAL',
          },
        });
        io.emit('alarm:new', alarm);
      }
    }
  }, 2000);
}

