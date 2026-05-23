import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export default function PreviewTab({ reportId }: { reportId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.reports.get(reportId).then(setData).finally(() => setLoading(false));
  }, [reportId]);

  if (loading) return <div className="spinner" />;

  return (
    <div className="cma-form-card fade-in">
      <h2 className="cma-section-title">Report Preview</h2>
      
      <div className="card" style={{padding:40, background:'#fff', border:'1px solid #e2e8f0', maxWidth:800, margin:'0 auto'}}>
        <div style={{textAlign:'center', marginBottom:60}}>
          <h1 style={{fontSize:32, fontWeight:800, color:'#1e293b', marginBottom:10}}>CMA REPORT</h1>
          <div style={{fontSize:18, color:'#64748b'}}>{data?.title}</div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:40, marginBottom:40}}>
          <div>
            <div style={{fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:8}}>Prepared For</div>
            <div style={{fontSize:16, fontWeight:700, color:'#1e293b'}}>M/s {data?.client?.businessName || data?.client?.name}</div>
            <div style={{fontSize:14, color:'#64748b', marginTop:4}}>{data?.client?.address}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:8}}>Date</div>
            <div style={{fontSize:16, fontWeight:700, color:'#1e293b'}}>{new Date().toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        <div style={{borderTop:'2px solid #f1f5f9', paddingTop:40}}>
          <h3 style={{fontSize:14, fontWeight:700, color:'#1e293b', marginBottom:20}}>Executive Summary</h3>
          <p style={{fontSize:14, color:'#475569', lineHeight:1.6}}>
            This Comprehensive Management Analysis (CMA) report is prepared for <strong>{data?.client?.businessName}</strong> 
            for the purpose of seeking a loan of <strong>₹{data?.loanAmount} Lakhs</strong> 
            under the <strong>{data?.loanType}</strong> category.
          </p>
        </div>
      </div>
    </div>
  );
}
