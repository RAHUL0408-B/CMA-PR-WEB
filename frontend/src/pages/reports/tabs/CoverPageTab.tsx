export default function CoverPageTab({ report, onSave }: { report: any; onSave: (d: any) => void }) {
  return (
    <div className="cma-form-card fade-in">
      <h2 className="cma-section-title">Edit Cover Page</h2>
      
      <div className="cma-form-group">
        <div className="cma-label">Report Title *</div>
        <input className="cma-input" 
          defaultValue={report.title} 
          onBlur={e => onSave({ title: e.target.value })} 
          placeholder="e.g. Project Report for Dairy Farm" />
      </div>

      <div className="cma-form-group">
        <div className="cma-label">Report Type *</div>
        <select className="cma-input"
          defaultValue={report.reportType}
          onChange={e => onSave({ reportType: e.target.value })}>
          <option value="CMA">CMA Report (Credit Monitoring Arrangement)</option>
          <option value="PROJECT_REPORT">Project Report (Detailed Project Report - DPR)</option>
        </select>
      </div>

      <div className="cma-form-group">
        <div className="cma-label">Loan Type *</div>
        <select className="cma-input"
          defaultValue={report.loanType}
          onChange={e => onSave({ loanType: e.target.value })}>
          <option value="TERM_LOAN">Term Loan</option>
          <option value="WORKING_CAPITAL">Working Capital / CC</option>
          <option value="MUDRA_LOAN">Mudra Loan</option>
          <option value="PMEGP_LOAN">PMEGP Loan</option>
          <option value="OVERDRAFT">Overdraft</option>
        </select>
      </div>

      <div className="cma-form-group">
        <div className="cma-label">Loan Amount (Lakhs) *</div>
        <div className="cma-input-wrapper">
          <div className="cma-input-prefix">₹</div>
          <input type="number" className="cma-input cma-input-prefixed" 
            defaultValue={report.loanAmount} 
            onBlur={e => onSave({ loanAmount: parseFloat(e.target.value) })} />
          <div style={{marginLeft:12, fontSize:13, color:'#64748b'}}>Lakhs</div>
        </div>
      </div>

      <div className="cma-form-group">
        <div className="cma-label">Bank Name</div>
        <input className="cma-input" 
          defaultValue={report.bankName} 
          onBlur={e => onSave({ bankName: e.target.value })} 
          placeholder="Target Bank" />
      </div>
    </div>
  );
}
