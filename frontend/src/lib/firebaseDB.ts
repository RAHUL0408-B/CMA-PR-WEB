/**
 * firebaseDB.ts
 * All read/write operations for Firebase Realtime Database.
 *
 * Data structure (per-user isolation):
 *   /cma/users/{userId}/clients/{clientId}
 *   /cma/users/{userId}/reports/{reportId}
 *   /cma/users/{userId}/financials/{financialId}
 *   /cma/users/{userId}/projections/{projectionId}
 *   /cma/users/{userId}/assumptions/{reportId}
 *   /cma/users/{userId}/loanSchedules/{reportId}
 *   /cma/users/{userId}/aiLogs/{logId}
 */
import {
  ref, get, set, push, update, remove, onValue, off,
  type DatabaseReference
} from 'firebase/database';
import { auth, db, isRealtimeReady } from './firebase';
import { computeProjections, computeLoanSchedule } from './projectionEngine';

// ── Get current logged-in user ID ──────────────────────────────
function getUserId(): string {
  const uid = auth?.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated. Please sign in first.');
  return uid;
}

// ── Build a DB ref scoped to the current user ──────────────────
function userRef(path: string): DatabaseReference {
  return ref(db!, `cma/users/${getUserId()}/${path}`);
}

// ── Snapshot helpers ───────────────────────────────────────────
const snap2arr = (snap: any): any[] => {
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.keys(val).map(k => ({ id: k, ...val[k] }));
};

// ── ID generator ───────────────────────────────────────────────
const genId = () => '_' + Math.random().toString(36).substring(2, 11);

