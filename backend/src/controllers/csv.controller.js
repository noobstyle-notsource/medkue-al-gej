const { stringify } = require('csv-stringify');
const { prisma } = require('../lib/prisma');
const { safeAdd } = require('../jobs/queue');

// POST /api/csv/import
const importCompanies = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { tenantId } = req.user;
  const filePath = req.file.path;

  // Queue the job (falls back gracefully if Redis offline)
  await safeAdd('csv-import', { filePath, tenantId });

  res.status(202).json({
    message: 'Import task queued. Processing in the background.',
    jobId: 'background',
  });
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
