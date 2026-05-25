import { auth } from './firebase';
import { computeProjections, computeLoanSchedule } from './projectionEngine';

export function safeParseJSON(val: any, fallback: any = {}): any {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === '[object Object]') return fallback;
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      console.warn('Failed to parse JSON string:', val, e);
      return fallback;
    }
  }
  return fallback;
}

// Self-healing migration for old localStorage data
try {
  const rawFin = localStorage.getItem('cma_financials');
  if (rawFin) {
    const financials = JSON.parse(rawFin);
    let migrated = false;
    financials.forEach((f: any) => {
      if (f.plData && (typeof f.plData === 'object' || f.plData === '[object Object]')) {
        f.plData = typeof f.plData === 'object' ? JSON.stringify(f.plData) : '{}';
        migrated = true;
      }
      if (f.bsAssets && (typeof f.bsAssets === 'object' || f.bsAssets === '[object Object]')) {
        f.bsAssets = typeof f.bsAssets === 'object' ? JSON.stringify(f.bsAssets) : '{}';
        migrated = true;
      }
      if (f.bsLiabilities && (typeof f.bsLiabilities === 'object' || f.bsLiabilities === '[object Object]')) {
        f.bsLiabilities = typeof f.bsLiabilities === 'object' ? JSON.stringify(f.bsLiabilities) : '{}';
        migrated = true;
      }
    });
    if (migrated) {
      localStorage.setItem('cma_financials', JSON.stringify(financials));
      console.log('Migrated/Healed cma_financials storage objects to JSON strings.');
    }
  }
} catch (e) {
  console.error('Failed to run financials local storage migration:', e);
}

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const isOffline = () => {
  return localStorage.getItem('cma_use_offline_mode') === 'true';
};

async function getToken(): Promise<string | null> {
  try { return (await auth.currentUser?.getIdToken()) || null; } catch { return null; }
}

async function fetchAPI<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (isOffline()) {
    return handleOfflineRequest<T>(path, options);
  }

  try {
    const token = await getToken();
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  } catch (err: any) {
    if (err instanceof TypeError || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      console.warn('Backend server not detected. Switching to browser-only offline mode (LocalStorage).');
      localStorage.setItem('cma_use_offline_mode', 'true');
      window.dispatchEvent(new Event('cma_offline_mode_enabled'));
      return handleOfflineRequest<T>(path, options);
    }
    throw err;
  }
}

