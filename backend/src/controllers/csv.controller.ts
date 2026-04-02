import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import fs from 'fs';

// POST /api/csv/import — Stream CSV, batch-insert 1000 rows at a time
export const importContacts = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

  const filePath = req.file.path;

  // Respond immediately — processing happens in background
  res.status(202).json({ message: 'Import started. Large files may take a few moments.' });

  const BATCH = 1000;
  let batch: object[] = [];
  let total = 0;

  const stream = fs.createReadStream(filePath);
  const parser = parse({ columns: true, skip_empty_lines: true, trim: true, bom: true });

  const flush = async () => {
    if (batch.length === 0) return;
    await prisma.contact.createMany({ data: batch as Parameters<typeof prisma.contact.createMany>[0]['data'], skipDuplicates: true });
    total += batch.length;
    batch = [];
  };

  parser.on('data', (row: Record<string, string>) => {
    batch.push({
      tenantId: user!.tenantId,
      name: row['name'] || 'Unknown',
      phone: row['phone'] || null,
      email: row['email'] || null,
      company: row['company'] || null,
      status: row['status'] || 'Active',
    });
    if (batch.length >= BATCH) {
      parser.pause();
      flush().then(() => parser.resume()).catch(console.error);
    }
  });

  parser.on('end', async () => {
    await flush();
    fs.unlinkSync(filePath);
    console.log(`[CSV Import] Done — ${total} rows inserted for tenant ${user!.tenantId}`);
  });

  parser.on('error', (err) => {
    console.error('[CSV Import] Parse error:', err);
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  });

  stream.pipe(parser);
};

// GET /api/csv/export — Cursor-based streaming export
export const exportContacts = async (req: Request, res: Response): Promise<void> => {
  const { user } = req as AuthRequest;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');

  const columns = ['id', 'name', 'phone', 'email', 'company', 'status', 'createdAt'];
  const stringifier = stringify({ header: true, columns });
  stringifier.pipe(res);

  const PAGE = 1000;
  let cursor: string | undefined;

  try {
    while (true) {
      const rows = await prisma.contact.findMany({
        where: { tenantId: user!.tenantId, deletedAt: null },
        orderBy: { id: 'asc' },
        take: PAGE,
        skip: cursor ? 1 : 0,
        ...(cursor ? { cursor: { id: cursor } } : {}),
        select: { id: true, name: true, phone: true, email: true, company: true, status: true, createdAt: true },
      });

      if (rows.length === 0) break;
      rows.forEach(r => stringifier.write({ ...r, createdAt: r.createdAt.toISOString() }));
      cursor = rows[rows.length - 1].id;
    }
  } catch (err) {
    console.error('[CSV Export]', err);
  } finally {
    stringifier.end();
  }
};
