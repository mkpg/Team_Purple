import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ShieldCheck, Search } from 'lucide-react';
import { CraftShieldContext } from '../context/CraftShieldContext';
import DynamicTranslate from '../components/DynamicTranslate';
import '../App.css';

const copy = {
  en: {
    titleValid: 'Verified Transaction Record',
    titleInvalid: 'No Verified Record Found',
    subtitle: 'Cryptographic receipt verification system',
    jewelType: 'Jewel type / Design name',
    amount: 'Settled amount',
    date: 'Settled date',
    orderId: 'Order ID',
    proofId: 'Receipt Proof ID',
    notice: 'This proof verifies that a secure escrow transaction occurred on the CraftShield network and has been digitally signed using HMAC-SHA256. It protects design files and payment ledger authenticity.',
    loading: 'Loading cryptographic verification details...',
    placeholder: 'Enter Order ID or Proof ID...',
    btnVerify: 'Verify Authenticity',
    enterCode: 'Verify by Order ID or Proof ID'
  },
  ta: {
    titleValid: '\u0b9a\u0bb0\u0bbf\u0baa\u0bbe\u0bb0\u0bcd\u0b95\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f \u0baa\u0bb0\u0bbf\u0bb5\u0bb0\u0bcd\u0ba4\u0bcd\u0ba4\u0ba9\u0bc8 \u0baa\u0ba4\u0bbf\u0bb5\u0bc1',
    titleInvalid: '\u0b9a\u0bb0\u0bbf\u0baa\u0bbe\u0bb0\u0bcd\u0b95\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f \u0baa\u0ba4\u0bbf\u0bb5\u0bc1 \u0b8e\u0ba4\u0bc1\u0bb5\u0bc1\u0bae\u0bcd \u0b87\u0bb2\u0bcd\u0bb2\u0bc8',
    subtitle: '\u0b95\u0bbf\u0bb0\u0bbf\u0baa\u0bcd\u0b9f\u0bcb\u0b95\u0bbf\u0bb0\u0bbe\u0b83\u0baa\u0bbf\u0b95\u0bcd \u0bb0\u0b9a\u0bc0\u0ba4\u0bc1 \u0b9a\u0bb0\u0bbf\u0baa\u0bbe\u0bb0\u0bcd\u0baa\u0bcd\u0baa\u0bc1 \u0b85\u0bae\u0bc8\u0baa\u0bcd\u0baa\u0bc1',
    jewelType: '\u0ba8\u0b95\u0bc8 \u0bb5\u0b95\u0bc8 / \u0bb5\u0b9f\u0bbf\u0bb5\u0bae\u0bc8\u0baa\u0bcd\u0baa\u0bc1 \u0baa\u0bc6\u0baf\u0bb0\u0bcd',
    amount: '\u0b9a\u0bc6\u0bb2\u0bc1\u0ba4\u0bcd\u0ba4\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f \u0ba4\u0bca\u0b95\u0bc8',
    date: '\u0b9a\u0bc6\u0bb2\u0bc1\u0ba4\u0bcd\u0ba4\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f \u0ba4\u0bc7\u0ba4\u0bbf',
    orderId: '\u0b86\u0bb0\u0bcd\u0b9f\u0bb0\u0bcd \u0b90\u0b9f\u0bbf (Order ID)',
    proofId: '\u0bb0\u0b9a\u0bc0\u0ba4\u0bc1 \u0b9a\u0bbe\u0ba9\u0bcd\u0bb1\u0bc1 \u0b90\u0b9f\u0bbf (Receipt Proof ID)',
    notice: '\u0b87\u0ba8\u0bcd\u0ba4 \u0b9a\u0bbe\u0ba9\u0bcd\u0bb1\u0bbe\u0ba9\u0ba4\u0bc1 \u0b95\u0bbf\u0bb0\u0bbe\u0b83\u0baa\u0bcd\u0b9f\u0bcd\u0bb7\u0bc0\u0bb2\u0bcd\u0b9f\u0bcd \u0ba8\u0bc6\u0b9f\u0bcd\u0bb5\u0bca\u0bb0\u0bcd\u0b95\u0bcd\u0b95\u0bbf\u0bb2\u0bcd \u0baa\u0bbe\u0ba4\u0bc1\u0b95\u0bbe\u0baa\u0bcd\u0baa\u0bbe\u0ba9 \u0b8e\u0bb8\u0bcd\u0b95\u0bcd\u0bb0\u0bcb \u0baa\u0bb0\u0bbf\u0bb5\u0bb0\u0bcd\u0ba4\u0bcd\u0ba4\u0ba9\u0bc8 \u0ba8\u0b9f\u0ba8\u0bcd\u0ba4\u0bc1\u0bb3\u0bcd\u0bb3\u0ba4\u0bc1 \u0bae\u0bb1\u0bcd\u0bb1\u0bc1\u0bae\u0bcd HMAC-SHA256 \u0b90\u0baa\u0bcd \u0baa\u0baf\u0ba9\u0bcd\u0baa\u0b9f\u0bc1\u0ba4\u0bcd\u0ba4\u0bbf \u0b9f\u0bbf\u0b9c\u0bbf\u0b9f\u0bcd\u0b9f\u0bb2\u0bcd \u0bae\u0bc1\u0bb1\u0bc8\u0baf\u0bbf\u0bb2\u0bcd \u0b95\u0bc8\u0baf\u0bca\u0baa\u0bcd\u0baa\u0bae\u0bbf\u0b9f\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f\u0bc1\u0bb3\u0bcd\u0bb3\u0ba4\u0bc1 \u0b8e\u0ba9\u0bcd\u0baa\u0ba4\u0bc8\u0b9a\u0bcd \u0b9a\u0bb0\u0bbf\u0baa\u0bbe\u0bb0\u0bcd\u0b95\u0bcd\u0b95\u0bbf\u0bb1\u0ba4\u0bc1.',
    loading: '\u0b9a\u0bb0\u0bbf\u0baa\u0bbe\u0bb0\u0bcd\u0baa\u0bcd\u0baa\u0bc1 \u0bb5\u0bbf\u0bb5\u0bb0\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0b8f\u0bb1\u0bcd\u0bb1\u0baa\u0bcd\u0baa\u0b9f\u0bc1\u0b95\u0bbf\u0ba9\u0bcd\u0bb1\u0ba9...',
    placeholder: '\u0b86\u0bb0\u0bcd\u0b9f\u0bb0\u0bcd \u0b90\u0b9f\u0bbf \u0b85\u0bb2\u0bcd\u0bb2\u0ba4\u0bc1 \u0b9a\u0bbe\u0ba9\u0bcd\u0bb1\u0bc1 \u0b90\u0b9f\u0bbf\u0baf\u0bc8 \u0b89\u0bb3\u0bcd\u0bb3\u0bbf\u0b9f\u0bb5\u0bc1\u0bae\u0bcd...',
    btnVerify: '\u0b89\u0ba3\u0bcd\u0bae\u0bc8\u0baf\u0bc8\u0b9a\u0bcd \u0b9a\u0bb0\u0bbf\u0baa\u0bbe\u0bb0\u0bcd',
    enterCode: '\u0b86\u0bb0\u0bcd\u0b9f\u0bb0\u0bcd \u0b90\u0b9f\u0bbf \u0b85\u0bb2\u0bcd\u0bb2\u0ba4\u0bc1 \u0b9a\u0bbe\u0ba9\u0bcd\u0bb1\u0bc1 \u0b90\u0b9f\u0bbf \u0bae\u0bc2\u0bb2\u0bae\u0bcd \u0b9a\u0bb0\u0bbf\u0baa\u0bbe\u0bb0\u0bcd\u0b95\u0bcd\u0b95\u0bb5\u0bc1\u0bae\u0bcd'
  },
  te: {},
  kn: {},
  ml: {}
};

