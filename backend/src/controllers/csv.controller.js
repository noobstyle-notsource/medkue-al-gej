const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
const { prisma } = require('../lib/prisma');
const fs = require('fs');

// POST /api/csv/import
const importCompanies = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { tenantId } = req.user;
  const filePath = req.file.path;

  res.status(202).json({ message: 'Import started. Processing in background.' });

  const BATCH = 1000;
  let batch = [];
  let total = 0;

  const flush = async () => {
    if (!batch.length) return;
    await prisma.company.createMany({ data: batch, skipDuplicates: true });
    total += batch.length;
    batch = [];
  };

  const stream = fs.createReadStream(filePath);
  const parser = parse({ columns: true, skip_empty_lines: true, trim: true, bom: true });

  parser.on('data', (row) => {
    batch.push({
      tenantId,
      name: row.name || 'Unknown',
      phone: row.phone || null,
      email: row.email || null,
      status: row.status || 'Active',
    });
    if (batch.length >= BATCH) {
      parser.pause();
      flush().then(() => parser.resume()).catch(console.error);
    }
  });

  parser.on('end', async () => {
    await flush();
    try { fs.unlinkSync(filePath); } catch {}
    console.log(`[CSV Import] ${total} rows imported for tenant ${tenantId}`);
  });

  parser.on('error', (err) => {
    console.error('[CSV Import] Error:', err.message);
    try { fs.unlinkSync(filePath); } catch {}
  });

  stream.pipe(parser);
};

// GET /api/csv/export
const exportCompanies = async (req, res) => {
  const { tenantId } = req.user;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="companies.csv"');

  const stringifier = stringify({ header: true, columns: ['id', 'name', 'phone', 'email', 'status', 'createdAt'] });
  stringifier.pipe(res);

  const PAGE = 1000;
  let cursor;

  try {
    while (true) {
      const rows = await prisma.company.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { id: 'asc' },
        take: PAGE,
        skip: cursor ? 1 : 0,
        ...(cursor ? { cursor: { id: cursor } } : {}),
        select: { id: true, name: true, phone: true, email: true, status: true, createdAt: true },
      });
      if (!rows.length) break;
      rows.forEach(r => stringifier.write({ ...r, createdAt: r.createdAt.toISOString() }));
      cursor = rows[rows.length - 1].id;
    }
  } catch (err) {
    console.error('[CSV Export]', err.message);
  } finally {
    stringifier.end();
  }
};

module.exports = { importCompanies, exportCompanies };
