import React, { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { CraftShieldContext } from '../context/CraftShieldContext';
import '../App.css';

const copy = {
  en: {
    titleValid: 'Verified Transaction',
    titleInvalid: 'Could Not Verify This Proof',
    subtitle: 'Verified transaction receipt',
    jewelType: 'Jewel type',
    amount: 'Amount',
    date: 'Date',
    orderId: 'Order ID',
    proofId: 'Proof ID',
    notice: 'This verifies that a CraftShield transaction record exists and has not been altered. It does not prove the physical jewellery material authenticity.',
    loading: 'Verifying receipt...'
  },
  ta: {},
  te: {},
  kn: {},
  ml: {}
};

['ta', 'te', 'kn', 'ml'].forEach((lang) => {
  copy[lang] = copy.en;
});

export default function VerifyProof() {
  const { proofId } = useParams();
  const { verifyPublicProof, language } = useContext(CraftShieldContext);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const labels = copy[language] || copy.en;

  useEffect(() => {
    let active = true;
    const runVerification = async () => {
      setLoading(true);
      try {
        const data = await verifyPublicProof(proofId);
        if (active) setResult(data);
      } catch (err) {
        if (active) {
          setResult({ valid: false, message: err.message || labels.titleInvalid, payload: null });
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    runVerification();
    return () => {
      active = false;
    };
  }, [proofId, verifyPublicProof, labels.titleInvalid]);

  const payload = result?.payload;
  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <main className="dashboard-container" style={{ maxWidth: '760px', margin: '0 auto', minHeight: '100vh', justifyContent: 'center' }}>
      <div className="card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <ShieldCheck size={32} className="text-secondary" />
          <div>
            <h1 className="headline-lg">CraftShield</h1>
            <p className="body-sm text-muted">{labels.subtitle}</p>
          </div>
        </div>

        {loading ? (
          <p className="body-md text-muted">{labels.loading}</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              {result?.valid ? <CheckCircle2 size={28} className="text-green" /> : <XCircle size={28} style={{ color: '#c53030' }} />}
              <h2 className="headline-md">{result?.valid ? labels.titleValid : labels.titleInvalid}</h2>
            </div>

            {result?.valid && payload ? (
              <div className="request-spec-grid">
                <div>{labels.proofId}: <strong>{payload.proof_id}</strong></div>
                <div>{labels.orderId}: <strong>{payload.order_id}</strong></div>
                <div>{labels.jewelType}: <strong>{payload.jewel_type}</strong></div>
                <div>{labels.amount}: <strong>{formatCurrency(payload.amount, payload.currency)}</strong></div>
                <div>{labels.date}: <strong>{new Date(payload.completed_at).toLocaleString()}</strong></div>
              </div>
            ) : (
              <p className="body-md text-muted">{result?.message || labels.titleInvalid}</p>
            )}

            <p className="body-sm text-muted mt-4">{result?.notice || labels.notice}</p>
          </>
        )}
      </div>
    </main>
  );
}
