import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const CONSTITUTIONS = ['Proprietorship','Partnership','LLP','Private Limited','Public Limited','OPC','Trust','Society'];
const INDUSTRIES = ['Manufacturing','Trading','Services','Agriculture','Construction','Healthcare','Education','Technology','Hospitality','Real Estate','Transport','Finance','Retail','Food & Beverage','Other'];
const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh'];

export default function ClientCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    // Personal
    name: '', mobile: '', email: '', aadhaar: '', pan: '', gst: '',
    address: '', city: '', district: '', state: '', pincode: '',
    // Business
    businessName: '', constitution: '', industryType: '', businessActivity: '',
    dateOfIncorporation: '', isExistingBusiness: true, udyamNumber: '', cinNumber: '',
    promoterName: '', promoterExperience: '', existingBanker: '', existingLoanDetails: ''
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm(f => ({ ...f, [k]: val }));
  };

  const steps = [
    { label: 'Personal Info', icon: '👤' },
    { label: 'Contact & Address', icon: '📍' },
    { label: 'Business Info', icon: '🏢' },
    { label: 'Review', icon: '✅' },
  ];

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      const client = await api.clients.create({ ...form, userId: user?.uid });
      navigate(`/clients/${client.id}`);
    } catch (err: any) {
      setError(err.message); setLoading(false);
    }
  };

  const Field = ({ label, k, type = 'text', placeholder = '', required = false }: any) => (
    <div className="form-group">
      <label className={`form-label ${required ? 'required' : ''}`}>{label}</label>
      <input type={type} className="form-input" placeholder={placeholder}
        value={(form as any)[k]} onChange={set(k)} />
    </div>
  );

  const Select = ({ label, k, options, required = false }: any) => (
    <div className="form-group">
      <label className={`form-label ${required ? 'required' : ''}`}>{label}</label>
      <select className="form-select" value={(form as any)[k]} onChange={set(k)}>
        <option value="">Select {label}</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Add New Client</h1>
          <p className="page-subtitle">Complete KYC and business information</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="step-indicator">
        {steps.map((s, i) => (
          <div key={i} className="step-item">
            <div className={`step-circle ${i < step ? 'done' : i === step ? 'active' : ''}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <div className={`step-label ${i === step ? 'active' : i < step ? 'done' : ''}`}>{s.label}</div>
            {i < steps.length - 1 && <div className={`step-connector ${i < step ? 'done' : ''}`} />}
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      <div className="card">
        <div className="card-header">
          <div className="card-title">{steps[step].icon} {steps[step].label}</div>
        </div>
        <div className="card-body">
          {step === 0 && (
            <div className="form-grid form-grid-3">
              <Field label="Client Full Name" k="name" placeholder="Rahul Sharma" required />
              <Field label="Mobile Number" k="mobile" type="tel" placeholder="9876543210" required />
              <Field label="Email Address" k="email" type="email" placeholder="rahul@business.com" />
              <Field label="Aadhaar Number" k="aadhaar" placeholder="XXXX XXXX XXXX" />
              <Field label="PAN Number" k="pan" placeholder="ABCDE1234F" required />
              <Field label="GST Number" k="gst" placeholder="22AAAAA0000A1Z5" />
            </div>
          )}

          {step === 1 && (
            <div className="form-grid form-grid-3">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Address</label>
                <textarea className="form-textarea" placeholder="Street / Ward / Area" value={form.address}
                  onChange={set('address')} rows={2} />
              </div>
              <Select label="State" k="state" options={STATES} />
              <Field label="District" k="district" placeholder="District name" />
              <Field label="City" k="city" placeholder="City" />
              <Field label="Pincode" k="pincode" placeholder="440001" />
            </div>
          )}

          {step === 2 && (
            <div className="form-grid form-grid-3">
              <Field label="Business / Firm Name" k="businessName" placeholder="ABC Enterprises" required />
              <Select label="Constitution Type" k="constitution" options={CONSTITUTIONS} required />
              <Select label="Industry Type" k="industryType" options={INDUSTRIES} />
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Business Activity Description</label>
                <textarea className="form-textarea" placeholder="Describe the nature of business..." value={form.businessActivity}
                  onChange={set('businessActivity')} rows={2} />
              </div>
              <Field label="Date of Incorporation" k="dateOfIncorporation" type="date" />
              <Field label="Promoter / Proprietor Name" k="promoterName" placeholder="Promoter name" />
              <Field label="Promoter Experience (Years)" k="promoterExperience" type="number" placeholder="10" />
              <Field label="Udyam Registration No." k="udyamNumber" placeholder="UDYAM-XX-00-0000000" />
              <Field label="CIN Number" k="cinNumber" placeholder="U12345MH2020PTC123456" />
              <Field label="Existing Banker" k="existingBanker" placeholder="SBI, HDFC Bank, etc." />
              <div className="form-group">
                <label className="form-label">Business Type</label>
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" checked={form.isExistingBusiness === true} onChange={() => setForm(f => ({...f, isExistingBusiness: true}))} />
                    <span style={{ fontSize: 13 }}>Existing Business</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" checked={form.isExistingBusiness === false} onChange={() => setForm(f => ({...f, isExistingBusiness: false}))} />
                    <span style={{ fontSize: 13 }}>New Business</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'grid', gap: 20 }}>
              <div className="alert alert-info">
                Please review the details before saving.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  ['Name', form.name], ['PAN', form.pan], ['Mobile', form.mobile],
                  ['Business', form.businessName], ['Constitution', form.constitution],
                  ['Industry', form.industryType], ['State', form.state], ['City', form.city]
                ].map(([k, v]) => v ? (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, marginTop: 2 }}>{v}</div>
                  </div>
                ) : null)}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn btn-secondary" onClick={() => step === 0 ? navigate('/clients') : setStep(s => s - 1)}>
            {step === 0 ? 'Cancel' : '← Back'}
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            {step < steps.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}
                disabled={step === 0 && !form.name}>
                Continue →
              </button>
            ) : (
              <button className="btn btn-success" onClick={handleSubmit} disabled={loading || !form.name || !form.pan}>
                {loading ? <><span className="spinner" />Saving...</> : '✓ Save Client'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
