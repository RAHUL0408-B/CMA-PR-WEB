import { useState } from 'react';
import { api } from '../../../lib/api';

const AI_MODULES = [
  { key: 'executive_summary', label: 'Executive Summary', icon: '📋', desc: 'High-level summary for banker presentation' },
  { key: 'key_positives', label: 'Key Positives', icon: '✅', desc: 'Financial strengths and positive indicators' },
  { key: 'key_concerns', label: 'Key Concerns / Risks', icon: '⚠️', desc: 'Risk factors and areas needing attention' },
  { key: 'ratio_commentary', label: 'Ratio Commentary', icon: '📊', desc: 'Analysis of financial ratios and trends' },
  { key: 'creditworthiness', label: 'Creditworthiness', icon: '🏦', desc: 'Credit recommendation with assessment' },
  { key: 'swot_analysis', label: 'SWOT Analysis', icon: '🎯', desc: 'Strengths, Weaknesses, Opportunities, Threats' },
];

export default function AICommentaryTab({ reportId, report }: { reportId: string; report: any }) {
  const [generated, setGenerated] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [generateAll, setGenerateAll] = useState(false);

  const generate = async (module: string) => {
    setLoading(l => ({...l, [module]: true}));
    setError('');
    try {
      const res = await api.ai.generate(reportId, module);
      setGenerated(g => ({...g, [module]: res.content}));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(l => ({...l, [module]: false}));
    }
  };

  const generateAllModules = async () => {
    setGenerateAll(true);
    for (const m of AI_MODULES) {
      await generate(m.key);
    }
    setGenerateAll(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Brief feedback
    });
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <h3 style={{fontSize:15,fontWeight:700}}>🤖 AI Financial Commentary</h3>
          <p style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>
            Powered by Claude AI · Generate professional bank-ready commentary
          </p>
        </div>
        <button className="btn btn-primary" onClick={generateAllModules} disabled={generateAll}>
          {generateAll ? <><span className="spinner" />Generating All...</> : '⚡ Generate All'}
        </button>
      </div>

      <div className="alert alert-info">
        <div>
          <strong>AI Commentary Guidelines:</strong> AI generates narrative text based on your financial data.
          All calculations are performed by the financial engine, not AI. Review all AI-generated content before submission.
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Report Info Summary */}
      <div className="card">
        <div className="card-header"><div className="card-title">Report Context</div></div>
        <div className="card-body">
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            {[
              ['Business', report.client?.businessName || report.client?.name],
              ['Industry', report.client?.industryType || '—'],
              ['Loan Type', report.loanType || '—'],
              ['Amount', report.loanAmount ? `₹${Number(report.loanAmount).toLocaleString('en-IN')} Lakhs` : '—'],
            ].map(([k,v]) => (
              <div key={k as string}>
                <div style={{fontSize:10,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:0.5}}>{k}</div>
                <div style={{fontSize:13,fontWeight:600,marginTop:2}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module Cards */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {AI_MODULES.map(m => (
          <div key={m.key} className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{m.icon} {m.label}</div>
                <div className="card-subtitle">{m.desc}</div>
              </div>
              <div style={{display:'flex',gap:6}}>
                {generated[m.key] && (
                  <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(generated[m.key])}>
                    Copy
                  </button>
                )}
                <button className="btn btn-primary btn-sm" onClick={() => generate(m.key)} disabled={loading[m.key]}>
                  {loading[m.key] ? <><span className="spinner" />...</> : generated[m.key] ? '↺ Regen' : 'Generate'}
                </button>
              </div>
            </div>
            <div className="card-body">
              {loading[m.key] ? (
                <div style={{padding:'20px 0',textAlign:'center'}}>
                  <div className="spinner spinner-dark" style={{width:20,height:20,margin:'0 auto 8px'}} />
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>Analyzing financial data...</div>
                </div>
              ) : generated[m.key] ? (
                <div style={{
                  fontSize:13,lineHeight:1.7,color:'var(--text-primary)',
                  whiteSpace:'pre-wrap',maxHeight:200,overflowY:'auto',
                  background:'var(--bg-surface-2)',padding:12,borderRadius:6
                }}>
                  {generated[m.key]}
                </div>
              ) : (
                <div style={{
                  padding:'20px 0',textAlign:'center',color:'var(--text-muted)',fontSize:12,
                  border:'2px dashed var(--border)',borderRadius:6
                }}>
                  Click "Generate" to create AI commentary
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* All Generated Content for Copy */}
      {Object.keys(generated).length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">📄 Full Commentary (All Modules)</div>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              const full = Object.entries(generated)
                .map(([k, v]) => `## ${AI_MODULES.find(m => m.key === k)?.label}\n\n${v}`)
                .join('\n\n---\n\n');
              copyToClipboard(full);
            }}>
              Copy All
            </button>
          </div>
          <div className="card-body">
            <div style={{fontSize:12,color:'var(--text-muted)'}}>
              {Object.keys(generated).length} of {AI_MODULES.length} sections generated
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
