import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Fingerprint, Search, X } from 'lucide-react';
import './DigiLocker.css';

export default function DigiLockerSandbox({ onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFetch = (e) => {
    e.preventDefault();
    if (aadhaar.length < 12) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep(2);
    }, 1500);
  };

  const handleVerify = (e) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep(3);
      setTimeout(() => {
        onComplete(true);
      }, 2000);
    }, 1500);
  };

  return (
    <div className="digilocker-overlay">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="digilocker-container"
      >
        <div className="digilocker-header">
          <div className="digilocker-header-title">
            <div className="digilocker-icon-wrapper">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="headline-sm">DigiLocker Sandbox</h3>
              <p className="label-sm text-muted">Zero-Trust KYC Verification</p>
            </div>
          </div>
          {step < 3 && (
            <button onClick={onCancel} className="icon-btn">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="digilocker-content">
          <div className="digilocker-privacy-banner">
            <ShieldAlert size={20} className="text-warning shrink-0" />
            <p><strong>Privacy Notice:</strong> CraftShield does not store your ID. This sandbox only returns a "verified" flag to our servers.</p>
          </div>

          {step === 1 && (
            <form onSubmit={handleFetch} className="digilocker-form">
              <div className="input-group">
                <label className="input-label">Enter Aadhaar Number</label>
                <div className="digilocker-input-wrapper">
                  <Fingerprint className="input-icon" size={18} />
                  <input
                    type="text"
                    maxLength="12"
                    placeholder="XXXX XXXX XXXX"
                    className="input-field with-icon"
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={aadhaar.length < 12 || isProcessing}
                className="btn btn-primary w-full"
              >
                {isProcessing ? (
                  <span className="loading-text">Connecting to UIDAI...</span>
                ) : (
                  <>Fetch Document <Search size={16} style={{marginLeft: '8px'}} /></>
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerify} className="digilocker-form">
              <div className="input-group">
                <label className="input-label">Enter OTP</label>
                <p className="label-sm text-muted mb-2">Sent to registered mobile number (Demo: enter any 6 digits)</p>
                <input
                  type="text"
                  maxLength="6"
                  placeholder="------"
                  className="input-field otp-field"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <button
                type="submit"
                disabled={otp.length < 6 || isProcessing}
                className="btn btn-primary w-full"
              >
                {isProcessing ? (
                  <span className="loading-text">Verifying...</span>
                ) : (
                  "Verify & Complete"
                )}
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="digilocker-success">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="success-icon-large"
              >
                <ShieldCheck size={48} />
              </motion.div>
              <h4 className="headline-md mb-2">Identity Verified</h4>
              <p className="label-md text-muted">Returning secure verification flag to CraftShield...</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
