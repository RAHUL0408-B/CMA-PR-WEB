import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// GET /api/financials/:reportId
router.get('/:reportId', async (req, res) => {
  try {
    const years = await prisma.financialYear.findMany({
      where: { reportId: req.params.reportId },
      orderBy: { year: 'asc' }
    });
    res.json(years);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/financials/:reportId  - Upsert a financial year
router.post('/:reportId', async (req, res) => {
  try {
    const { year, yearType, plData, bsLiabilities, bsAssets } = req.body;

    // Validate balance sheet
    let isBalanced = false;
    if (bsAssets && bsLiabilities) {
      const assets = Object.values(bsAssets as Record<string, number>).reduce((a, b) => a + (b || 0), 0);
      const liabilities = Object.values(bsLiabilities as Record<string, number>).reduce((a, b) => a + (b || 0), 0);
      isBalanced = Math.abs(assets - liabilities) < 1; // tolerance of 1 rupee
    }

    const existing = await prisma.financialYear.findFirst({
      where: { reportId: req.params.reportId, year }
    });

    const data = {
      reportId: req.params.reportId,
      year,
      yearType: yearType || 'HISTORICAL',
      plData: plData ? JSON.stringify(plData) : undefined,
      bsLiabilities: bsLiabilities ? JSON.stringify(bsLiabilities) : undefined,
      bsAssets: bsAssets ? JSON.stringify(bsAssets) : undefined,
      isBalanced
    };

    const record = existing
      ? await prisma.financialYear.update({ where: { id: existing.id }, data })
      : await prisma.financialYear.create({ data });

    res.json({ ...record, isBalanced });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/financials/:reportId/:yearId
router.delete('/:reportId/:yearId', async (req, res) => {
  try {
    await prisma.financialYear.delete({ where: { id: req.params.yearId } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
