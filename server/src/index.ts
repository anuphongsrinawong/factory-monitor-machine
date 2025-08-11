import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { router as authRouter } from './routes/auth';
import { router as deviceRouter } from './routes/devices';
import { router as tagRouter } from './routes/tags';
import { router as alarmRouter } from './routes/alarms';
import { initConnectors, startMockStreaming } from './services/connectors/index';

const prisma = new PrismaClient();

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.set('io', io);
app.set('prisma', prisma);

app.use('/api/auth', authRouter);
app.use('/api/devices', deviceRouter);
app.use('/api/tags', tagRouter);
app.use('/api/alarms', alarmRouter);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

server.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  await initConnectors(prisma, io);
  startMockStreaming(prisma, io);
});

