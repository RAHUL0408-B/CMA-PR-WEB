import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// Fuzzy matching utility
function fuzzyMatch(source: string, target: string): number {
  const s = source.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (s === t) return 1.0;
  if (s.includes(t) || t.includes(s)) return 0.9;
  const words = t.split(/\s+/);
  const matches = words.filter(w => s.includes(w));
  return matches.length / words.length;
}

// Standard account mapping dictionary
const STANDARD_MAPPINGS: Record<string, string[]> = {
  grossSales: ['gross sales', 'net sales', 'revenue', 'turnover', 'sales', 'net revenue', 'total sales'],
  otherIncome: ['other income', 'misc income', 'miscellaneous income', 'non-operating income'],
  rawMaterial: ['raw material', 'material cost', 'cost of goods', 'direct material', 'purchase', 'cogs'],
  salaryWages: ['salary', 'wages', 'employee cost', 'staff cost', 'payroll', 'remuneration'],
  powerFuel: ['power', 'fuel', 'electricity', 'energy', 'utilities'],
  manufacturingExp: ['manufacturing', 'production cost', 'factory overhead', 'factory expenses'],
  adminExp: ['admin', 'administration', 'general expenses', 'office expenses', 'overhead'],
  sellingExp: ['selling', 'distribution', 'marketing', 'advertising', 'sales expenses'],
  rent: ['rent', 'lease', 'rental'],
  repairMaintenance: ['repair', 'maintenance', 'r&m', 'repairs'],
  depreciation: ['depreciation', 'amortization', 'dep', 'depr'],
  interestExp: ['interest', 'finance cost', 'finance charges', 'bank charges'],
  taxExpense: ['tax', 'income tax', 'taxes', 'provision for tax'],
  shareCapital: ['share capital', 'paid up capital', 'equity', 'equity share capital'],
  reserves: ['reserves', 'surplus', 'retained earnings', 'profit & loss balance'],
  securedLoan: ['secured loan', 'term loan', 'bank loan', 'tl'],
  unsecuredLoan: ['unsecured loan', 'directors loan', 'relative loan'],
  ccOdLimit: ['cc', 'od', 'cash credit', 'overdraft', 'working capital limit'],
  tradeCreditors: ['creditor', 'trade payable', 'sundry creditor', 'accounts payable'],
  otherCurrentLiab: ['other current liabilities', 'other payables', 'accruals'],
  provisions: ['provision', 'tax provision', 'provisions & contingencies'],
  landBuilding: ['land', 'building', 'premises', 'property'],
  plantMachinery: ['plant', 'machinery', 'equipment', 'tools'],
  furniture: ['furniture', 'fixtures', 'furnishings'],
  vehicle: ['vehicle', 'car', 'transport', 'motor'],
  investments: ['investment', 'shares', 'mutual fund', 'securities'],
  inventory: ['inventory', 'stock', 'closing stock', 'raw material stock', 'finished goods'],
  sundryDebtors: ['debtor', 'sundry debtor', 'accounts receivable', 'trade receivable', 'receivable'],
  cashBank: ['cash', 'bank', 'cash in hand', 'cash & bank', 'bank balance'],
  loansAdvances: ['loans & advances', 'advances', 'prepaid', 'deposits'],
  otherCurrentAssets: ['other current assets', 'other assets', 'tds receivable']
};

// POST /api/mappings/suggest - Suggest mapping for a raw label
router.post('/suggest', async (req, res) => {
  try {
    const { label, industry } = req.body;
    if (!label) return res.status(400).json({ error: 'Label is required' });

    // Check database first
    const dbMapping = await prisma.mappingTemplate.findFirst({
      where: { sourceLabel: { contains: label.toLowerCase() } },
      orderBy: { usageCount: 'desc' }
    });
    if (dbMapping && dbMapping.confidence > 0.7) {
      return res.json({ targetField: dbMapping.targetField, confidence: dbMapping.confidence, source: 'db' });
    }

    // Fuzzy match against standard mappings
    let bestMatch = { field: '', score: 0 };
    for (const [field, aliases] of Object.entries(STANDARD_MAPPINGS)) {
      for (const alias of aliases) {
        const score = fuzzyMatch(label, alias);
        if (score > bestMatch.score) {
          bestMatch = { field, score };
        }
      }
    }

    if (bestMatch.score > 0.5) {
      return res.json({ targetField: bestMatch.field, confidence: bestMatch.score, source: 'fuzzy' });
    }

    res.json({ targetField: null, confidence: 0, source: 'none' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mappings/bulk-suggest - Suggest mappings for multiple labels
router.post('/bulk-suggest', async (req, res) => {
  try {
    const { labels } = req.body;
    const results: Record<string, { targetField: string | null; confidence: number }> = {};

    for (const label of labels) {
      let bestMatch = { field: '', score: 0 };
      for (const [field, aliases] of Object.entries(STANDARD_MAPPINGS)) {
        for (const alias of aliases) {
          const score = fuzzyMatch(label, alias);
          if (score > bestMatch.score) bestMatch = { field, score };
        }
      }
      results[label] = {
        targetField: bestMatch.score > 0.5 ? bestMatch.field : null,
        confidence: bestMatch.score
      };
    }

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mappings/learn - Record a confirmed mapping
router.post('/learn', async (req, res) => {
  try {
    const { sourceLabel, targetField, confidence } = req.body;
    const mapping = await prisma.mappingTemplate.upsert({
      where: { sourceLabel_targetField: { sourceLabel: sourceLabel.toLowerCase(), targetField } },
      update: { usageCount: { increment: 1 }, confidence: confidence || 1.0 },
      create: { sourceLabel: sourceLabel.toLowerCase(), targetField, confidence: confidence || 1.0 }
    });
    res.json(mapping);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mappings/templates - Get all learned mappings
router.get('/templates', async (req, res) => {
  try {
    const templates = await prisma.mappingTemplate.findMany({ orderBy: { usageCount: 'desc' } });
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
