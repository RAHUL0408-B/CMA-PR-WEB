import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { computeProjections, computeLoanSchedule } from '../engines/projectionEngine.js';

const router = Router();

// GET /api/projections/:reportId/assumptions
router.get('/:reportId/assumptions', async (req, res) => {
  try {
    const assumption = await prisma.assumption.findFirst({ where: { reportId: req.params.reportId } });
    res.json(assumption);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projections/:reportId/assumptions
router.put('/:reportId/assumptions', async (req, res) => {
  try {
    const existing = await prisma.assumption.findFirst({ where: { reportId: req.params.reportId } });
    const data = {
      reportId: req.params.reportId,
      salesGrowthPct: parseFloat(req.body.salesGrowthPct) || 15,
      rawMaterialPct: parseFloat(req.body.rawMaterialPct) || 60,
      salaryGrowthPct: parseFloat(req.body.salaryGrowthPct) || 10,
      adminExpensePct: parseFloat(req.body.adminExpensePct) || 5,
      powerExpensePct: parseFloat(req.body.powerExpensePct) || 3,
      interestRate: parseFloat(req.body.interestRate) || 12,
      depreciationRate: parseFloat(req.body.depreciationRate) || 10,
      taxRate: parseFloat(req.body.taxRate) || 25,
      inflationRate: parseFloat(req.body.inflationRate) || 6,
      capacityUtilization: JSON.stringify(req.body.capacityUtilization || [70, 80, 85, 90, 95]),
      debtorDays: parseInt(req.body.debtorDays) || 45,
      creditorDays: parseInt(req.body.creditorDays) || 30,
      inventoryDays: parseInt(req.body.inventoryDays) || 60,
      projectionYears: parseInt(req.body.projectionYears) || 5,
    };
    const assumption = existing
      ? await prisma.assumption.update({ where: { id: existing.id }, data })
      : await prisma.assumption.create({ data });
    res.json(assumption);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projections/:reportId/compute
router.post('/:reportId/compute', async (req, res) => {
  try {
    const { reportId } = req.params;

    // Gather required data
    const [report, historicalYears, assumption] = await Promise.all([
      prisma.report.findUnique({ where: { id: reportId } }),
      prisma.financialYear.findMany({ where: { reportId, yearType: 'HISTORICAL' }, orderBy: { year: 'asc' } }),
      prisma.assumption.findFirst({ where: { reportId } })
    ]);

    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (!assumption) return res.status(400).json({ error: 'Please save assumptions first' });
    if (historicalYears.length === 0) return res.status(400).json({ error: 'Please enter historical financial data first' });

    // Parse last historical year as base
    const lastYear = historicalYears[historicalYears.length - 1]!;
    const basePL = lastYear.plData ? JSON.parse(lastYear.plData) : {};
    const baseBS = { assets: JSON.parse(lastYear.bsAssets || '{}'), liabilities: JSON.parse(lastYear.bsLiabilities || '{}') };

    const projections = computeProjections({ basePL, baseBS, assumption, report });
    const loanSchedule = report.loanAmount ? computeLoanSchedule({
      loanAmount: report.loanAmount,
      annualRate: report.interestRate || assumption.interestRate,
      tenureMonths: (report.loanTenure || 60),
      moratoriumMonths: report.moratoriumMonths || 0
    }) : null;

    // Delete old projections and insert new
    await prisma.projection.deleteMany({ where: { reportId } });
    const projectionRecords = await Promise.all(
      projections.map((p: any) => prisma.projection.create({
        data: {
          reportId,
          year: p.year,
          scenario: 'BASE',
          plProjection: JSON.stringify(p.pl),
          bsProjection: JSON.stringify(p.bs),
          cfProjection: JSON.stringify(p.cf),
          ratios: JSON.stringify(p.ratios),
          dscr: p.ratios.dscr
        }
      }))
    );

    // Save loan schedule
    if (loanSchedule && report.loanAmount) {
      await prisma.loanSchedule.deleteMany({ where: { reportId } });
      await prisma.loanSchedule.create({
        data: {
          reportId,
          loanAmount: report.loanAmount,
          interestRate: report.interestRate || assumption.interestRate,
          tenureMonths: report.loanTenure || 60,
          moratoriumMonths: report.moratoriumMonths || 0,
          emiAmount: loanSchedule.emi,
          scheduleData: JSON.stringify(loanSchedule.schedule)
        }
      });
    }

    res.json({ projections: projectionRecords, loanSchedule });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projections/:reportId
router.get('/:reportId', async (req, res) => {
  try {
    const [projections, loanSchedule] = await Promise.all([
      prisma.projection.findMany({ where: { reportId: req.params.reportId }, orderBy: { year: 'asc' } }),
      prisma.loanSchedule.findFirst({ where: { reportId: req.params.reportId } })
    ]);
    res.json({ projections, loanSchedule });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
