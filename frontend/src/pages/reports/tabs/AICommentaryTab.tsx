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
  const [apiKeyError, setApiKeyError] = useState(false);
  const [generateAll, setGenerateAll] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = async (module: string) => {
    setLoading(l => ({...l, [module]: true}));
    setError('');
    setApiKeyError(false);
    try {
      const res = await api.ai.generate(reportId, module);
      // Handle both online mode { content } and offline mode { content }
      const text = res.content || res.response || '';
      if (!text) throw new Error('No content returned from AI');
      setGenerated(g => ({...g, [module]: text}));
    } catch (err: any) {
      const msg = err.message || 'Failed to generate';
      if (msg.includes('API key') || msg.includes('ANTHROPIC_API_KEY') || msg.includes('503') || msg.includes('auth')) {
        setApiKeyError(true);
        setError('AI API key not configured. Please set up your Anthropic API key.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(l => ({...l, [module]: false}));
    }
  };

  const generateAllModules = async () => {
    setGenerateAll(true);
    setApiKeyError(false);
    for (const m of AI_MODULES) {
      await generate(m.key);
      if (apiKeyError) break; // Stop if API key issue
    }
    setGenerateAll(false);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
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

      {/* API Key Setup Guide */}
      {apiKeyError && (
        <div className="card" style={{border:'2px solid #f59e0b',background:'#fffbeb'}}>
          <div className="card-body">
            <div style={{fontWeight:700,fontSize:14,color:'#92400e',marginBottom:8}}>
              🔑 Anthropic API Key Required
            </div>
            <p style={{fontSize:13,color:'#78350f',marginBottom:10,lineHeight:1.6}}>
              AI commentary requires an Anthropic (Claude) API key. Follow these steps to set it up:
            </p>
            <ol style={{fontSize:13,color:'#78350f',paddingLeft:20,lineHeight:2}}>
              <li>Visit <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{color:'#1d4ed8',fontWeight:600}}>console.anthropic.com</a> and create a free account</li>
              <li>Go to API Keys section and create a new API key</li>
              <li>Open the file: <code style={{background:'#fef3c7',padding:'2px 6px',borderRadius:4,fontFamily:'monospace'}}>backend/.env</code></li>
              <li>Replace <code style={{background:'#fef3c7',padding:'2px 6px',borderRadius:4,fontFamily:'monospace'}}>your_anthropic_api_key_here</code> with your actual key</li>
              <li>Restart the backend server</li>
            </ol>
            <div style={{marginTop:10,padding:'8px 12px',background:'#fef3c7',borderRadius:6,fontFamily:'monospace',fontSize:12,color:'#78350f'}}>
              ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
            </div>
            <p style={{fontSize:12,color:'#92400e',marginTop:8}}>
              💡 <strong>Offline mode:</strong> If you're not using the backend server, sample commentary is generated automatically without needing an API key.
            </p>
          </div>
        </div>
      )}

      {!apiKeyError && (
        <div className="alert alert-info">
          <div>
            <strong>AI Commentary Guidelines:</strong> AI generates narrative text based on your financial data.
            All calculations are performed by the financial engine, not AI. Review all AI-generated content before submission.
          </div>
        </div>
      )}

      {error && !apiKeyError && <div className="alert alert-error">{error}</div>}

      {/* Report Info Summary */}
      <div className="card">
        <div className="card-header"><div className="card-title">Report Context</div></div>
        <div className="card-body">
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            {[
              ['Business', report.client?.businessName || report.client?.name || '—'],
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
                  <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(generated[m.key], m.key)}>
                    {copied === m.key ? '✓ Copied!' : 'Copy'}
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
              copyToClipboard(full, 'all');
            }}>
              {copied === 'all' ? '✓ Copied!' : 'Copy All'}
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
