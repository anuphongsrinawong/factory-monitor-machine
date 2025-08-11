import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const router = Router();

router.post('/login', async (req, res) => {
  const prisma = req.app.get('prisma') as PrismaClient;
  const { email, password } = req.body as { email: string; password: string };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: '8h',
  });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

export function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
      req.user = payload;
      if (!roles.includes(payload.role)) return res.status(403).json({ message: 'Forbidden' });
      next();
    } catch {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };
}

