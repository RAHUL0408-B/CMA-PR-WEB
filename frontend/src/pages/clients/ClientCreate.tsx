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
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    let val = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    
    // Auto-capitalize PAN and GST
    if (k === 'pan' || k === 'gst') {
      val = (val as string).toUpperCase();
    }
    
    setForm(f => ({ ...f, [k]: val }));
    
    // Clear error for this field
    if (errors[k]) {
      setErrors(errs => {
        const next = { ...errs };
        delete next[k];
        return next;
      });
    }
  };

  const steps = [
    { label: 'Personal Info', icon: '👤' },
    { label: 'Contact & Address', icon: '📍' },
    { label: 'Business Info', icon: '🏢' },
    { label: 'Review', icon: '✅' },
  ];

  const validateStep = (currentStep: number): boolean => {
    const stepErrors: Record<string, string> = {};

    if (currentStep === 0) {
      // Name validation
      if (!form.name.trim()) {
        stepErrors.name = 'Client Full Name is required';
      } else if (form.name.trim().length < 3) {
        stepErrors.name = 'Name must be at least 3 characters';
      }

      // Mobile validation
      if (!form.mobile.trim()) {
        stepErrors.mobile = 'Mobile Number is required';
      } else if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) {
        stepErrors.mobile = 'Enter a valid 10-digit mobile number';
      }

      // Email validation (optional)
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        stepErrors.email = 'Enter a valid email address';
      }

      // Aadhaar validation (optional)
      const cleanAadhaar = form.aadhaar.replace(/\s/g, '');
      if (cleanAadhaar && !/^\d{12}$/.test(cleanAadhaar)) {
        stepErrors.aadhaar = 'Aadhaar number must be exactly 12 digits';
      }

      // PAN validation
      const panVal = form.pan.trim().toUpperCase();
      if (!panVal) {
        stepErrors.pan = 'PAN Number is required';
      } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panVal)) {
        stepErrors.pan = 'Invalid PAN format (expected ABCDE1234F)';
      }

      // GST validation (optional)
      const gstVal = form.gst.trim().toUpperCase();
      if (gstVal && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Zz]{1}[A-Z\d]{1}$/.test(gstVal)) {
        stepErrors.gst = 'Invalid GST format (expected 22AAAAA0000A1Z5)';
      }
    }

    if (currentStep === 1) {
      // Pincode validation (optional)
      if (form.pincode.trim() && !/^\d{6}$/.test(form.pincode.trim())) {
        stepErrors.pincode = 'Pincode must be exactly 6 digits';
      }
    }

    if (currentStep === 2) {
      // Business Name validation
      if (!form.businessName.trim()) {
        stepErrors.businessName = 'Business / Firm Name is required';
      }

      // Constitution validation
      if (!form.constitution) {
        stepErrors.constitution = 'Constitution Type is required';
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(s => s + 1);
    }
  };

  const handleSubmit = async () => {
    setError('');
    
    // Validate all steps
    const isStep0Valid = validateStep(0);
    const isStep1Valid = validateStep(1);
    const isStep2Valid = validateStep(2);
    
    if (!isStep0Valid) {
      setStep(0);
      return;
    }
    if (!isStep1Valid) {
      setStep(1);
      return;
    }
    if (!isStep2Valid) {
      setStep(2);
      return;
    }

    setLoading(true);
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
      <input type={type} className={`form-input ${errors[k] ? 'error' : ''}`} placeholder={placeholder}
        value={(form as any)[k]} onChange={set(k)} />
      {errors[k] && (
        <div style={{ color: 'var(--accent-red)', fontSize: '11px', fontWeight: 500, marginTop: '2px' }}>
          {errors[k]}
        </div>
      )}
    </div>
  );

  const Select = ({ label, k, options, required = false }: any) => (
    <div className="form-group">
      <label className={`form-label ${required ? 'required' : ''}`}>{label}</label>
      <select className={`form-select ${errors[k] ? 'error' : ''}`} value={(form as any)[k]} onChange={set(k)}>
        <option value="">Select {label}</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
      {errors[k] && (
        <div style={{ color: 'var(--accent-red)', fontSize: '11px', fontWeight: 500, marginTop: '2px' }}>
          {errors[k]}
        </div>
      )}
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
              <button className="btn btn-primary" onClick={handleNext}>
                Continue →
              </button>
            ) : (
              <button className="btn btn-success" onClick={handleSubmit} disabled={loading}>
                {loading ? <><span className="spinner" />Saving...</> : '✓ Save Client'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
