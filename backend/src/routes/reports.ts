import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// GET /api/reports
router.get('/', async (req, res) => {
  try {
    const { clientId, userId } = req.query;
    const where: any = {};
    
    if (clientId) {
      where.clientId = String(clientId);
    }
    
    if (userId) {
      let user = await prisma.user.findFirst({ where: { firebaseUid: String(userId) } });
      if (!user) {
        user = await prisma.user.create({
          data: { firebaseUid: String(userId), email: `${userId}@cma.local`, name: 'App User' }
        });
      }
      where.userId = user.id;
    }

    const reports = await prisma.report.findMany({
      where,
      include: {
        client: { select: { name: true, businessName: true } },
        _count: { select: { financialYears: true, generatedFiles: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/:id
router.get('/:id', async (req, res) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        financialYears: { orderBy: { year: 'asc' } },
        assumptions: true,
        projections: { orderBy: { year: 'asc' } },
        loanSchedule: true,
        generatedFiles: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports
router.post('/', async (req, res) => {
  try {
    const { title, clientId, reportType, userId } = req.body;

    let user = await prisma.user.findFirst({ where: { firebaseUid: userId || 'local-dev' } });
    if (!user) {
      user = await prisma.user.create({
        data: { firebaseUid: userId || 'local-dev', email: 'dev@cma.local', name: 'Dev User' }
      });
    }

    const report = await prisma.report.create({
      data: {
        title: title || 'New CMA Report',
        clientId,
        userId: user.id,
        reportType: reportType || 'CMA',
        status: 'DRAFT'
      },
      include: { client: true }
    });
    res.status(201).json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reports/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, status, reportType, loanType, bankName, loanAmount, loanPurpose, loanTenure,
            moratoriumMonths, interestRate, repaymentFreq, existingEMI,
            projectCost, meansOfFinance } = req.body;
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(status !== undefined && { status }),
        ...(reportType !== undefined && { reportType }),
        ...(loanType !== undefined && { loanType }),
        ...(bankName !== undefined && { bankName }),
        ...(loanAmount !== undefined && { loanAmount: parseFloat(loanAmount) }),
        ...(loanPurpose !== undefined && { loanPurpose }),
        ...(loanTenure !== undefined && { loanTenure: parseInt(loanTenure) }),
        ...(moratoriumMonths !== undefined && { moratoriumMonths: parseInt(moratoriumMonths) }),
        ...(interestRate !== undefined && { interestRate: parseFloat(interestRate) }),
        ...(repaymentFreq !== undefined && { repaymentFreq }),
        ...(existingEMI !== undefined && { existingEMI: parseFloat(existingEMI) }),
        ...(projectCost !== undefined && { projectCost: JSON.stringify(projectCost) }),
        ...(meansOfFinance !== undefined && { meansOfFinance: JSON.stringify(meansOfFinance) }),
      }
    });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reports/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.report.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
