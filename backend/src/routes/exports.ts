import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// POST /api/exports/:reportId/excel
router.post('/:reportId/excel', async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        client: true,
        financialYears: { orderBy: { year: 'asc' } },
        projections: { orderBy: { year: 'asc' } },
        assumptions: true,
        loanSchedule: true
      }
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Return all data needed for frontend-side Excel generation
    const exportData = {
      report: {
        ...report,
        projectCost: report.projectCost ? JSON.parse(report.projectCost) : null,
        meansOfFinance: report.meansOfFinance ? JSON.parse(report.meansOfFinance) : null
      },
      financialYears: report.financialYears.map((y: any) => ({
        ...y,
        plData: y.plData ? JSON.parse(y.plData) : {},
        bsAssets: y.bsAssets ? JSON.parse(y.bsAssets) : {},
        bsLiabilities: y.bsLiabilities ? JSON.parse(y.bsLiabilities) : {}
      })),
      projections: report.projections.map((p: any) => ({
        ...p,
        plProjection: p.plProjection ? JSON.parse(p.plProjection) : {},
        bsProjection: p.bsProjection ? JSON.parse(p.bsProjection) : {},
        cfProjection: p.cfProjection ? JSON.parse(p.cfProjection) : {},
        ratios: p.ratios ? JSON.parse(p.ratios) : {}
      })),
      loanSchedule: report.loanSchedule[0] ? {
        ...report.loanSchedule[0],
        scheduleData: JSON.parse(report.loanSchedule[0].scheduleData || '[]')
      } : null,
      assumption: report.assumptions[0] || null
    };

    // Record file generation
    await prisma.generatedFile.create({
      data: {
        reportId,
        fileType: 'EXCEL_CMA',
        fileName: `CMA_${report.client?.name}_${new Date().getFullYear()}.xlsx`
      }
    });

    res.json({ success: true, data: exportData, fileName: `CMA_${report.client?.name}_${new Date().getFullYear()}.xlsx` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/exports/:reportId/files
router.get('/:reportId/files', async (req, res) => {
  try {
    const files = await prisma.generatedFile.findMany({
      where: { reportId: req.params.reportId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