async function handleOfflineRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || 'GET';
  const cleanPath = path.split('?')[0];

  const getDB = (key: string): any[] => {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  };

  const setDB = (key: string, data: any[]) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const matchRoute = (pattern: string) => {
    const patternParts = pattern.split('/');
    const pathParts = cleanPath.split('/');
    if (patternParts.length !== pathParts.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].substring(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  };

  const getBody = () => (options.body ? JSON.parse(options.body as string) : {});

  // ---- CLIENTS ----
  if (cleanPath === '/clients') {
    if (method === 'GET') {
      const clients = getDB('cma_clients');
      const reports = getDB('cma_reports');
      
      // Show ALL clients to all users (shared platform)
      let filtered = clients;
      if (path.includes('clientId=')) {
        const cid = path.split('clientId=')[1]?.split('&')[0];
        filtered = clients.filter(c => c.id === cid);
      }

      return filtered.map(c => ({
        ...c,
        _count: { reports: reports.filter(r => r.clientId === c.id).length }
      })) as any;
    }
    if (method === 'POST') {
      const clients = getDB('cma_clients');
      const newClient = {
        id: 'c_' + Math.random().toString(36).substring(2, 11),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...getBody()
      };
      clients.push(newClient);
      setDB('cma_clients', clients);
      return newClient as any;
    }
  }

  let params = matchRoute('/clients/:id');
  if (params) {
    const id = params.id;
    if (method === 'GET') {
      const clients = getDB('cma_clients');
      const client = clients.find(c => c.id === id);
      if (!client) throw new Error('Client not found');
      const reports = getDB('cma_reports').filter(r => r.clientId === id);
      return { ...client, reports } as any;
    }
    if (method === 'PUT') {
      const clients = getDB('cma_clients');
      const idx = clients.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Client not found');
      const updated = { ...clients[idx], ...getBody(), updatedAt: new Date().toISOString() };
      clients[idx] = updated;
      setDB('cma_clients', clients);
      return updated as any;
    }
    if (method === 'DELETE') {
      const clients = getDB('cma_clients');
      setDB('cma_clients', clients.filter(c => c.id !== id));
      return { success: true } as any;
    }
  }

  // ---- REPORTS ----
  if (cleanPath === '/reports') {
    if (method === 'GET') {
      const reports = getDB('cma_reports');
      let filtered = reports;
      
      if (path.includes('clientId=')) {
        const cid = path.split('clientId=')[1]?.split('&')[0];
        filtered = filtered.filter(r => r.clientId === cid);
      }
      // No userId filter - show ALL reports to all users (shared platform)
      
      const clients = getDB('cma_clients');
      const withClientInfo = filtered.map(r => {
        const client = clients.find(c => c.id === r.clientId);
        return {
          ...r,
          client: client ? { name: client.name, businessName: client.businessName } : null,
          _count: { financialYears: getDB('cma_financials').filter(f => f.reportId === r.id).length, generatedFiles: 1 }
        };
      });

      return withClientInfo as any;
    }
    if (method === 'POST') {
      const reports = getDB('cma_reports');
      const newReport = {
        id: 'r_' + Math.random().toString(36).substring(2, 11),
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...getBody()
      };
      reports.push(newReport);
      setDB('cma_reports', reports);
      return newReport as any;
    }
  }

  params = matchRoute('/reports/:id');
  if (params) {
    const id = params.id;
    if (method === 'GET') {
      const reports = getDB('cma_reports');
      const report = reports.find(r => r.id === id);
      if (!report) throw new Error('Report not found');
      const client = getDB('cma_clients').find(c => c.id === report.clientId);
      const financialYears = getDB('cma_financials').filter(f => f.reportId === id);
      const assumptions = getDB('cma_assumptions').filter(a => a.reportId === id);
      const projections = getDB('cma_projections').filter(p => p.reportId === id).map(p => ({
        id: p.id,
        reportId: p.reportId,
        year: p.year,
        plProjection: p.plProjection,
        bsProjection: p.bsProjection,
        cfProjection: p.cfProjection,
        ratios: p.ratios,
        dscr: p.dscr,
        createdAt: p.createdAt
      }));
      const loanSchedule = getDB('cma_loan_schedules').find(l => l.reportId === id) || null;
      return {
        ...report,
        client,
        financialYears,
        assumptions,
        projections,
        loanSchedule
      } as any;
    }
    if (method === 'PUT') {
      const reports = getDB('cma_reports');
      const idx = reports.findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Report not found');
      
      const body = getBody();
      
      // Handle projectCost and meansOfFinance stringification
      const updated = {
        ...reports[idx],
        ...body,
        projectCost: body.projectCost ? (typeof body.projectCost === 'string' ? body.projectCost : JSON.stringify(body.projectCost)) : reports[idx].projectCost,
        meansOfFinance: body.meansOfFinance ? (typeof body.meansOfFinance === 'string' ? body.meansOfFinance : JSON.stringify(body.meansOfFinance)) : reports[idx].meansOfFinance,
        updatedAt: new Date().toISOString()
      };
      
      reports[idx] = updated;
      setDB('cma_reports', reports);
      
      // Auto-compute loan schedule if loan parameters are changed
      if (body.loanAmount || body.interestRate || body.loanTenure || body.moratoriumMonths !== undefined) {
        const schedule = computeLoanSchedule({
          loanAmount: Number(updated.loanAmount || 0),
          annualRate: Number(updated.interestRate || 12),
          tenureMonths: Number(updated.loanTenure || 60),
          moratoriumMonths: Number(updated.moratoriumMonths || 0)
        });
        const schedules = getDB('cma_loan_schedules').filter(l => l.reportId !== id);
        schedules.push({
          id: 'ls_' + Math.random().toString(36).substring(2, 11),
          reportId: id,
          loanAmount: Number(updated.loanAmount || 0),
          interestRate: Number(updated.interestRate || 12),
          tenureMonths: Number(updated.loanTenure || 60),
          moratoriumMonths: Number(updated.moratoriumMonths || 0),
          emiAmount: schedule.emi,
          scheduleData: JSON.stringify(schedule.schedule),
          createdAt: new Date().toISOString()
        });
        setDB('cma_loan_schedules', schedules);
      }

      return updated as any;
    }
    if (method === 'DELETE') {
      const reports = getDB('cma_reports');
      setDB('cma_reports', reports.filter(r => r.id !== id));
      return { success: true } as any;
    }
  }

  // ---- FINANCIALS ----
  params = matchRoute('/financials/:reportId');
  if (params) {
    const reportId = params.reportId;
    if (method === 'GET') {
      const financials = getDB('cma_financials');
      return financials.filter(f => f.reportId === reportId) as any;
    }
    if (method === 'POST') {
      const financials = getDB('cma_financials');
      const body = getBody();
      
      let isBalanced = false;
      if (body.bsAssets && body.bsLiabilities) {
        const assets = Object.values(body.bsAssets as Record<string, number>).reduce((a, b) => a + (b || 0), 0);
        const liabilities = Object.values(body.bsLiabilities as Record<string, number>).reduce((a, b) => a + (b || 0), 0);
        isBalanced = Math.abs(assets - liabilities) < 1;
      }

      const idx = financials.findIndex(f => f.reportId === reportId && f.year === body.year);
      const newOrUpdated = {
        id: idx !== -1 ? financials[idx].id : 'f_' + Math.random().toString(36).substring(2, 11),
        reportId,
        createdAt: idx !== -1 ? financials[idx].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        year: body.year,
        yearType: body.yearType || 'HISTORICAL',
        plData: body.plData ? (typeof body.plData === 'string' ? body.plData : JSON.stringify(body.plData)) : undefined,
        bsAssets: body.bsAssets ? (typeof body.bsAssets === 'string' ? body.bsAssets : JSON.stringify(body.bsAssets)) : undefined,
        bsLiabilities: body.bsLiabilities ? (typeof body.bsLiabilities === 'string' ? body.bsLiabilities : JSON.stringify(body.bsLiabilities)) : undefined,
        isBalanced
      };
      if (idx !== -1) {
        financials[idx] = newOrUpdated;
      } else {
        financials.push(newOrUpdated);
      }
      setDB('cma_financials', financials);
      return newOrUpdated as any;
    }
  }

  params = matchRoute('/financials/:reportId/:yearId');
  if (params) {
    const { reportId, yearId } = params;
    if (method === 'DELETE') {
      const financials = getDB('cma_financials');
      setDB('cma_financials', financials.filter(f => !(f.reportId === reportId && f.id === yearId)));
      return { success: true } as any;
    }
  }

  // ---- PROJECTIONS ----
  params = matchRoute('/projections/:reportId/assumptions');
  if (params) {
    const reportId = params.reportId;
    if (method === 'GET') {
      const assumptions = getDB('cma_assumptions');
      const ass = assumptions.find(a => a.reportId === reportId);
      if (ass) return ass as any;
      return {
        reportId,
        salesGrowthPct: 15,
        rawMaterialPct: 60,
        salaryGrowthPct: 10,
        adminExpensePct: 5,
        powerExpensePct: 3,
        interestRate: 12,
        depreciationRate: 10,
        taxRate: 25,
        inflationRate: 6,
        capacityUtilization: '[70, 80, 85, 90, 95]',
        debtorDays: 45,
        creditorDays: 30,
        inventoryDays: 60,
        projectionYears: 5
      } as any;
    }
    if (method === 'PUT') {
      const assumptions = getDB('cma_assumptions');
      const body = getBody();
      const idx = assumptions.findIndex(a => a.reportId === reportId);
      const newAss = {
        id: idx !== -1 ? assumptions[idx].id : 'a_' + Math.random().toString(36).substring(2, 11),
        reportId,
        createdAt: idx !== -1 ? assumptions[idx].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...body
      };
      if (idx !== -1) {
        assumptions[idx] = newAss;
      } else {
        assumptions.push(newAss);
      }
      setDB('cma_assumptions', assumptions);
      return newAss as any;
    }
  }

  params = matchRoute('/projections/:reportId/compute');
  if (params && method === 'POST') {
    const reportId = params.reportId;
    const reports = getDB('cma_reports');
    const report = reports.find(r => r.id === reportId);
    if (!report) throw new Error('Report not found');

    const financials = getDB('cma_financials').filter(f => f.reportId === reportId);
    const historicalYears = financials.filter(f => f.yearType === 'HISTORICAL' || !f.yearType);
    historicalYears.sort((a, b) => b.year.localeCompare(a.year));
    const baseYear = historicalYears[0];
    if (!baseYear) {
      throw new Error('Please input at least one historical financial year first');
    }

    const assumptions = getDB('cma_assumptions');
    let ass = assumptions.find(a => a.reportId === reportId);
    if (!ass) {
      ass = {
        salesGrowthPct: 15,
        rawMaterialPct: 60,
        salaryGrowthPct: 10,
        adminExpensePct: 5,
        powerExpensePct: 3,
        interestRate: 12,
        depreciationRate: 10,
        taxRate: 25,
        capacityUtilization: '[70, 80, 85, 90, 95]',
        projectionYears: 5
      };
    }

    const basePL = baseYear.plData ? safeParseJSON(baseYear.plData) : {};
    const baseBS = {
      assets: baseYear.bsAssets ? safeParseJSON(baseYear.bsAssets) : {},
      liabilities: baseYear.bsLiabilities ? safeParseJSON(baseYear.bsLiabilities) : {}
    };

    const computed = computeProjections({
      basePL,
      baseBS,
      assumption: ass,
      report: {
        loanAmount: report.loanAmount,
        interestRate: report.interestRate,
        loanTenure: report.loanTenure,
        moratoriumMonths: report.moratoriumMonths,
        projectCost: report.projectCost
      }
    });

    const projectionsDB = getDB('cma_projections').filter(p => p.reportId !== reportId);
    computed.forEach((p: any) => {
      projectionsDB.push({
        id: 'p_' + Math.random().toString(36).substring(2, 11),
        reportId,
        year: p.year,
        plProjection: JSON.stringify(p.pl),
        bsProjection: JSON.stringify(p.bs),
        cfProjection: JSON.stringify(p.cf),
        ratios: JSON.stringify(p.ratios),
        dscr: p.ratios.dscr,
        createdAt: new Date().toISOString()
      });
    });
    setDB('cma_projections', projectionsDB);

    const idx = reports.findIndex(r => r.id === reportId);
    if (idx !== -1) {
      reports[idx].status = 'IN_PROGRESS';
      setDB('cma_reports', reports);
    }

    return computed as any;
  }

  params = matchRoute('/projections/:reportId');
  if (params && method === 'GET') {
    const reportId = params.reportId;
    const projections = getDB('cma_projections').filter(p => p.reportId === reportId);
    const loanSchedule = getDB('cma_loan_schedules').find(l => l.reportId === reportId) || null;
    return {
      projections: projections.map(p => ({
        id: p.id,
        reportId: p.reportId,
        year: p.year,
        plProjection: p.plProjection,
        bsProjection: p.bsProjection,
        cfProjection: p.cfProjection,
        ratios: p.ratios,
        dscr: p.dscr,
        createdAt: p.createdAt
      })),
      loanSchedule
    } as any;
  }

  // ---- AI ----
  params = matchRoute('/ai/:reportId/generate');
  if (params && method === 'POST') {
    const reportId = params.reportId;
    const body = getBody();
    const mod = body.module || 'executive_summary';

    const reports = getDB('cma_reports');
    const rep = reports.find(r => r.id === reportId);
    const client = getDB('cma_clients').find(c => c.id === rep?.clientId);
    const clientName = client?.name || 'the client';
    const bizName = client?.businessName || 'the business';
    const loanAmountStr = rep?.loanAmount ? `₹${(rep.loanAmount / 100000).toFixed(2)} Lakhs` : 'the requested loan';

    let responseText = '';
    if (mod === 'executive_summary') {
      responseText = `### Executive Summary for ${bizName}\n\n**1. Overview**\n${clientName} is seeking a credit facility of ${loanAmountStr} to fund its business operations and expansion plans. The business operates as a ${client?.constitution || 'Proprietorship'} in the ${client?.industryType || 'Services'} sector.\n\n**2. Key Strengths**\n* Experienced promoter background with established business relationships.\n* Healthy revenue growth projection over the next 5 years.\n* Balanced capital structure and solid debt service capabilities.\n\n**3. Recommendations**\nBased on our banking-grade financial underwriting, the loan request is highly viable with strong DSCR metrics. We recommend sanctioning the requested amount with standard hypothecation of current assets.`;
    } else if (mod === 'swot_analysis') {
      responseText = `### SWOT Analysis\n\n**Strengths:**\n* Consistent operational history and solid promoter track record.\n* High quality current ratio indicating strong short-term liquidity.\n\n**Weaknesses:**\n* Concentration of credit in local markets.\n* Higher working capital cycle compared to industry average.\n\n**Opportunities:**\n* Expansion into new geographical regions.\n* Increasing demand in the ${client?.industryType || 'target'} sector.\n\n**Threats:**\n* Raw material price fluctuations.\n* Rising competition from regional players.`;
    } else {
      responseText = `### Financial & Risk Analysis\n\n**Financial Assessment:**\nAn analysis of the projected statements indicates a healthy debt-to-equity structure. Operating margins remain stable under base case scenarios. DSCR is projected to remain comfortably above the banking benchmark of 1.25x throughout the tenure.\n\n**Risk Mitigation:**\n* Interest rate risks are mitigated by floating rate covenants.\n* Collateral coverage ratio is estimated at 1.5x, offering adequate security.`;
    }

    const aiLogs = getDB('cma_ai_logs');
    const newLog = {
      id: 'l_' + Math.random().toString(36).substring(2, 11),
      reportId,
      prompt: `Generate ${mod}`,
      response: responseText,
      module: mod,
      createdAt: new Date().toISOString()
    };
    aiLogs.push(newLog);
    setDB('cma_ai_logs', aiLogs);
    return { content: responseText, module: mod, tokens: { input_tokens: 0, output_tokens: 0 } } as any;
  }

  params = matchRoute('/ai/:reportId/history');
  if (params && method === 'GET') {
    const reportId = params.reportId;
    return getDB('cma_ai_logs').filter(l => l.reportId === reportId) as any;
  }

  params = matchRoute('/ai/:reportId/parse-financials');
  if (params && method === 'POST') {
    return {
      plData: {
        grossSales: 15000000,
        otherIncome: 500000,
        rawMaterial: 9000000,
        salaryWages: 1200000,
        powerFuel: 450000,
        manufacturingExp: 600000,
        adminExp: 500000,
        sellingExp: 300000,
        rent: 240000,
        repairMaintenance: 150000,
        depreciation: 800000,
        interestExp: 400000,
        taxExpense: 200000
      },
      bsAssets: {
        landBuilding: 5000000,
        plantMachinery: 4000000,
        furniture: 500000,
        vehicle: 800000,
        investments: 0,
        inventory: 2500000,
        sundryDebtors: 2000000,
        cashBank: 800000,
        loansAdvances: 200000,
        otherCurrentAssets: 100000
      },
      bsLiabilities: {
        shareCapital: 1000000,
        reserves: 4000000,
        securedLoan: 3000000,
        unsecuredLoan: 1000000,
        ccOdLimit: 1200000,
        tradeCreditors: 1500000,
        otherCurrentLiab: 400000,
        provisions: 300000
      }
    } as any;
  }

  // ---- MAPPINGS ----
  if (cleanPath === '/mappings/suggest' && method === 'POST') {
    return { targetField: 'grossSales', confidence: 0.95 } as any;
  }
  if (cleanPath === '/mappings/bulk-suggest' && method === 'POST') {
    const body = getBody();
    const suggestions: Record<string, any> = {};
    body.labels.forEach((l: string) => {
      suggestions[l] = { targetField: 'otherIncome', confidence: 0.8 };
    });
    return suggestions as any;
  }
  if (cleanPath === '/mappings/learn' && method === 'POST') {
    return { success: true } as any;
  }

  // ---- EXPORTS ----
  params = matchRoute('/exports/:reportId/excel');
  if (params && method === 'POST') {
    const reportId = params.reportId;
    const reports = getDB('cma_reports');
    const report = reports.find(r => r.id === reportId);
    if (!report) throw new Error('Report not found');

    const client = getDB('cma_clients').find(c => c.id === report.clientId);
    const financials = getDB('cma_financials').filter(f => f.reportId === reportId);
    const projections = getDB('cma_projections').filter(p => p.reportId === reportId).map(p => ({
      year: p.year,
      plProjection: safeParseJSON(p.plProjection),
      bsProjection: safeParseJSON(p.bsProjection),
      cfProjection: safeParseJSON(p.cfProjection),
      ratios: safeParseJSON(p.ratios)
    }));

    const loanSchedule = report.loanAmount ? computeLoanSchedule({
      loanAmount: report.loanAmount,
      annualRate: report.interestRate || 12,
      tenureMonths: report.loanTenure || 60,
      moratoriumMonths: report.moratoriumMonths || 0
    }) : { emi: 0, schedule: [] };

    return {
      success: true,
      fileName: `CMA_Report_${client?.name?.replace(/\s+/g, '_') || 'Report'}.xlsx`,
      data: {
        report: {
          ...report,
          client
        },
        financialYears: financials.map(f => ({
          ...f,
          plData: f.plData ? safeParseJSON(f.plData) : {},
          bsAssets: f.bsAssets ? safeParseJSON(f.bsAssets) : {},
          bsLiabilities: f.bsLiabilities ? safeParseJSON(f.bsLiabilities) : {}
        })),
        projections,
        loanSchedule: {
          scheduleData: loanSchedule.schedule
        }
      }
    } as any;
  }

  params = matchRoute('/exports/:reportId/files');
  if (params && method === 'GET') {
    return [
      { id: '1', fileName: 'CMA_Report.xlsx', fileSize: 15200, createdAt: new Date().toISOString(), fileType: 'EXCEL_CMA' }
    ] as any;
  }

  throw new Error(`Offline route not implemented: ${cleanPath}`);
}

