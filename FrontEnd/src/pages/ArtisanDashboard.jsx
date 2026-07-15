import React, { useContext, useState } from 'react';
import { Hammer, Clipboard, Plus, Shield, Package, Edit, Trash, IndianRupee, Calendar, Info, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CraftShieldContext } from '../context/CraftShieldContext';
import Modal from '../components/Modal';
import DynamicTranslate from '../components/DynamicTranslate';
import './ArtisanDashboard.css';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  exit: { opacity: 0 }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

function CatalogProductCard({ product, handleDeleteProduct, handleEditProduct, isVerified, formatCurrency }) {
  const { t, language, API_BASE_URL, checkDesignSimilarity, registerDesign, getDesignProof, refreshData, submitDesignDispute } = useContext(CraftShieldContext);

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/uploads')) {
      return `${API_BASE_URL}${url}`;
    }
    return url;
  };

  const images = [product.image_url, ...(product.image_urls || [])].filter(Boolean).map(getImageUrl);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [proofData, setProofData] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [matches, setMatches] = useState([]);
  const [checkingSimilarity, setCheckingSimilarity] = useState(false);

  // Dispute States
  const [justification, setJustification] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  const handleAnchorClick = async (e) => {
    e.stopPropagation();
    if (checkingSimilarity || verifying) return;
    setCheckingSimilarity(true);
    try {
      const simResult = await checkDesignSimilarity(product.id);
      if (simResult.matches && simResult.matches.length > 0) {
        setMatches(simResult.matches);
        setShowWarningModal(true);
      } else {
        await executeRegistration();
      }
    } catch (err) {
      toast.error(err.message || "Failed similarity scan");
    } finally {
      setCheckingSimilarity(false);
    }
  };

  const executeRegistration = async () => {
    if (verifying) return;
    setVerifying(true);
    try {
      await registerDesign(product.id, false);
      toast.success("Design proof registered successfully on VeChain!");
      setShowWarningModal(false);
      await refreshData();
    } catch (err) {
      // If the backend returned a 409 similarity conflict, show the Warning modal for dispute
      if (err.warnings && err.warnings.length > 0) {
        setMatches(err.warnings);
        setShowWarningModal(true);
      } else {
        toast.error(err.message || "Failed to register design proof");
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleProofImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('files', file);

    setUploadingProof(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data && data.length > 0) {
        setProofImageUrl(data[0]);
        toast.success("Proof document uploaded successfully!");
      }
    } catch (err) {
      toast.error("Could not upload proof image: " + err.message);
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmitDispute = async (e) => {
    if (e) e.preventDefault();
    if (!justification.trim()) {
      toast.error("Please provide a justification describing the originality of your design.");
      return;
    }
    setSubmittingDispute(true);
    try {
      await submitDesignDispute(product.id, justification, proofImageUrl);
      toast.success("Design dispute submitted successfully to admin review!");
      setShowWarningModal(false);
      setJustification('');
      setProofImageUrl('');
      await refreshData();
    } catch (err) {
      toast.error(err.message || "Failed to submit design dispute");
    } finally {
      setSubmittingDispute(false);
    }
  };


  const handleShowProof = async (e) => {
    e.stopPropagation();
    if (verifying) return;
    if (proofData) {
      setShowProof(true);
      return;
    }
    setVerifying(true);
    try {
      const res = await getDesignProof(product.id);
      setProofData(res);
      setShowProof(true);
    } catch (err) {
      toast.error(err.message || "Failed to load blockchain proof");
    } finally {
      setVerifying(false);
    }
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const getDaysTranslation = () => {
    if (language === 'ta') return '\u0ba8\u0bbe\u0b9f\u0bcd\u0b95\u0bb3\u0bcd';
    if (language === 'te') return '\u0c30\u0c4b\u0c1c\u0c41\u0c32\u0c41';
    if (language === 'kn') return '\u0ca6\u0cbf\u0ca8\u0c97\u0cb3\u0cc1';
    if (language === 'ml') return '\u0ca6\u0d3f\u0d35\u0d38\u0d19\u0d4d\u0d19\u0d7e';
    return 'days';
  };

  return (
    <div className="card product-card">
      <div className="product-image-wrapper" style={{ position: 'relative', overflow: 'hidden' }} onContextMenu={e => e.preventDefault()}>
        <img 
          src={images[currentIdx]} 
          alt={product.name} 
          className="product-image" 
          style={{ width: '100%', height: '220px', objectFit: 'cover', userSelect: 'none', pointerEvents: 'none' }} 
          onDragStart={e => e.preventDefault()}
        />
        {/* Dynamic Watermark Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          userSelect: 'none',
          overflow: 'hidden'
        }}>
          <div style={{
            color: 'rgba(255, 255, 255, 0.3)',
            fontSize: '12px',
            fontWeight: 'bold',
            letterSpacing: '2px',
            transform: 'rotate(-25deg)',
            whiteSpace: 'nowrap',
            border: '1px dashed rgba(255, 255, 255, 0.2)',
            padding: '4px 10px',
            borderRadius: '4px',
            background: 'rgba(0, 0, 0, 0.1)',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            textTransform: 'uppercase'
          }}>
            CraftShield Protected
          </div>
        </div>
        <div className="product-category-badge label-sm"><DynamicTranslate text={product.category} /></div>
        
        {images.length > 1 && (
          <>
            <button 
              type="button"
              onClick={prevImage}
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                zIndex: 10
              }}
            >
              <span className="notranslate">{'\u2039'}</span>
            </button>
            <button 
              type="button"
              onClick={nextImage}
              className="notranslate"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                zIndex: 10
              }}
            >
              <span className="notranslate">{'\u203a'}</span>
            </button>
            <div 
              className="notranslate"
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '10px',
                zIndex: 10
              }}
            >
              {currentIdx + 1} / {images.length}
            </div>
          </>
        )}
      </div>
      <div className="card-content">
        <h4 className="headline-sm"><DynamicTranslate text={product.name} /></h4>
        <p className="body-sm text-muted line-clamp"><DynamicTranslate text={product.description} /></p>
        <div className="product-specifications">
          <span>{t('Material')}: <strong><DynamicTranslate text={product.material} /></strong></span>
          <span>{t('Delivery')}: <strong>{product.estimated_delivery_days} {getDaysTranslation()}</strong></span>
        </div>
        <div className="blockchain-provenance-section mt-4 pt-3 border-t">
          {product.moderation_status === "pending" ? (
            <div 
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-md border border-amber-200"
              style={{ display: 'inline-flex', background: '#fff8e1', color: '#b78103', border: '1px solid #ffe082', padding: '4px 8px', borderRadius: '4px', gap: '4px' }}
            >
              <Info size={14} />
              <span>Pending Admin Review</span>
            </div>
          ) : product.design_hash ? (
            <div 
              className="flex items-center gap-1.5 text-xs font-semibold text-teal bg-teal-light px-2.5 py-1.5 rounded-md border border-teal-variant cursor-pointer hover:opacity-90 transition-opacity"
              onClick={handleShowProof}
              style={{ display: 'inline-flex', cursor: 'pointer', background: 'rgba(20, 110, 120, 0.1)', color: 'var(--color-teal)', border: '1px solid var(--color-teal)', padding: '4px 8px', borderRadius: '4px', gap: '4px' }}
              title={t('Verify Design')}
            >
              <Shield size={14} />
              <span>{t('Blockchain Verified')}</span>
            </div>
          ) : (
            <button
              className="btn btn-secondary btn-sm w-full flex items-center justify-center gap-2"
              onClick={handleAnchorClick}
              disabled={checkingSimilarity || verifying || !isVerified}
              style={{ fontSize: '11px', padding: '6px', width: '100%' }}
            >
              {checkingSimilarity || verifying ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Shield size={12} />
                  <span>Anchor Design Proof</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="product-card-footer border-t pt-4 mt-4">
          <span className="display-sm font-bold text-secondary">{formatCurrency(product.price)}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => handleEditProduct(product)}
              disabled={!isVerified}
              style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Edit size={12} /> Edit
            </button>
            <button 
              className="btn btn-logout btn-sm"
              onClick={() => handleDeleteProduct(product.id)}
              disabled={!isVerified}
              style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Trash size={12} /> {t('Delete')}
            </button>
          </div>
        </div>
      </div>

      {/* Proof Modal */}
      <Modal 
        isOpen={showProof} 
        onClose={() => setShowProof(false)} 
        title="Blockchain Registration Proof"
      >
        {proofData && (
          <div className="space-y-4 text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="bg-teal-50 p-4 rounded-lg border border-teal-200 text-teal-800" style={{ background: '#e6f4f1', padding: '12px', borderRadius: '8px', color: '#115e59', border: '1px solid #b2dfdb' }}>
              <p className="font-semibold" style={{ fontWeight: 'bold' }}>{t('Blockchain Verified')}</p>
              <p className="text-xs mt-1" style={{ fontSize: '12px', marginTop: '4px' }}>{t('Secured via digital fingerprint on public ledger.')}</p>
              <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', backgroundColor: proofData.simulated ? '#fef3c7' : '#d1fae5', color: proofData.simulated ? '#92400e' : '#065f46', border: proofData.simulated ? '1px solid #f59e0b' : '1px solid #10b981' }}>
                Status: {proofData.simulated ? 'Simulated Ledger' : 'Live VeChain Testnet'}
              </div>
            </div>
            
            <div className="space-y-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <span className="text-muted block text-xs" style={{ fontSize: '11px', color: '#666' }}>Design SHA-256 Hash</span>
                <code className="bg-gray-100 p-1.5 rounded block text-xs break-all font-mono" style={{ background: '#f5f5f5', padding: '6px', borderRadius: '4px', fontSize: '11px', display: 'block', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {proofData.design_hash}
                </code>
              </div>
              <div>
                <span className="text-muted block text-xs" style={{ fontSize: '11px', color: '#666' }}>Perceptual Hash (pHash)</span>
                <code className="bg-gray-100 p-1.5 rounded block text-xs break-all font-mono" style={{ background: '#f5f5f5', padding: '6px', borderRadius: '4px', fontSize: '11px', display: 'block', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {proofData.phash}
                </code>
              </div>
              <div>
                <span className="text-muted block text-xs" style={{ fontSize: '11px', color: '#666' }}>Transaction ID (VeChain)</span>
                <code className="bg-gray-100 p-1.5 rounded block text-xs break-all font-mono" style={{ background: '#f5f5f5', padding: '6px', borderRadius: '4px', fontSize: '11px', display: 'block', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {proofData.tx_id}
                </code>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span className="text-muted block text-xs" style={{ fontSize: '11px', color: '#666' }}>Block Number</span>
                  <strong>{proofData.block_number}</strong>
                </div>
                <div>
                  <span className="text-muted block text-xs" style={{ fontSize: '11px', color: '#666' }}>Registered At</span>
                  <strong>{new Date(proofData.registered_at).toLocaleString()}</strong>
                </div>
              </div>
              <div>
                <span className="text-muted block text-xs" style={{ fontSize: '11px', color: '#666' }}>Artisan Wallet Address</span>
                <code className="bg-gray-100 p-1.5 rounded block text-xs break-all font-mono" style={{ background: '#f5f5f5', padding: '6px', borderRadius: '4px', fontSize: '11px', display: 'block', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {proofData.artisan_address}
                </code>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-end gap-2" style={{ borderTop: '1px solid #eee', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <a 
                href={proofData.explorer_url || proofData.explorer_link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-primary text-xs"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '12px' }}
              >
                View on VeChain Explorer
              </a>
              <button className="btn btn-secondary text-xs" style={{ fontSize: '12px' }} onClick={() => setShowProof(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* Warning Modal */}
      <Modal 
        isOpen={showWarningModal} 
        onClose={() => setShowWarningModal(false)} 
        title="Warning: High Similarity Detected"
      >
        <div className="space-y-4 text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-amber-800" style={{ background: '#fff8e1', padding: '12px', borderRadius: '8px', color: '#b78103', border: '1px solid #ffe082', display: 'flex', gap: '8px' }}>
            <Info size={20} style={{ flexShrink: 0 }} />
            <div>
              <p className="font-semibold" style={{ fontWeight: 'bold' }}>Potential Design Conflict</p>
              <p className="text-xs mt-1" style={{ fontSize: '12px', marginTop: '4px' }}>
                Our image similarity engine has detected existing designs that share a high level of visual resemblance with yours.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted" style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>Similar Matches Found:</p>
            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2 bg-gray-50" style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px', padding: '8px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {matches.map((match) => (
                <div key={match.product_id || match._id} className="flex gap-3 bg-white p-2.5 rounded border items-center" style={{ display: 'flex', gap: '12px', background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #eee', alignItems: 'center' }}>
                  <img 
                    src={getImageUrl(match.image_url)} 
                    alt={match.name} 
                    className="w-12 h-12 object-cover rounded border" 
                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                  <div className="flex-1 min-w-0" style={{ flex: 1, minWidth: 0 }}>
                    <p className="font-semibold text-xs truncate" style={{ fontWeight: 'bold', fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.name}</p>
                    <p className="text-[11px] text-muted truncate" style={{ fontSize: '11px', color: '#888', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Artisan ID: {match.artisan_id}</p>
                    {match.ai_similarity_score !== undefined && (
                      <p className="text-[11px] text-secondary font-medium" style={{ fontSize: '11px', color: 'var(--color-secondary)', fontWeight: '500', margin: 0 }}>AI Similarity: {(match.ai_similarity_score * 100).toFixed(0)}% match</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-100 p-3 rounded text-xs text-muted" style={{ background: '#f5f5f5', padding: '8px', borderRadius: '6px', fontSize: '11px', color: '#666' }}>
            <strong>Direct Override Disabled:</strong> To resolve this similarity conflict and register your design, you must submit a formal Dispute requesting manual Admin Review with supporting originality proof.
          </div>

          <form onSubmit={handleSubmitDispute} className="space-y-3 mt-2" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="input-group">
              <label className="input-label" style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>Design Originality / Lineage / Inspiration *</label>
              <textarea
                className="input-field"
                value={justification}
                onChange={e => setJustification(e.target.value)}
                placeholder="Explain the unique handcrafted lineage, custom client instructions, or specific patterns of your original design..."
                style={{ fontSize: '12px', minHeight: '60px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
            </div>
            
            <div className="input-group">
              <label className="input-label" style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>Upload Legitimacy Proof (Sketches, CAD designs, or raw metal workbench photos)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleProofImageUpload}
                style={{ fontSize: '11px' }}
              />
              {uploadingProof && <span style={{ fontSize: '11px', color: '#888' }}>Uploading proof image...</span>}
              {proofImageUrl && (
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: 'bold' }}>✓ Proof Uploaded:</span>
                  <img
                    src={getImageUrl(proofImageUrl)}
                    alt="Dispute Proof"
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd', marginTop: '4px' }}
                  />
                </div>
              )}
            </div>

            <div className="border-t pt-4 flex justify-end gap-2" style={{ borderTop: '1px solid #eee', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary text-xs" style={{ fontSize: '12px' }} onClick={() => setShowWarningModal(false)}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary text-xs" 
                disabled={submittingDispute || uploadingProof}
                style={{ fontSize: '12px', background: '#e65100', color: '#fff', border: 'none' }}
              >
                {submittingDispute ? "Submitting Dispute..." : "Submit Dispute for Admin Review"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>

  );
}

function ReferenceImageSection({ url, getImageUrl }) {
  const [error, setError] = useState(false);
  if (error || !url) return null;
  return (
    <div className="reference-image-preview mt-4" style={{ position: 'relative', display: 'inline-block' }} onContextMenu={e => e.preventDefault()}>
      <span className="label-sm text-muted block mb-1">Client Reference Design:</span>
      <div style={{ position: 'relative', width: '120px', height: '120px', overflow: 'hidden', borderRadius: '8px' }}>
        <img 
          src={getImageUrl(url)} 
          alt="Client Design Reference" 
          onError={() => setError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none', pointerEvents: 'none' }} 
          onDragStart={e => e.preventDefault()}
        />
        {/* Dynamic Watermark Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          userSelect: 'none',
          overflow: 'hidden'
        }}>
          <div style={{
            color: 'rgba(255, 255, 255, 0.35)',
            fontSize: '9px',
            fontWeight: 'bold',
            transform: 'rotate(-25deg)',
            whiteSpace: 'nowrap',
            textShadow: '1px 1px 1px rgba(0,0,0,0.6)',
            textTransform: 'uppercase'
          }}>
            CraftShield
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ArtisanDashboard() {
  const {
    API_BASE_URL,
    user,
    artisanStats,
    artisanProfile,
    artisanProducts,
    artisanRequests,
    artisanOrders,
    artisanPayments,
    updateArtisanProfile,
    createProduct,
    updateProduct,
    deleteProduct,
    acceptCustomRequest,
    rejectCustomRequest,
    createQuotation,
    updateOrderStatus,
    requestExtension,
    uploadImages,
    submitDesignDispute,
    t,
    language
  } = useContext(CraftShieldContext);

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/uploads')) {
      return `${API_BASE_URL}${url}`;
    }
    return url;
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMessage, setUploadProgressMessage] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [editUploadedImages, setEditUploadedImages] = useState([]);

  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Immediate upload similarity warning/dispute state
  const [createdConflictProduct, setCreatedConflictProduct] = useState(null);
  const [showCreatedConflictModal, setShowCreatedConflictModal] = useState(false);
  const [createDisputeJustification, setCreateDisputeJustification] = useState('');
  const [createDisputeProofUrl, setCreateDisputeProofUrl] = useState('');
  const [isSubmittingCreateDispute, setIsSubmittingCreateDispute] = useState(false);
  const [isUploadingCreateProof, setIsUploadingCreateProof] = useState(false);

  const handleCreateDisputeProofUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('files', file);

    setIsUploadingCreateProof(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data && data.length > 0) {
        setCreateDisputeProofUrl(data[0]);
        toast.success("Proof document uploaded successfully!");
      }
    } catch (err) {
      toast.error("Could not upload proof image: " + err.message);
    } finally {
      setIsUploadingCreateProof(false);
    }
  };

  const handleCreateDisputeSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!createdConflictProduct) return;
    if (!createDisputeJustification.trim()) {
      toast.error("Please provide a justification describing the originality of your design.");
      return;
    }
    setIsSubmittingCreateDispute(true);
    try {
      await submitDesignDispute(createdConflictProduct.id, createDisputeJustification, createDisputeProofUrl);
      toast.success("Design dispute submitted successfully to admin review!");
      setShowCreatedConflictModal(false);
      setCreatedConflictProduct(null);
      setCreateDisputeJustification('');
      setCreateDisputeProofUrl('');
    } catch (err) {
      toast.error(err.message || "Failed to submit design dispute");
    } finally {
      setIsSubmittingCreateDispute(false);
    }
  };
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [isSubmittingExtension, setIsSubmittingExtension] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  const handleProductFilesChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadProgressMessage(`Uploading ${files.length} images...`);
    try {
      const urls = await uploadImages(files);
      if (urls && urls.length > 0) {
        setUploadedImages(prev => [...prev, ...urls]);
        setUploadProgressMessage(`Uploaded ${files.length} images successfully!`);
        toast.success(`Uploaded ${files.length} images.`);
      }
    } catch (err) {
      toast.error(err.message || 'Image upload failed');
      setUploadProgressMessage('Image upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditProductFilesChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadProgressMessage(`Uploading ${files.length} images...`);
    try {
      const urls = await uploadImages(files);
      if (urls && urls.length > 0) {
        setEditUploadedImages(prev => [...prev, ...urls]);
        setUploadProgressMessage(`Uploaded ${files.length} images successfully!`);
        toast.success(`Uploaded ${files.length} images.`);
      }
    } catch (err) {
      toast.error(err.message || 'Image upload failed');
      setUploadProgressMessage('Image upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const [activeTab, setActiveTab] = useState('requests'); // requests, pipeline, catalog, profile
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Quotation Modal State
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [quoteForm, setQuoteForm] = useState({
    quoted_amount: '',
    advance_amount: '',
    estimated_delivery_date: '',
    expected_completion_date: '',
    design_notes: ''
  });

  // Extension Modal State
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [selectedExtensionOrder, setSelectedExtensionOrder] = useState(null);
  const [extensionForm, setExtensionForm] = useState({
    extended_completion_date: '',
    reason: ''
  });

  // Product Upload Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    material: '',
    estimated_delivery_days: ''
  });

  // Product Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editProductForm, setEditProductForm] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    material: '',
    estimated_delivery_days: ''
  });


  // Profile Update Form State
  const [profileForm, setProfileForm] = useState(() => {
    return {
      business_name: artisanProfile?.business_name || '',
      jewellery_specialization: artisanProfile?.jewellery_specialization || '',
      location: artisanProfile?.location || '',
      profile_description: artisanProfile?.profile_description || ''
    };
  });

  // Sync profile data when loaded
  React.useEffect(() => {
    if (artisanProfile) {
      setProfileForm({
        business_name: artisanProfile.business_name || '',
        jewellery_specialization: artisanProfile.jewellery_specialization || '',
        location: artisanProfile.location || '',
        profile_description: artisanProfile.profile_description || ''
      });
    }
  }, [artisanProfile]);

  const isVerified = user?.verification_status === 'verified';

  // Statistics
  const pendingRequestsCount = artisanRequests.filter(r => r.status === 'pending').length;
  const activeOrdersCount = artisanOrders.filter(o => !['Completed', 'Cancelled'].includes(o.status)).length;
  
  const handleAcceptRequest = async (requestId) => {
    try {
      await acceptCustomRequest(requestId);
      toast.success('Custom request accepted! You can now submit a quotation.');
    } catch (err) {
      toast.error(err.message || 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await rejectCustomRequest(requestId);
      toast.success('Custom request rejected.');
    } catch (err) {
      toast.error(err.message || 'Failed to reject request');
    }
  };

  const openQuoteModal = (request) => {
    setSelectedRequest(request);
    setQuoteForm({
      quoted_amount: request.budget,
      advance_amount: (request.budget * 0.3).toFixed(0), // 30% default advance recommended
      estimated_delivery_date: '',
      expected_completion_date: '',
      design_notes: `Custom designed ${request.jewellery_type}. Cast in ${request.material_preference} with hand-set ${request.stone_preference || 'gems'}.`
    });
    setIsQuoteModalOpen(true);
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingQuote) return;
    const { quoted_amount, advance_amount, estimated_delivery_date, expected_completion_date, design_notes } = quoteForm;

    if (!quoted_amount || !advance_amount || !estimated_delivery_date || !expected_completion_date || !design_notes) {
      toast.error('All quote fields are required');
      return;
    }

    if (parseFloat(advance_amount) > parseFloat(quoted_amount)) {
      toast.error('Advance deposit cannot exceed the total quoted price');
      return;
    }

    setIsSubmittingQuote(true);
    try {
      await createQuotation({
        custom_request_id: selectedRequest.id,
        quoted_amount: parseFloat(quoted_amount),
        advance_amount: parseFloat(advance_amount),
        estimated_delivery_date,
        expected_completion_date,
        design_notes
      });
      toast.success('Quotation dispatched to client!');
      setIsQuoteModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to send quotation');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const handleExtensionSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingExtension) return;
    const { extended_completion_date, reason } = extensionForm;

    if (!extended_completion_date || !reason) {
      toast.error('All extension fields are required');
      return;
    }

    if (reason.trim().length < 10) {
      toast.error('Reason must be at least 10 characters long');
      return;
    }

    setIsSubmittingExtension(true);
    try {
      await requestExtension(selectedExtensionOrder.id, extended_completion_date, reason);
      toast.success('Deadline extension requested! Reliability score adjusted.');
      setIsExtensionModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to submit extension request');
    } finally {
      setIsSubmittingExtension(false);
    }
  };

  const openExtensionModal = (order) => {
    setSelectedExtensionOrder(order);
    setExtensionForm({
      extended_completion_date: '',
      reason: ''
    });
    setIsExtensionModalOpen(true);
  };

  const canRequestExtension = (order) => {
    if (order.extension_requested) return false;
    const activeStatuses = ['Advance Payment Secured', 'Design in Progress', 'Production Started', 'Work in Progress', 'Quality Check'];
    if (!activeStatuses.includes(order.status)) return false;
    if (!order.expected_completion_date) return false;
    
    const deadline = new Date(order.expected_completion_date);
    const now = new Date();
    return now <= deadline;
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (isSubmittingProduct) return;
    if (!isVerified) {
      toast.error('Only verified artisans can upload products');
      return;
    }

    const { name, description, category, price, material, estimated_delivery_days } = productForm;
    if (!name || !description || !category || !price || !material || !estimated_delivery_days) {
      toast.error('Please fill in all product details');
      return;
    }

    const primaryImage = uploadedImages.length > 0 ? uploadedImages[0] : 'https://images.unsplash.com/photo-1605100804763-247f66126e28?w=500&q=80';
    const secondaryImages = uploadedImages.length > 1 ? uploadedImages.slice(1) : [];

    setIsSubmittingProduct(true);
    try {
      const res = await createProduct({
        name,
        description,
        category,
        price: parseFloat(price),
        material,
        image_url: primaryImage,
        image_urls: secondaryImages,
        estimated_delivery_days: parseInt(estimated_delivery_days)
      });
      
      setProductForm({
        name: '',
        description: '',
        category: '',
        price: '',
        material: '',
        estimated_delivery_days: ''
      });
      setUploadedImages([]);
      setIsProductModalOpen(false);

      if (res && res.similarity_conflict) {
        setCreatedConflictProduct(res);
        setShowCreatedConflictModal(true);
        toast.error('Design similarity conflict detected! Product saved but set to inactive pending admin review.', { duration: 6000 });
      } else {
        toast.success('Product uploaded successfully!');
      }
    } catch (err) {
      toast.error(err.message || 'Product upload failed');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleOpenEditModal = (product) => {
    setSelectedProduct(product);
    setEditProductForm({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      material: product.material,
      estimated_delivery_days: product.estimated_delivery_days
    });
    // Set editUploadedImages from product.image_url and product.image_urls
    const urls = [product.image_url, ...(product.image_urls || [])].filter(Boolean);
    setEditUploadedImages(urls);
    setIsEditModalOpen(true);
  };

  const handleUpdateProductSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingProduct) return;
    const { name, description, category, price, material, estimated_delivery_days } = editProductForm;
    
    const primaryImage = editUploadedImages.length > 0 ? editUploadedImages[0] : 'https://images.unsplash.com/photo-1605100804763-247f66126e28?w=500&q=80';
    const secondaryImages = editUploadedImages.length > 1 ? editUploadedImages.slice(1) : [];

    setIsSubmittingProduct(true);
    try {
      await updateProduct(selectedProduct.id, {
        name,
        description,
        category,
        price: parseFloat(price),
        material,
        image_url: primaryImage,
        image_urls: secondaryImages,
        estimated_delivery_days: parseInt(estimated_delivery_days)
      });
      toast.success('Product updated successfully!');
      setIsEditModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Product update failed');
    } finally {
      setIsSubmittingProduct(false);
    }
  };


  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product from the catalog?')) return;
    try {
      await deleteProduct(productId);
      toast.success('Product removed successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to delete product');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (isSubmittingProfile) return;
    setIsSubmittingProfile(true);
    try {
      await updateArtisanProfile(profileForm);
      toast.success('Artisan profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleOrderStatusAdvance = async (orderId, currentStatus, targetStatus) => {
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      await updateOrderStatus(orderId, targetStatus);
      toast.success(`Order state advanced to ${targetStatus}`);
    } catch (err) {
      toast.error(err.message || 'Status transition denied by ledger rules.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(val);
  };

  return (
    <motion.div 
      className="dashboard-container"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Header and Stats */}
      <div className="dashboard-header">
        <div>
          <h2 className="headline-lg">{t('Artisan Studio Dashboard')}</h2>
          <p className="body-md text-muted">{t('Manage bespoke jewelry requests, track production stages, and update your public showroom catalog.')}</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            if (!isVerified) {
              toast.error(t('Product uploads are restricted. Profile verification is pending.'));
              return;
            }
            setIsProductModalOpen(true);
          }}
          disabled={!isVerified}
        >
          <Plus size={16} /> {t('Add Product')}
        </button>
      </div>

      {!isVerified && (
        <div className="card alert-card-verification">
          <Shield size={24} className="text-secondary" />
          <div>
            <h4 className="headline-sm text-secondary">{t('Awaiting Verification Review')}</h4>
            <p className="body-sm text-muted">{t('Your artisan profile has been submitted. During this evaluation, product catalogs, quotation dispatches, and order processing actions are restricted. The administrator has been notified.')}</p>
          </div>
        </div>
      )}

      {artisanStats && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="label-sm">{t('Active Orders')}</span>
            <h3 className="display-lg">{activeOrdersCount}</h3>
          </div>
          <div className="stat-card">
            <span className="label-sm">{t('Pending Proposals')}</span>
            <h3 className="display-lg">{pendingRequestsCount}</h3>
          </div>
          <div className="stat-card">
            <span className="label-sm">{t('Revenue Cleared')}</span>
            <h3 className="display-lg text-green">{formatCurrency(artisanStats.total_earned)}</h3>
          </div>
          <div className="stat-card">
            <span className="label-sm">{t('Reliability Score')}</span>
            <h3 className="display-lg text-primary">{(user?.reliability_profile?.reliability_score ?? 100.0).toFixed(1)}%</h3>
            {user?.reliability_profile?.reliability_score !== undefined && (
              <span className="label-sm text-muted" style={{ display: 'block', marginTop: '2px', fontSize: '11px' }}>
                🛡️ {t('Badge')}: <strong>{
                  user.reliability_profile.reliability_score >= 95 ? t('Reliable') : 
                  user.reliability_profile.reliability_score >= 85 ? t('Usually On Time') : 
                  user.reliability_profile.reliability_score >= 70 ? t('Needs Improvement') : 
                  t('Critical Overdue Risk')
                }</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-link ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <Clipboard size={18} /> {t('Request Board')}
          {pendingRequestsCount > 0 && <span className="tab-badge gold">{pendingRequestsCount}</span>}
        </button>
        <button 
          className={`tab-link ${activeTab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
        >
          <Hammer size={18} /> {t('Production Pipeline')}
          {activeOrdersCount > 0 && <span className="tab-badge teal">{activeOrdersCount}</span>}
        </button>
        <button 
          className={`tab-link ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <Package size={18} /> {t('Catalog Management')}
        </button>
        <button 
          className={`tab-link ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <Edit size={18} /> {t('Studio Profile')}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="tab-panel-content">
        <AnimatePresence mode="wait">
          {activeTab === 'requests' && (
            <motion.div 
              key="requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="requests-panel"
            >
              <h3 className="headline-md mb-4">Client Custom Proposals</h3>
              {artisanRequests.length === 0 ? (
                <div className="empty-state">No custom requests received.</div>
              ) : (
                <div className="artisan-requests-grid">
                  {artisanRequests.map(req => (
                    <div key={req.id} className="card request-artisan-card">
                      <div className="request-card-header">
                        <div>
                          <h4 className="headline-sm">{req.jewellery_type}</h4>
                          <span className="label-sm text-muted">From: {req.client_name}</span>
                        </div>
                        <span className={`badge ${req.status === 'accepted' ? 'badge-teal' : req.status === 'rejected' ? 'badge-red' : 'badge-gold'}`}>
                          {req.status}
                        </span>
                      </div>
                      
                      <div className="request-details-grid mt-4">
                        <div className="detail-item">
                          <span>Target Budget</span>
                          <strong>{formatCurrency(req.budget)}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Quantity</span>
                          <strong>{req.quantity}</strong>
                        </div>
                        <div className="detail-item">
                          <span>Material Pref</span>
                          <strong>{req.material_preference}</strong>
                        </div>
                        {req.stone_preference && (
                          <div className="detail-item">
                            <span>Stone Pref</span>
                            <strong>{req.stone_preference}</strong>
                          </div>
                        )}
                        <div className="detail-item">
                          <span>Due Date Requested</span>
                          <strong>{new Date(req.expected_delivery_date).toLocaleDateString()}</strong>
                        </div>
                      </div>

                      <div className="request-description mt-4">
                        <span className="label-sm text-muted">Client Details:</span>
                        <p className="body-md mt-1">{req.description}</p>
                      </div>
                      <ReferenceImageSection url={req.reference_image_url} getImageUrl={getImageUrl} />

                      <div className="request-actions-bar border-t pt-4 mt-4">
                        {req.status === 'pending' && (
                          <div className="drawer-buttons w-full" style={{ justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleRejectRequest(req.id)}
                              disabled={!isVerified}
                            >
                              Decline
                            </button>
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleAcceptRequest(req.id)}
                              disabled={!isVerified}
                            >
                              Accept Proposal
                            </button>
                          </div>
                        )}
                        {req.status === 'accepted' && (
                          <div className="w-full flex justify-between align-center">
                            <span className="body-sm text-teal">Proposal Accepted. Awaiting your Quotation details.</span>
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => openQuoteModal(req)}
                              disabled={!isVerified}
                            >
                              Dispatch Quotation
                            </button>
                          </div>
                        )}
                        {req.status === 'rejected' && (
                          <span className="body-sm text-muted">Proposal declined by you.</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'pipeline' && (
            <motion.div 
              key="pipeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="pipeline-panel"
            >
              <h3 className="headline-md mb-4">Active Production Pipeline</h3>
              {artisanOrders.length === 0 ? (
                <div className="empty-state">No orders assigned. Accept proposals and dispatch quotes to start orders.</div>
              ) : (
                <div className="orders-list-vertical">
                  {artisanOrders.map(order => (
                    <div key={order.id} className="card client-order-card">
                      <div className="order-main-info">
                        <div className="order-title-block">
                          <h4 className="headline-sm">Jewellery Production Order</h4>
                          <span className="label-sm text-muted">Order: {order.id} • Client: {order.client_name}</span>
                          <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                            {order.expected_completion_date && (
                              <span className="label-sm" style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>
                                📅 Target Completion: <strong>{new Date(order.expected_completion_date).toLocaleDateString()}</strong>
                              </span>
                            )}
                            {order.extended_completion_date && (
                              <span className="label-sm" style={{ background: 'rgba(20, 110, 120, 0.1)', color: 'var(--color-teal)', padding: '2px 6px', borderRadius: '4px' }}>
                                🔄 Extended to: <strong>{new Date(order.extended_completion_date).toLocaleDateString()}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="order-price-tags">
                          <div className="price-tag">
                            <span>Settle Target</span>
                            <strong>{formatCurrency(order.total_amount)}</strong>
                          </div>
                          <div className="price-tag">
                            <span>Advance Deposit</span>
                            <strong>{formatCurrency(order.advance_amount)}</strong>
                          </div>
                          <div className="price-tag">
                            <span>Final Balance</span>
                            <strong>{formatCurrency(order.final_amount)}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="pipeline-progress-section mt-6">
                        <div className="tracker-status-label">
                          <span>Current Order State: <strong className="text-secondary">{order.status}</strong></span>
                        </div>
                        
                        {/* Rules description */}
                        <div className="status-timeline-helper mt-4 p-4 rounded-lg bg-gray-50 border">
                          <div className="flex align-center gap-2 mb-2">
                            <Info size={16} className="text-tertiary" />
                            <span className="label-sm">Order Stage Verification Guidance:</span>
                          </div>
                          <ul className="body-sm text-muted list-disc ml-4">
                            <li><strong>Advance Payment Pending:</strong> Wait for client deposit. Do not begin production.</li>
                            <li><strong>Advance Payment Secured:</strong> Deposit secured securely! Begin <strong>Design</strong>, <strong>Casting</strong> or <strong>Production</strong>.</li>
                            <li><strong>Ready for Delivery:</strong> Work complete. Settle final client payment to unlock delivery state.</li>
                            <li><strong>Final Payment Pending:</strong> Client has funded order securely! You are authorized to dispatch / ship the item.</li>
                            <li><strong>Delivered:</strong> Shipped. Awaiting client receipt confirmation.</li>
                            <li><strong>Completed:</strong> Ledger settlement complete. Funds released to your account.</li>
                          </ul>
                        </div>
                      </div>

                      {/* Status Transition Button triggers */}
                      <div className="order-actions-drawer border-t pt-4 mt-6">
                        <div className="actions-notes">
                          {order.delay_status?.is_delayed && order.status !== 'cancelled_artisan_delay' && (
                            <p className="body-sm text-red font-semibold" style={{ color: '#e53e3e', marginBottom: '6px' }}>
                              ⚠️ Production Delayed: This order is overdue by {order.delay_status.delay_days} day(s).
                            </p>
                          )}
                          {order.extension_requested && (
                            <p className="body-sm text-teal font-semibold" style={{ color: 'var(--color-teal)', marginBottom: '6px' }}>
                              ✔️ Proactive extension submitted to: {new Date(order.extended_completion_date).toLocaleDateString()} (Reason: {order.extension_reason})
                            </p>
                          )}
                          <span>Update production status to client:</span>
                        </div>
                        <div className="drawer-buttons">
                          {order.status === 'Advance Payment Pending' && (
                            <span className="body-sm text-amber font-semibold">Awaiting client advance payment...</span>
                          )}

                          {order.status === 'Advance Payment Secured' && (
                            <>
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOrderStatusAdvance(order.id, order.status, 'Design in Progress')}
                                disabled={!isVerified || isUpdatingStatus}
                              >
                                Begin Design Phase
                              </button>
                              <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => handleOrderStatusAdvance(order.id, order.status, 'Production Started')}
                                disabled={!isVerified || isUpdatingStatus}
                              >
                                Start Production
                              </button>
                            </>
                          )}

                          {['Design in Progress', 'Production Started', 'Work in Progress', 'Quality Check'].includes(order.status) && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <select 
                                className="input-field btn-sm font-semibold"
                                style={{ border: '1px solid var(--color-outline-variant)', width: 'auto', background: '#fff' }}
                                value={order.status}
                                onChange={(e) => handleOrderStatusAdvance(order.id, order.status, e.target.value)}
                                disabled={!isVerified || isUpdatingStatus}
                              >
                                <option value={order.status}>-- Advance Stage --</option>
                                <option value="Design in Progress">Design in Progress</option>
                                <option value="Production Started">Production Started</option>
                                <option value="Work in Progress">Work in Progress</option>
                                <option value="Quality Check">Quality Check</option>
                                <option value="Ready for Delivery">Ready for Delivery</option>
                              </select>
                            </div>
                          )}

                          {order.status === 'Ready for Delivery' && (
                            <span className="body-sm text-amber font-semibold">Awaiting client final payment...</span>
                          )}

                          {order.status === 'Final Payment Pending' && (
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleOrderStatusAdvance(order.id, order.status, 'Delivered')}
                              disabled={!isVerified || isUpdatingStatus}
                            >
                              Mark as Delivered / Dispatched
                            </button>
                          )}

                          {order.status === 'Delivered' && (
                            <span className="body-sm text-teal font-semibold">Dispatched. Awaiting client reception...</span>
                          )}

                          {order.status === 'Completed' && (
                            <span className="body-sm text-green font-semibold">Funds Released. Settle complete.</span>
                          )}
                          {canRequestExtension(order) && (
                            <button 
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => openExtensionModal(order)}
                              disabled={!isVerified}
                              style={{ background: 'var(--color-teal)', color: '#fff', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Calendar size={14} /> Request Extension (-5%)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'catalog' && (
            <motion.div 
              key="catalog"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="catalog-panel"
            >
              <h3 className="headline-md mb-4">{t('Showroom Jewelry Catalog')}</h3>
              {artisanProducts.length === 0 ? (
                <div className="empty-state">
                  {t('No products registered. Click "Add Product" to expand your catalog.')}
                </div>
              ) : (
                <div className="products-grid">
                  {artisanProducts.map(product => (
                    <CatalogProductCard 
                      key={product.id}
                      product={product}
                      handleDeleteProduct={handleDeleteProduct}
                      handleEditProduct={handleOpenEditModal}
                      isVerified={isVerified}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="profile-panel"
            >
              <div className="card p-6" style={{ maxWidth: '650px', margin: '0 auto', padding: '24px' }}>
                <h3 className="headline-md border-b pb-2 mb-4 text-primary">Studio Settings</h3>
                <form onSubmit={handleUpdateProfile} className="auth-form">
                  <div className="input-group">
                    <label className="input-label">Business Studio Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={profileForm.business_name}
                      onChange={(e) => setProfileForm({ ...profileForm, business_name: e.target.value })}
                      required 
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Jewellery Specialization</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={profileForm.jewellery_specialization}
                      onChange={(e) => setProfileForm({ ...profileForm, jewellery_specialization: e.target.value })}
                      required 
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Physical Workshop Location</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={profileForm.location}
                      onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                      required 
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Artisan Workshop Profile Bio</label>
                    <textarea 
                      className="input-field text-area-field" 
                      style={{ minHeight: '120px' }}
                      value={profileForm.profile_description}
                      onChange={(e) => setProfileForm({ ...profileForm, profile_description: e.target.value })}
                      required 
                    />
                  </div>

                  <button type="submit" className="btn btn-primary w-full mt-4" disabled={isSubmittingProfile}>
                    {isSubmittingProfile ? 'Saving Settings...' : 'Save Studio Settings'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Dispatched Quotation Modal */}
      <Modal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} title="Dispatch Design & Price Quotation">
        {selectedRequest && (
          <form onSubmit={handleQuoteSubmit} className="modal-form-scrollable">
            <div className="request-preview-box bg-gray-50 p-4 border rounded-lg mb-4">
              <span className="label-sm text-muted">Proposal Scope Summary:</span>
              <p className="body-md">Creating: <strong>{selectedRequest.jewellery_type}</strong> for {selectedRequest.client_name}</p>
              <p className="body-sm text-muted">Material requested: <strong>{selectedRequest.material_preference}</strong> • Target budget: <strong>{formatCurrency(selectedRequest.budget)}</strong></p>
            </div>

            <div className="input-grid">
              <div className="input-group">
                <label className="input-label">Quoted Total Amount (INR)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={quoteForm.quoted_amount}
                  onChange={(e) => setQuoteForm({ ...quoteForm, quoted_amount: e.target.value })}
                  required 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Advance Safe Deposit Required (INR)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={quoteForm.advance_amount}
                  onChange={(e) => setQuoteForm({ ...quoteForm, advance_amount: e.target.value })}
                  required 
                />
                <span className="label-sm text-muted mt-1">Recommended: 30% of total price.</span>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Estimated Delivery Date (to client)</label>
              <input 
                type="date" 
                className="input-field" 
                value={quoteForm.estimated_delivery_date}
                onChange={(e) => setQuoteForm({ ...quoteForm, estimated_delivery_date: e.target.value })}
                required 
              />
            </div>

            <div className="input-group">
              <label className="input-label">Production Completion Deadline (Expected Completion Date)</label>
              <input 
                type="date" 
                className="input-field" 
                value={quoteForm.expected_completion_date || ''}
                onChange={(e) => setQuoteForm({ ...quoteForm, expected_completion_date: e.target.value })}
                required 
              />
              <span className="label-sm text-muted mt-1">This is the formal completion date. Overdue delay penalties start after this date.</span>
            </div>

            <div className="input-group">
              <label className="input-label">Artisan Design & Craft Notes</label>
              <textarea 
                className="input-field text-area-field" 
                placeholder="Detail materials, gemstone grades, dimensions, sizing rules, or warranty notes (min 5 chars)..."
                value={quoteForm.design_notes}
                onChange={(e) => setQuoteForm({ ...quoteForm, design_notes: e.target.value })}
                required 
              />
            </div>

            <div className="modal-actions border-t pt-4">
              <button type="button" className="btn btn-secondary" onClick={() => setIsQuoteModalOpen(false)} disabled={isSubmittingQuote}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmittingQuote}>
                {isSubmittingQuote ? 'Dispatched...' : 'Dispatch Quote'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Catalog New Product Modal */}
      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Upload Product to Showroom Catalog">
        <form onSubmit={handleCreateProduct} className="modal-form-scrollable">
          <div className="input-group">
            <label className="input-label">Jewelry Product Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Royal Emerald Pendant"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              required 
            />
          </div>

          <div className="input-grid">
            <div className="input-group">
              <label className="input-label">Category</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Pendant, Ring, Bracelet"
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                required 
              />
            </div>
            <div className="input-group">
              <label className="input-label">Product Retail Price (INR)</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="e.g. 2400"
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                required 
              />
            </div>
          </div>

          <div className="input-grid">
            <div className="input-group">
              <label className="input-label">Material Specifications</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. 18k Yellow Gold, Diamond"
                value={productForm.material}
                onChange={(e) => setProductForm({ ...productForm, material: e.target.value })}
                required 
              />
            </div>
            <div className="input-group">
              <label className="input-label">Estimated Delivery (Days)</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="e.g. 10"
                value={productForm.estimated_delivery_days}
                onChange={(e) => setProductForm({ ...productForm, estimated_delivery_days: e.target.value })}
                required 
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Jewelry Design Images</label>
            <div 
              style={{
                border: '2px dashed var(--color-outline)',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.05)',
                cursor: 'pointer',
                transition: 'border-color 0.2s'
              }}
              onClick={() => document.getElementById('product-image-file-input').click()}
            >
              <Plus size={24} style={{ margin: '0 auto 8px', color: 'var(--color-primary)' }} />
              <p className="body-sm" style={{ margin: 0 }}>Click or drag images to upload</p>
              <span className="label-sm text-muted">Multiple images allowed. The first image will be set as primary.</span>
            </div>
            <input 
              id="product-image-file-input"
              type="file" 
              style={{ display: 'none' }}
              accept="image/*"
              multiple 
              onChange={handleProductFilesChange}
            />
            {isUploading && <span className="label-sm text-secondary animate-pulse" style={{ display: 'block', marginTop: '8px' }}>Uploading files...</span>}
            {uploadProgressMessage && <span className="label-sm text-teal" style={{ display: 'block', marginTop: '8px' }}>{uploadProgressMessage}</span>}
            
            {/* Visual Preview Grid */}
            {uploadedImages.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px', marginTop: '16px' }}>
                {uploadedImages.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', border: '1px solid var(--color-outline)', borderRadius: '6px', overflow: 'hidden' }}>
                    <img src={getImageUrl(img)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedImages(prev => prev.filter((_, i) => i !== idx));
                      }}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        background: 'rgba(220, 38, 38, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1
                      }}
                      title="Remove image"
                    >
                      <span className="notranslate">{'\u2715'}</span>
                    </button>
                    {idx === 0 ? (
                      <span style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        background: 'var(--color-teal)',
                        color: 'white',
                        fontSize: '9px',
                        textAlign: 'center',
                        padding: '2px 0',
                        fontWeight: 'bold'
                      }}>
                        Primary
                      </span>
                    ) : (
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Move this image to index 0
                          setUploadedImages(prev => {
                            const newImages = [...prev];
                            const [selected] = newImages.splice(idx, 1);
                            return [selected, ...newImages];
                          });
                        }}
                        style={{
                          position: 'absolute',
                          bottom: '0',
                          left: '0',
                          right: '0',
                          background: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          fontSize: '8px',
                          textAlign: 'center',
                          padding: '2px 0',
                          cursor: 'pointer'
                        }}
                        title="Click to set as primary"
                      >
                        Make Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="input-group">
            <label className="input-label">Catalog Description</label>
            <textarea 
              className="input-field text-area-field" 
              placeholder="Provide a detailed, attractive description of the piece, detailing the craftsmanship involved..."
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              required 
            />
          </div>

          <div className="modal-actions border-t pt-4">
            <button type="button" className="btn btn-secondary" onClick={() => setIsProductModalOpen(false)} disabled={isSubmittingProduct}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmittingProduct}>
              {isSubmittingProduct ? 'Uploading...' : 'Upload to Catalog'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Catalog Edit Product Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Showroom Catalog Product">
        {selectedProduct && (
          <form onSubmit={handleUpdateProductSubmit} className="modal-form-scrollable">
            <div className="input-group">
              <label className="input-label">Jewelry Product Name</label>
              <input 
                type="text" 
                className="input-field" 
                value={editProductForm.name}
                onChange={(e) => setEditProductForm({ ...editProductForm, name: e.target.value })}
                required 
              />
            </div>

            <div className="input-grid">
              <div className="input-group">
                <label className="input-label">Category</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editProductForm.category}
                  onChange={(e) => setEditProductForm({ ...editProductForm, category: e.target.value })}
                  required 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Product Retail Price (INR)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={editProductForm.price}
                  onChange={(e) => setEditProductForm({ ...editProductForm, price: e.target.value })}
                  required 
                />
              </div>
            </div>

            <div className="input-grid">
              <div className="input-group">
                <label className="input-label">Material Specifications</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editProductForm.material}
                  onChange={(e) => setEditProductForm({ ...editProductForm, material: e.target.value })}
                  required 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Estimated Delivery (Days)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={editProductForm.estimated_delivery_days}
                  onChange={(e) => setEditProductForm({ ...editProductForm, estimated_delivery_days: e.target.value })}
                  required 
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Jewelry Design Images</label>
              <div 
                style={{
                  border: '2px dashed var(--color-outline)',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s'
                }}
                onClick={() => document.getElementById('edit-product-image-file-input').click()}
              >
                <Plus size={24} style={{ margin: '0 auto 8px', color: 'var(--color-primary)' }} />
                <p className="body-sm" style={{ margin: 0 }}>Click or drag images to upload additional files</p>
                <span className="label-sm text-muted">Multiple images allowed. The first image will be set as primary.</span>
              </div>
              <input 
                id="edit-product-image-file-input"
                type="file" 
                style={{ display: 'none' }}
                accept="image/*"
                multiple 
                onChange={handleEditProductFilesChange}
              />
              {isUploading && <span className="label-sm text-secondary animate-pulse" style={{ display: 'block', marginTop: '8px' }}>Uploading files...</span>}
              {uploadProgressMessage && <span className="label-sm text-teal" style={{ display: 'block', marginTop: '8px' }}>{uploadProgressMessage}</span>}
              
              {/* Visual Preview Grid for Edit Mode */}
              {editUploadedImages.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px', marginTop: '16px' }}>
                  {editUploadedImages.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', border: '1px solid var(--color-outline)', borderRadius: '6px', overflow: 'hidden' }}>
                      <img src={getImageUrl(img)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditUploadedImages(prev => prev.filter((_, i) => i !== idx));
                        }}
                        style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          background: 'rgba(220, 38, 38, 0.9)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1
                        }}
                        title="Remove image"
                      >
                        <span className="notranslate">{'\u2715'}</span>
                      </button>
                      {idx === 0 ? (
                        <span style={{
                          position: 'absolute',
                          bottom: '0',
                          left: '0',
                          right: '0',
                          background: 'var(--color-teal)',
                          color: 'white',
                          fontSize: '9px',
                          textAlign: 'center',
                          padding: '2px 0',
                          fontWeight: 'bold'
                        }}>
                          Primary
                        </span>
                      ) : (
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            // Move this image to index 0
                            setEditUploadedImages(prev => {
                              const newImages = [...prev];
                              const [selected] = newImages.splice(idx, 1);
                              return [selected, ...newImages];
                            });
                          }}
                          style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            right: '0',
                            background: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            fontSize: '8px',
                            textAlign: 'center',
                            padding: '2px 0',
                            cursor: 'pointer'
                          }}
                          title="Click to set as primary"
                        >
                          Make Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">Catalog Description</label>
              <textarea 
                className="input-field text-area-field" 
                value={editProductForm.description}
                onChange={(e) => setEditProductForm({ ...editProductForm, description: e.target.value })}
                required 
              />
            </div>

            <div className="modal-actions border-t pt-4">
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)} disabled={isSubmittingProduct}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmittingProduct}>
                {isSubmittingProduct ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>
      {/* Deadline Extension Request Modal */}
      <Modal isOpen={isExtensionModalOpen} onClose={() => setIsExtensionModalOpen(false)} title="Request Proactive Completion Extension">
        {selectedExtensionOrder && (
          <form onSubmit={handleExtensionSubmit} className="modal-form-scrollable">
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-amber-800 mb-4" style={{ background: '#fff8e1', padding: '12px', borderRadius: '8px', color: '#b78103', border: '1px solid #ffe082' }}>
              <p className="font-semibold" style={{ fontWeight: 'bold' }}>⚠️ Proactive Extension Penalty Rule:</p>
              <p className="text-xs mt-1" style={{ fontSize: '12px', marginTop: '4px' }}>
                Filing an extension request adjusts your reliability score by <strong>-5.0%</strong> immediately to offset client inconvenience. 
                However, this prevents severe automated late penalties and client 100%-refund cancellation rights.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">New Expected Completion Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={extensionForm.extended_completion_date}
                onChange={(e) => setExtensionForm({ ...extensionForm, extended_completion_date: e.target.value })}
                required 
              />
            </div>

            <div className="input-group">
              <label className="input-label">Reason for Extension Request</label>
              <textarea 
                className="input-field text-area-field" 
                placeholder="Describe material sourcing issues, design complexity adjustments, or other valid reasons (min 10 chars)..."
                value={extensionForm.reason}
                onChange={(e) => setExtensionForm({ ...extensionForm, reason: e.target.value })}
                required 
              />
            </div>

            <div className="modal-actions border-t pt-4">
              <button type="button" className="btn btn-secondary" onClick={() => setIsExtensionModalOpen(false)} disabled={isSubmittingExtension}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmittingExtension} style={{ background: 'var(--color-teal)' }}>
                {isSubmittingExtension ? 'Submitting...' : 'Submit Extension'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Immediate Similarity Conflict/Dispute Modal */}
      <Modal 
        isOpen={showCreatedConflictModal} 
        onClose={() => {
          setShowCreatedConflictModal(false);
          setCreatedConflictProduct(null);
          setCreateDisputeJustification('');
          setCreateDisputeProofUrl('');
        }} 
        title="Warning: High Similarity Detected during Upload"
      >
        {createdConflictProduct && (
          <div className="space-y-4 text-sm" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-amber-800" style={{ background: '#fff8e1', padding: '12px', borderRadius: '8px', color: '#b78103', border: '1px solid #ffe082', display: 'flex', gap: '8px' }}>
              <Info size={20} style={{ flexShrink: 0 }} />
              <div>
                <p className="font-semibold" style={{ fontWeight: 'bold' }}>Plagiarism Warning - Direct Anchoring Blocked</p>
                <p className="text-xs mt-1" style={{ fontSize: '12px', marginTop: '4px' }}>
                  Our similarity detection model flags this design as visually matching existing entries. 
                  This product has been saved but set to **INACTIVE** and hidden from clients.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted" style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>Conflicting Designs Found in Marketplace:</p>
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2 bg-gray-50" style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px', padding: '8px', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {createdConflictProduct.conflicting_products?.map((match) => (
                  <div key={match.product_id} className="flex gap-3 bg-white p-2.5 rounded border items-center" style={{ display: 'flex', gap: '12px', background: '#fff', padding: '8px', borderRadius: '6px', border: '1px solid #eee', alignItems: 'center' }}>
                    <img 
                      src={getImageUrl(match.image_url)} 
                      alt={match.name} 
                      className="w-12 h-12 object-cover rounded border" 
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    <div className="flex-1 min-w-0" style={{ flex: 1, minWidth: 0 }}>
                      <p className="font-semibold text-xs truncate" style={{ fontWeight: 'bold', fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{match.name}</p>
                      <p className="text-[11px] text-muted truncate" style={{ fontSize: '11px', color: '#888', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Artisan ID: {match.artisan_id}</p>
                      {match.ai_similarity_score !== undefined && (
                        <p className="text-[11px] text-secondary font-medium" style={{ fontSize: '11px', color: 'var(--color-secondary)', fontWeight: '500', margin: 0 }}>AI Similarity: {(match.ai_similarity_score * 100).toFixed(0)}% match</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-100 p-3 rounded text-xs text-muted" style={{ background: '#f5f5f5', padding: '8px', borderRadius: '6px', fontSize: '11px', color: '#666' }}>
              To anchor and publish this design, you must submit a dispute ticket with written justification and visual proof files for manual Admin review.
            </div>

            <form onSubmit={handleCreateDisputeSubmit} className="space-y-3 mt-2" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="input-group">
                <label className="input-label" style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>Design Origin & Cultural Justification *</label>
                <textarea
                  className="input-field"
                  value={createDisputeJustification}
                  onChange={e => setCreateDisputeJustification(e.target.value)}
                  placeholder="Explain the unique handcrafted lineage, custom client instructions, or specific patterns of your original design..."
                  style={{ fontSize: '12px', minHeight: '60px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  required
                />
              </div>
              
              <div className="input-group">
                <label className="input-label" style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>Upload Originality Proof (Sketches, CAD files, workshop workbench photos)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCreateDisputeProofUpload}
                  style={{ fontSize: '11px' }}
                />
                {isUploadingCreateProof && <span style={{ fontSize: '11px', color: '#888' }}>Uploading proof image...</span>}
                {createDisputeProofUrl && (
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: 'bold' }}>✓ Proof Uploaded:</span>
                    <img
                      src={getImageUrl(createDisputeProofUrl)}
                      alt="Dispute Proof"
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd', marginTop: '4px' }}
                    />
                  </div>
                )}
              </div>

              <div className="border-t pt-4 flex justify-end gap-2" style={{ borderTop: '1px solid #eee', paddingTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary text-xs" 
                  style={{ fontSize: '12px' }} 
                  onClick={() => {
                    setShowCreatedConflictModal(false);
                    setCreatedConflictProduct(null);
                    setCreateDisputeJustification('');
                    setCreateDisputeProofUrl('');
                  }}
                >
                  Close & Submit Later
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary text-xs" 
                  disabled={isSubmittingCreateDispute || isUploadingCreateProof}
                  style={{ fontSize: '12px', background: '#e65100', color: '#fff', border: 'none' }}
                >
                  {isSubmittingCreateDispute ? "Submitting Dispute..." : "Submit Dispute to Admin"}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