['te', 'kn', 'ml'].forEach((lang) => {
  copy[lang] = copy.en;
});

export default function VerifyProof() {
  const { proofId: urlProofId } = useParams();
  const navigate = useNavigate();
  const { verifyPublicProof, language } = useContext(CraftShieldContext);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const labels = copy[language] || copy.en;

  const runVerification = async (idToVerify) => {
    if (!idToVerify) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await verifyPublicProof(idToVerify);
      setResult(data);
    } catch (err) {
      setResult({ 
        valid: false, 
        message: err.message || labels.titleInvalid, 
        payload: null 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlProofId) {
      setSearchVal(urlProofId);
      runVerification(urlProofId);
    }
  }, [urlProofId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/verify/${searchVal.trim()}`);
    }
  };

  const payload = result?.payload;
  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <main className="dashboard-container" style={{ maxWidth: '760px', margin: '40px auto', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="card" style={{ padding: '32px', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--color-outline)', paddingBottom: '16px' }}>
          <ShieldCheck size={40} style={{ color: 'var(--color-primary)' }} />
          <div>
            <h1 className="headline-lg" style={{ letterSpacing: '-0.5px' }}>CraftShield Verification</h1>
            <p className="body-sm text-muted">{labels.subtitle}</p>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder={labels.placeholder}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              style={{ paddingLeft: '44px', width: '100%', height: '48px', border: '1px solid var(--color-outline)', borderRadius: '8px' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '48px', px: '24px' }}>
            {labels.btnVerify}
          </button>
        </form>

        {loading ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p className="body-md text-muted animate-pulse">{labels.loading}</p>
          </div>
        ) : result ? (
          <div className="verification-result-box" style={{ animation: 'fadeIn 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', background: result?.valid ? 'rgba(74, 185, 122, 0.08)' : 'rgba(229, 62, 62, 0.08)', padding: '12px 16px', borderRadius: '8px' }}>
              {result?.valid ? <CheckCircle2 size={24} className="text-green" /> : <XCircle size={24} style={{ color: '#e53e3e' }} />}
              <h2 className="headline-md" style={{ margin: 0, fontSize: '18px', color: result?.valid ? '#2f855a' : '#c53030' }}>
                {result?.valid ? labels.titleValid : labels.titleInvalid}
              </h2>
            </div>

            {result?.valid && payload ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--color-surface-mixed)', padding: '20px', borderRadius: '8px', border: '1px solid var(--color-outline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px' }}>
                  <span className="body-sm text-muted">{labels.proofId}</span>
                  <span className="font-mono body-sm font-bold">{payload.proof_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px' }}>
                  <span className="body-sm text-muted">{labels.orderId}</span>
                  <span className="font-mono body-sm font-bold">{payload.order_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px' }}>
                  <span className="body-sm text-muted">{labels.jewelType}</span>
                  <span className="body-sm font-bold"><DynamicTranslate text={payload.jewel_type} /></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '8px' }}>
                  <span className="body-sm text-muted">{labels.amount}</span>
                  <span className="body-sm font-bold text-primary">{formatCurrency(payload.amount, payload.currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="body-sm text-muted">{labels.date}</span>
                  <span className="body-sm font-bold">{new Date(payload.completed_at).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <p className="body-md text-muted" style={{ padding: '0 8px' }}>{result?.message || labels.titleInvalid}</p>
            )}

            <p className="body-sm text-muted" style={{ marginTop: '24px', lineHeight: '1.6', fontSize: '12px', borderTop: '1px solid var(--color-outline)', paddingTop: '16px' }}>
              {labels.notice}
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 0', border: '1px dashed var(--color-outline)', borderRadius: '8px' }}>
            <p className="body-md text-muted">{labels.enterCode}</p>
          </div>
        )}
      </div>
    </main>
  );
}
