import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_anthropic_api_key_here' || apiKey.trim() === '') {
    return null;
  }
  return new Anthropic({ apiKey });
};

// POST /api/ai/:reportId/generate
router.post('/:reportId/generate', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { module } = req.body; // executive_summary, risk_analysis, ratio_commentary, etc.

    const [report, historicalYears, projections, assumption] = await Promise.all([
      prisma.report.findUnique({ where: { id: reportId }, include: { client: true } }),
      prisma.financialYear.findMany({ where: { reportId }, orderBy: { year: 'asc' } }),
      prisma.projection.findMany({ where: { reportId }, orderBy: { year: 'asc' } }),
      prisma.assumption.findFirst({ where: { reportId } })
    ]);

    if (!report) return res.status(404).json({ error: 'Report not found' });

    const anthropic = getAnthropicClient();
    if (!anthropic) {
      return res.status(503).json({ 
        error: 'AI commentary requires an Anthropic API key. Please configure ANTHROPIC_API_KEY in backend/.env and restart the server. You can get a free key at https://console.anthropic.com'
      });
    }

    const financialSummary = historicalYears.map((y: any) => ({
      year: y.year,
      pl: y.plData ? JSON.parse(y.plData) : {},
      assets: y.bsAssets ? JSON.parse(y.bsAssets) : {},
      liabilities: y.bsLiabilities ? JSON.parse(y.bsLiabilities) : {}
    }));

    const projectionSummary = projections.map((p: any) => ({
      year: p.year,
      ratios: p.ratios ? JSON.parse(p.ratios) : {},
      dscr: p.dscr
    }));

    const systemPrompt = `You are an expert Indian banking financial analyst with 20+ years of experience in CMA reports, 
project reports, and credit underwriting for PSU banks and NBFCs. 
Generate professional, factual, bank-ready financial commentary in formal English.
NEVER perform calculations - only interpret the provided data.
Be concise, specific, and use banking terminology.`;

    const prompts: Record<string, string> = {
      executive_summary: `Generate a 200-word executive summary for a ${report.reportType} report for ${report.client?.businessName || report.client?.name}. 
Industry: ${report.client?.industryType}. Loan Amount: ₹${(report.loanAmount || 0).toLocaleString('en-IN')} Lakhs.
Historical data: ${JSON.stringify(financialSummary)}
Key projections: ${JSON.stringify(projectionSummary)}`,

      key_positives: `List 5 key financial strengths/positives for ${report.client?.businessName || report.client?.name} based on:
Financial data: ${JSON.stringify(financialSummary)}
Format as bullet points. Be specific with numbers.`,

      key_concerns: `List 3-4 financial risk factors/concerns for ${report.client?.businessName || report.client?.name} based on:
Financial data: ${JSON.stringify(financialSummary)}
Format as bullet points. Be specific about potential risks.`,

      ratio_commentary: `Write banking-grade commentary on the financial ratios for ${report.client?.businessName}:
Projections with ratios: ${JSON.stringify(projectionSummary)}
Comment on DSCR, Current Ratio, Debt Equity Ratio, and Net Profit Margin trends.`,

      creditworthiness: `Provide a creditworthiness assessment for a ${report.loanAmount} Lakh loan to ${report.client?.businessName}:
Historical performance: ${JSON.stringify(financialSummary)}
Projected DSCR: ${JSON.stringify(projectionSummary.map(p => ({ year: p.year, dscr: p.dscr })))}
Give a recommendation: RECOMMEND / CONDITIONALLY RECOMMEND / NOT RECOMMEND`,

      swot_analysis: `Generate a SWOT analysis for ${report.client?.businessName} in the ${report.client?.industryType} sector:
Experience: ${report.client?.promoterExperience} years
Constitution: ${report.client?.constitution}
Format with Strengths, Weaknesses, Opportunities, Threats sections.`
    };

    const prompt = (prompts[module] || prompts.executive_summary) as string;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    });

    let responseText = '';
    const firstContentBlock = message.content[0];
    if (firstContentBlock && 'text' in firstContentBlock) {
      responseText = firstContentBlock.text;
    }

    // Log AI call
    if (report.userId) {
      await prisma.aiLog.create({
        data: {
          reportId,
          userId: report.userId,
          prompt,
          response: responseText,
          tokens: message.usage.input_tokens + message.usage.output_tokens,
          module
        }
      });
    }

    res.json({ content: responseText, module, tokens: message.usage });
  } catch (err: any) {
    console.error('[AI Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/:reportId/parse-financials
router.post('/:reportId/parse-financials', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { rawText } = req.body;

    if (!rawText) return res.status(400).json({ error: 'Raw text is required' });

    const anthropic = getAnthropicClient();
    if (!anthropic) {
      return res.status(503).json({ 
        error: 'AI parse requires an Anthropic API key. Please configure ANTHROPIC_API_KEY in backend/.env'
      });
    }

    const systemPrompt = `You are a financial data extraction assistant. Parse unstructured financial text and map to structured JSON.
You MUST output ONLY valid JSON. No markdown other than standard JSON block. Do not write text before or after the JSON.

Map into 3 categories:
1. plData (Operating Statement) - keys: grossSales, otherIncome, rawMaterial, salaryWages, powerFuel, manufacturingExp, adminExp, sellingExp, rent, repairMaintenance, depreciation, interestExp, taxExpense
2. bsLiabilities - keys: shareCapital, reserves, securedLoan, unsecuredLoan, ccOdLimit, tradeCreditors, otherCurrentLiab, provisions
3. bsAssets - keys: landBuilding, plantMachinery, furniture, vehicle, investments, inventory, sundryDebtors, cashBank, loansAdvances, otherCurrentAssets

Rules:
- All values MUST be positive numbers (floats/integers) representing the figures. If a figure is in Lakhs, normalize it to Lakhs (or if figures are absolute, convert to Lakhs if appropriate, but generally keep the scale consistent as presented).
- If not found or zero, return 0.
- Return format:
{
  "plData": { "grossSales": 0, "otherIncome": 0, ... },
  "bsLiabilities": { "shareCapital": 0, ... },
  "bsAssets": { "landBuilding": 0, ... }
}`;

    const prompt = `Here is the unstructured financial data text:
---
${rawText}
---
Extract the financials for the target schema.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    });

    let responseText = '';
    const firstContentBlock = message.content[0];
    if (firstContentBlock && 'text' in firstContentBlock) {
      responseText = firstContentBlock.text;
    }
    
    let jsonStr = responseText.trim();
    if (jsonStr.includes('```json')) {
      const parts = jsonStr.split('```json');
      const secondPart = parts[1];
      if (secondPart) {
        jsonStr = (secondPart.split('```')[0] || '').trim();
      }
    } else if (jsonStr.includes('```')) {
      const parts = jsonStr.split('```');
      const secondPart = parts[1];
      if (secondPart) {
        jsonStr = (secondPart.split('```')[0] || '').trim();
      }
    }

    const parsedData = JSON.parse(jsonStr);
    res.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error('[AI Parse Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/:reportId/history
router.get('/:reportId/history', async (req, res) => {
  try {
    const logs = await prisma.aiLog.findMany({
      where: { reportId: req.params.reportId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