export function safeParseJSON(val: any, fallback: any = {}): any {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

// ═════════════════════════════════════════════════════════════════
// CLIENTS  — /cma/users/{uid}/clients
// ═════════════════════════════════════════════════════════════════
export async function fbGetClients(): Promise<any[]> {
  const [clientSnap, repSnap] = await Promise.all([
    get(userRef('clients')),
    get(userRef('reports'))
  ]);
  const clients = snap2arr(clientSnap);
  const reports = snap2arr(repSnap);
  return clients.map(c => ({
    ...c,
    _count: { reports: reports.filter(r => r.clientId === c.id).length }
  }));
}

export async function fbGetClient(id: string): Promise<any> {
  const snap = await get(userRef(`clients/${id}`));
  if (!snap.exists()) throw new Error('Client not found');
  const client = { id, ...snap.val() };
  const repSnap = await get(userRef('reports'));
  const reports = snap2arr(repSnap).filter(r => r.clientId === id);
  return { ...client, reports };
}

export async function fbCreateClient(data: any): Promise<any> {
  const newRef = push(userRef('clients'));
  const newClient = {
    ...data,
    userId: getUserId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await set(newRef, newClient);
  return { id: newRef.key, ...newClient };
}

export async function fbUpdateClient(id: string, data: any): Promise<any> {
  const updated = { ...data, updatedAt: new Date().toISOString() };
  await update(userRef(`clients/${id}`), updated);
  return { id, ...updated };
}

export async function fbDeleteClient(id: string): Promise<void> {
  await remove(userRef(`clients/${id}`));
}

// ═════════════════════════════════════════════════════════════════
// REPORTS  — /cma/users/{uid}/reports
// ═════════════════════════════════════════════════════════════════
export async function fbGetReports(clientId?: string): Promise<any[]> {
  const [repSnap, clientSnap, finSnap] = await Promise.all([
    get(userRef('reports')),
    get(userRef('clients')),
    get(userRef('financials'))
  ]);
  let reports = snap2arr(repSnap);
  if (clientId) reports = reports.filter(r => r.clientId === clientId);

  const clients = snap2arr(clientSnap);
  const fins = snap2arr(finSnap);

  return reports.map(r => {
    const client = clients.find(c => c.id === r.clientId);
    const finCount = fins.filter(f => f.reportId === r.id).length;
    return {
      ...r,
      client: client ? { name: client.name, businessName: client.businessName } : null,
      _count: { financialYears: finCount, generatedFiles: 1 }
    };
  });
}

export async function fbGetReport(id: string): Promise<any> {
  const [repSnap, clientsSnap, finSnap, assSnap, projSnap, lsSnap] = await Promise.all([
    get(userRef(`reports/${id}`)),
    get(userRef('clients')),
    get(userRef('financials')),
    get(userRef(`assumptions/${id}`)),
    get(userRef('projections')),
    get(userRef(`loanSchedules/${id}`))
  ]);

  if (!repSnap.exists()) throw new Error('Report not found');
  const report = { id, ...repSnap.val() };
  const client = snap2arr(clientsSnap).find(c => c.id === report.clientId) || null;

  const financialYears = snap2arr(finSnap).filter(f => f.reportId === id);
  const assumptions = assSnap.exists() ? { id, ...assSnap.val() } : null;
  const projections = snap2arr(projSnap)
    .filter(p => p.reportId === id)
    .map(p => ({
      id: p.id, reportId: p.reportId, year: p.year,
      plProjection: p.plProjection, bsProjection: p.bsProjection,
      cfProjection: p.cfProjection, ratios: p.ratios, dscr: p.dscr,
      createdAt: p.createdAt
    }));
  const loanSchedule = lsSnap.exists() ? { id, ...lsSnap.val() } : null;

  return { ...report, client, financialYears, assumptions, projections, loanSchedule };
}

export async function fbCreateReport(data: any): Promise<any> {
  const newRef = push(userRef('reports'));
  const newReport = {
    ...data,
    userId: getUserId(),
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await set(newRef, newReport);
  return { id: newRef.key, ...newReport };
}

export async function fbUpdateReport(id: string, data: any): Promise<any> {
  const body = { ...data };
  if (body.projectCost && typeof body.projectCost === 'object')
    body.projectCost = JSON.stringify(body.projectCost);
  if (body.meansOfFinance && typeof body.meansOfFinance === 'object')
    body.meansOfFinance = JSON.stringify(body.meansOfFinance);

  const updated = { ...body, updatedAt: new Date().toISOString() };
  await update(userRef(`reports/${id}`), updated);

  // Auto-compute loan schedule if loan params changed
  if (body.loanAmount || body.interestRate || body.loanTenure || body.moratoriumMonths !== undefined) {
    const snap = await get(userRef(`reports/${id}`));
    const full = { id, ...snap.val() };
    const schedule = computeLoanSchedule({
      loanAmount: Number(full.loanAmount || 0),
      annualRate: Number(full.interestRate || 12),
      tenureMonths: Number(full.loanTenure || 60),
      moratoriumMonths: Number(full.moratoriumMonths || 0)
    });
    await set(userRef(`loanSchedules/${id}`), {
      reportId: id,
      loanAmount: Number(full.loanAmount || 0),
      interestRate: Number(full.interestRate || 12),
      tenureMonths: Number(full.loanTenure || 60),
      moratoriumMonths: Number(full.moratoriumMonths || 0),
      emiAmount: schedule.emi,
      scheduleData: JSON.stringify(schedule.schedule),
      createdAt: new Date().toISOString()
    });
  }

  return { id, ...updated };
}

export async function fbDeleteReport(id: string): Promise<void> {
  await remove(userRef(`reports/${id}`));
}

// ═════════════════════════════════════════════════════════════════
// FINANCIALS  — /cma/users/{uid}/financials
// ═════════════════════════════════════════════════════════════════
export async function fbGetFinancials(reportId: string): Promise<any[]> {
  const snap = await get(userRef('financials'));
  return snap2arr(snap).filter(f => f.reportId === reportId);
}

export async function fbUpsertFinancial(reportId: string, data: any): Promise<any> {
  const snap = await get(userRef('financials'));
  const existing = snap2arr(snap).find(f => f.reportId === reportId && f.year === data.year);

  let isBalanced = false;
  if (data.bsAssets && data.bsLiabilities) {
    const assets = Object.values(safeParseJSON(data.bsAssets) as Record<string, number>)
      .reduce((a, b) => a + (b || 0), 0);
    const liabs = Object.values(safeParseJSON(data.bsLiabilities) as Record<string, number>)
      .reduce((a, b) => a + (b || 0), 0);
    isBalanced = Math.abs(assets - liabs) < 1;
  }

  const record = {
    reportId,
    year: data.year,
    yearType: data.yearType || 'HISTORICAL',
    plData:        typeof data.plData === 'object'        ? JSON.stringify(data.plData)        : (data.plData || '{}'),
    bsAssets:      typeof data.bsAssets === 'object'      ? JSON.stringify(data.bsAssets)      : (data.bsAssets || '{}'),
    bsLiabilities: typeof data.bsLiabilities === 'object' ? JSON.stringify(data.bsLiabilities) : (data.bsLiabilities || '{}'),
    isBalanced,
    updatedAt: new Date().toISOString()
  };

  if (existing) {
    await update(userRef(`financials/${existing.id}`), record);
    return { id: existing.id, ...record, createdAt: existing.createdAt };
  } else {
    const newRef = push(userRef('financials'));
    const full = { ...record, createdAt: new Date().toISOString() };
    await set(newRef, full);
    return { id: newRef.key, ...full };
  }
}

export async function fbDeleteFinancial(_reportId: string, yearId: string): Promise<void> {
  await remove(userRef(`financials/${yearId}`));
}

// ═════════════════════════════════════════════════════════════════
// PROJECTIONS & ASSUMPTIONS  — /cma/users/{uid}/projections|assumptions
// ═════════════════════════════════════════════════════════════════
export async function fbGetAssumptions(reportId: string): Promise<any> {
  const snap = await get(userRef(`assumptions/${reportId}`));
  if (snap.exists()) return { reportId, ...snap.val() };
  return {
    reportId, salesGrowthPct: 15, rawMaterialPct: 60, salaryGrowthPct: 10,
    adminExpensePct: 5, powerExpensePct: 3, interestRate: 12, depreciationRate: 10,
    taxRate: 25, inflationRate: 6, capacityUtilization: '[70,80,85,90,95]',
    debtorDays: 45, creditorDays: 30, inventoryDays: 60, projectionYears: 5
  };
}

export async function fbSaveAssumptions(reportId: string, data: any): Promise<any> {
  const record = { ...data, reportId, updatedAt: new Date().toISOString() };
  await set(userRef(`assumptions/${reportId}`), record);
  return record;
}

export async function fbComputeProjections(reportId: string): Promise<any[]> {
  const [reportSnap, finSnap, assSnap] = await Promise.all([
    get(userRef(`reports/${reportId}`)),
    get(userRef('financials')),
    get(userRef(`assumptions/${reportId}`))
  ]);

  if (!reportSnap.exists()) throw new Error('Report not found');
  const report = { id: reportId, ...reportSnap.val() };

  const allFins = snap2arr(finSnap).filter(f => f.reportId === reportId);
  const historical = allFins
    .filter(f => f.yearType === 'HISTORICAL' || !f.yearType)
    .sort((a, b) => b.year.localeCompare(a.year));

  if (!historical.length) throw new Error('Please add at least one historical financial year first.');

  const baseYear = historical[0];
  const ass = assSnap.exists() ? assSnap.val() : {
    salesGrowthPct: 15, rawMaterialPct: 60, salaryGrowthPct: 10,
    adminExpensePct: 5, powerExpensePct: 3, interestRate: 12,
    depreciationRate: 10, taxRate: 25,
    capacityUtilization: '[70,80,85,90,95]', projectionYears: 5
  };

  const computed = computeProjections({
    basePL: safeParseJSON(baseYear.plData),
    baseBS: {
      assets: safeParseJSON(baseYear.bsAssets),
      liabilities: safeParseJSON(baseYear.bsLiabilities)
    },
    assumption: ass,
    report: {
      loanAmount: report.loanAmount, interestRate: report.interestRate,
      loanTenure: report.loanTenure, moratoriumMonths: report.moratoriumMonths,
      projectCost: report.projectCost
    }
  });

  // Save projections under user scope
  const projUpdates: Record<string, any> = {};
  computed.forEach((p: any) => {
    const k = push(userRef('projections')).key || genId();
    projUpdates[k] = {
      reportId, year: p.year,
      plProjection: JSON.stringify(p.pl),
      bsProjection: JSON.stringify(p.bs),
      cfProjection: JSON.stringify(p.cf),
      ratios: JSON.stringify(p.ratios),
      dscr: p.ratios.dscr,
      createdAt: new Date().toISOString()
    };
  });
  await update(userRef('projections'), projUpdates);
  await update(userRef(`reports/${reportId}`), {
    status: 'IN_PROGRESS',
    updatedAt: new Date().toISOString()
  });

  return computed;
}

export async function fbGetProjections(reportId: string): Promise<any> {
  const [projSnap, lsSnap] = await Promise.all([
    get(userRef('projections')),
    get(userRef(`loanSchedules/${reportId}`))
  ]);
  const projections = snap2arr(projSnap)
    .filter(p => p.reportId === reportId)
    .map(p => ({
      id: p.id, reportId: p.reportId, year: p.year,
      plProjection: p.plProjection, bsProjection: p.bsProjection,
      cfProjection: p.cfProjection, ratios: p.ratios, dscr: p.dscr,
      createdAt: p.createdAt
    }));
  const loanSchedule = lsSnap.exists() ? { id: reportId, ...lsSnap.val() } : null;
  return { projections, loanSchedule };
}

// ═════════════════════════════════════════════════════════════════
// AI LOGS  — /cma/users/{uid}/aiLogs
// ═════════════════════════════════════════════════════════════════
export async function fbSaveAILog(reportId: string, module: string, response: string): Promise<any> {
  const newRef = push(userRef('aiLogs'));
  const log = {
    reportId, module,
    prompt: `Generate ${module}`,
    response,
    createdAt: new Date().toISOString()
  };
  await set(newRef, log);
  return { id: newRef.key, ...log };
}

export async function fbGetAIHistory(reportId: string): Promise<any[]> {
  const snap = await get(userRef('aiLogs'));
  return snap2arr(snap).filter(l => l.reportId === reportId);
}

// ═════════════════════════════════════════════════════════════════
// REAL-TIME LISTENERS (live updates for dashboard)
// ═════════════════════════════════════════════════════════════════
export function listenToClients(callback: (clients: any[]) => void) {
  if (!isRealtimeReady() || !auth?.currentUser) return () => {};
  const r = userRef('clients');
  onValue(r, snap => callback(snap2arr(snap)));
  return () => off(r);
}

export function listenToReports(callback: (reports: any[]) => void) {
  if (!isRealtimeReady() || !auth?.currentUser) return () => {};
  const r = userRef('reports');
  onValue(r, snap => callback(snap2arr(snap)));
  return () => off(r);
}