export const api = {
  clients: {
    list: (userId?: string) => fetchAPI<any[]>(`/clients${userId ? `?userId=${userId}` : ''}`),
    get: (id: string) => fetchAPI<any>(`/clients/${id}`),
    create: (data: any) => fetchAPI<any>('/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchAPI<any>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI<any>(`/clients/${id}`, { method: 'DELETE' })
  },

  reports: {
    list: (clientId?: string, userId?: string) => {
      const params = [];
      if (clientId) params.push(`clientId=${clientId}`);
      if (userId) params.push(`userId=${userId}`);
      const qs = params.length > 0 ? `?${params.join('&')}` : '';
      return fetchAPI<any[]>(`/reports${qs}`);
    },
    get: (id: string) => fetchAPI<any>(`/reports/${id}`),
    create: (data: any) => fetchAPI<any>('/reports', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => fetchAPI<any>(`/reports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchAPI<any>(`/reports/${id}`, { method: 'DELETE' })
  },

  financials: {
    list: (reportId: string) => fetchAPI<any[]>(`/financials/${reportId}`),
    upsert: (reportId: string, data: any) => fetchAPI<any>(`/financials/${reportId}`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (reportId: string, yearId: string) => fetchAPI<any>(`/financials/${reportId}/${yearId}`, { method: 'DELETE' })
  },

  projections: {
    getAssumptions: (reportId: string) => fetchAPI<any>(`/projections/${reportId}/assumptions`),
    saveAssumptions: (reportId: string, data: any) => fetchAPI<any>(`/projections/${reportId}/assumptions`, { method: 'PUT', body: JSON.stringify(data) }),
    compute: (reportId: string) => fetchAPI<any>(`/projections/${reportId}/compute`, { method: 'POST' }),
    get: (reportId: string) => fetchAPI<any>(`/projections/${reportId}`)
  },

  ai: {
    generate: (reportId: string, module: string) => fetchAPI<any>(`/ai/${reportId}/generate`, { method: 'POST', body: JSON.stringify({ module }) }),
    history: (reportId: string) => fetchAPI<any[]>(`/ai/${reportId}/history`),
    parseFinancials: (reportId: string, rawText: string) => fetchAPI<any>(`/ai/${reportId}/parse-financials`, { method: 'POST', body: JSON.stringify({ rawText }) })
  },

  mappings: {
    suggest: (label: string) => fetchAPI<any>('/mappings/suggest', { method: 'POST', body: JSON.stringify({ label }) }),
    bulkSuggest: (labels: string[]) => fetchAPI<any>('/mappings/bulk-suggest', { method: 'POST', body: JSON.stringify({ labels }) }),
    learn: (sourceLabel: string, targetField: string) => fetchAPI<any>('/mappings/learn', { method: 'POST', body: JSON.stringify({ sourceLabel, targetField }) })
  },

  exports: {
    excel: (reportId: string) => fetchAPI<any>(`/exports/${reportId}/excel`, { method: 'POST' }),
    files: (reportId: string) => fetchAPI<any[]>(`/exports/${reportId}/files`)
  }
};
