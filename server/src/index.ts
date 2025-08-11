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
import rateLimit from 'express-rate-limit';

const prisma = new PrismaClient();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*', credentials: true }));
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 60_000, max: 600 }));

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

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err?.status || 500).json({ message: err?.message || 'Internal Server Error' });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

server.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);
  await initConnectors(prisma, io);
  startMockStreaming(prisma, io);
});

