import React, { useContext, useState, useEffect } from 'react';
import { Package, Truck, CheckCircle2, IndianRupee, Hammer, Send, Eye, FileText, ShoppingBag, CreditCard, XCircle, Shield, RefreshCw } from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CraftShieldContext } from '../context/CraftShieldContext';
import Modal from '../components/Modal';
import DynamicTranslate from '../components/DynamicTranslate';
import './ClientDashboard.css';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  exit: { opacity: 0 }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export function MarketplaceProductCard({ product, formatCurrency, setRequestForm, setIsRequestModalOpen, setBuyingProduct, setSelectedProduct, onDeleteSuccess }) {
  const { t, language, API_BASE_URL, getDesignProof, user, token } = useContext(CraftShieldContext);


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

  const handleShowProof = async (e) => {
    e.stopPropagation();
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
    if (language === 'ml') return '\u0d26\u0d3f\u0d35\u0d38\u0d19\u0d4d\u0d19\u0d7e';
    return 'days';
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${product.name}?`)) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/products/${product.id || product._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete product');
      toast.success('Product deleted successfully');
      if (onDeleteSuccess) onDeleteSuccess();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="card product-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedProduct(product)}>
      <div className="product-image-wrapper" style={{ position: 'relative', overflow: 'hidden' }} onContextMenu={e => e.preventDefault()}>
        <img 
          src={images[currentIdx]} 
          alt={product.name} 
          className="product-image" 
          style={{ width: '100%', height: '220px', objectFit: 'cover', userSelect: 'none', pointerEvents: 'none', filter: 'blur(1.5px) contrast(1.05) brightness(0.98)' }} 
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
          <span className="spec-label">{t('Material')}: <strong><DynamicTranslate text={product.material} /></strong></span>
          <span className="spec-label">{t('Delivery')}: <strong>{product.estimated_delivery_days} {getDaysTranslation()}</strong></span>
        </div>
        <div style={{ marginTop: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="text-muted">By: <strong style={{ color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline' }} onClick={(e) => {
            e.stopPropagation();
            setRequestForm(prev => ({
              ...prev,
              artisan_id: product.artisan_id,
              jewellery_type: product.category,
              description: `Request for custom jewelry based on design: ${product.name}...`,
              material_preference: product.material,
              budget: product.price
            }));
            setIsRequestModalOpen(true);
          }} title="Request Custom Design from this Artisan"><DynamicTranslate text={product.artisan_business_name} /></strong></span>
          {product.artisan_reliability_badge && (
            <span 
              style={{
                background: product.artisan_reliability_badge === 'Reliable' ? '#e6f4ea' : product.artisan_reliability_badge === 'Usually On Time' ? '#e8f0fe' : product.artisan_reliability_badge === 'New / Building History' ? '#fef7e0' : '#fce8e6', 
                color: product.artisan_reliability_badge === 'Reliable' ? '#137333' : product.artisan_reliability_badge === 'Usually On Time' ? '#1a73e8' : product.artisan_reliability_badge === 'New / Building History' ? '#b06000' : '#c5221f',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: '600',
                fontSize: '10px',
                border: '1px solid currentColor',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}
            >
              🛡️ {product.artisan_reliability_badge}
            </span>
          )}
        </div>
        <div className="product-card-footer border-t pt-4 mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span className="display-sm font-bold text-secondary">{formatCurrency(product.price)}</span>
            <button 
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={(e) => {
                e.stopPropagation();
                setRequestForm(prev => ({
                  ...prev,
                  artisan_id: product.artisan_id,
                  jewellery_type: product.category,
                  description: `I would like to order the catalog design: ${product.name}. Please provide a live quotation with today's material rates.`,
                  material_preference: product.material,
                  budget: product.price,
                  reference_image_url: product.image_url
                }));
                setIsRequestModalOpen(true);
              }}
            >
              <ShoppingBag size={14} /> {user?.role === 'admin' ? 'View Details' : 'Request Live Quote'}
            </button>
          </div>
          
          {user?.role === 'admin' && onDeleteSuccess && (
            <button 
              className="btn btn-sm"
              style={{ width: '100%', marginTop: '4px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #f87171' }}
              onClick={handleDelete}
            >
              Delete Product (Admin)
            </button>
          )}

          {product.design_hash && (
            <div 
              className="flex items-center gap-1.5 text-xs font-semibold text-teal bg-teal-light px-2.5 py-1 rounded border border-teal-variant cursor-pointer hover:opacity-90 transition-opacity"
              onClick={handleShowProof}
              style={{ display: 'inline-flex', cursor: 'pointer', background: 'rgba(20, 110, 120, 0.1)', color: 'var(--color-teal)', border: '1px solid var(--color-teal)', padding: '4px 8px', borderRadius: '4px', gap: '4px', alignSelf: 'flex-start' }}
              title={t('Verify Design')}
            >
              {verifying ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Shield size={12} />
              )}
              <span>{t('Blockchain Verified')}</span>
            </div>
          )}
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
    </div>

  );
}

function ReferenceImageSection({ url, getImageUrl }) {
  const [error, setError] = useState(false);
  if (error || !url) return null;
  return (
    <div className="reference-image-preview mt-4" style={{ position: 'relative', display: 'inline-block' }} onContextMenu={e => e.preventDefault()}>
      <span className="label-sm text-muted block mb-1">Reference Design:</span>
      <div style={{ position: 'relative', width: '120px', height: '120px', overflow: 'hidden', borderRadius: '8px' }}>
        <img 
          src={getImageUrl(url)} 
          alt="Reference Design" 
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

export default function ClientDashboard() {
  const {
    API_BASE_URL,
    clientStats,
    verifiedArtisans,
    marketplaceProducts,
    clientRequests,
    clientQuotations,
    clientOrders,
    clientPayments,
    createCustomRequest,
    acceptQuotation,
    rejectQuotation,
    payAdvance,
    payFinal,
    completeOrder,
    cancelOrder,
    cancelOrderDueToDelay,
    autoReleaseOrder,
    buyProductDesign,
    uploadImages,
    t,
    language,
    apiFetch
  } = useContext(CraftShieldContext);

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/uploads')) {
      return `${API_BASE_URL}${url}`;
    }
    return url;
  };

  const [activeTab, setActiveTab] = useState('marketplace'); // marketplace, requests, orders, payments
  
  // Custom Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMessage, setUploadProgressMessage] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const [requestForm, setRequestForm] = useState({
    artisan_id: '',
    jewellery_type: '',
    description: '',
    material_preference: '',
    stone_preference: '',
    quantity: 1,
    budget: '',
    expected_delivery_date: '',
    reference_image_url: ''
  });

  const handleReferenceFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadProgressMessage('Uploading reference image...');
    try {
      const urls = await uploadImages(files);
      if (urls && urls.length > 0) {
        setRequestForm(prev => ({
          ...prev,
          reference_image_url: urls[0]
        }));
        setUploadProgressMessage('Reference image uploaded successfully!');
        toast.success('Uploaded reference image.');
      }
    } catch (err) {
      toast.error(err.message || 'Reference upload failed');
      setUploadProgressMessage('Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Digital Contract Modal State
  const [signingQuote, setSigningQuote] = useState(null);
  const [signatureName, setSignatureName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isAcceptingQuote, setIsAcceptingQuote] = useState(false);

  // Direct Buy Modal State
  const [buyingProduct, setBuyingProduct] = useState(null);
  const [buySignatureName, setBuySignatureName] = useState('');
  const [buyTermsAccepted, setBuyTermsAccepted] = useState(false);
  const [isBuyingProduct, setIsBuyingProduct] = useState(false);

  // Inspect Design details and secure overlay
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    if (!selectedProduct) return;
    const handlePanic = () => {
      setSelectedProduct(null);
    };
    window.addEventListener('keydown', handlePanic, true);
    window.addEventListener('blur', handlePanic);
    document.addEventListener('mouseleave', handlePanic);
    return () => {
      window.removeEventListener('keydown', handlePanic, true);
      window.removeEventListener('blur', handlePanic);
      document.removeEventListener('mouseleave', handlePanic);
    };
  }, [selectedProduct]);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null); // { orderId, type: 'advance' | 'final', amount }
  const [txRef, setTxRef] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Client Receipt Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Tab count indicators
  const activeOrdersCount = clientOrders.filter(o => !['Completed', 'Cancelled'].includes(o.status)).length;
  const pendingQuotesCount = clientQuotations.filter(q => q.status === 'sent').length;

  const handleCustomRequestSubmit = async (e) => {
    e.preventDefault();
    const { artisan_id, jewellery_type, description, material_preference, budget, expected_delivery_date } = requestForm;

    if (!artisan_id || !jewellery_type || !description || !material_preference || !budget || !expected_delivery_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (jewellery_type.trim().length < 2) {
      toast.error('Jewellery category must be at least 2 characters long');
      return;
    }

    if (material_preference.trim().length < 2) {
      toast.error('Material preference must be at least 2 characters long');
      return;
    }

    if (description.trim().length < 10) {
      toast.error('Description must be at least 10 characters long to guide the artisan');
      return;
    }

    if (isSubmittingRequest) return;
    setIsSubmittingRequest(true);
    try {
      await createCustomRequest({
        ...requestForm,
        budget: parseFloat(budget),
        quantity: parseInt(requestForm.quantity)
      });
      toast.success('Custom request submitted successfully!');
      setIsRequestModalOpen(false);
      // Reset form
      setRequestForm({
        artisan_id: '',
        jewellery_type: '',
        description: '',
        material_preference: '',
        stone_preference: '',
        quantity: 1,
        budget: '',
        expected_delivery_date: '',
        reference_image_url: 'https://images.unsplash.com/photo-1599643478524-fb66f70a0066?w=500&q=80'
      });
      setActiveTab('requests');
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleViewReceipt = async (orderId) => {
    setReceiptLoading(true);
    setReceiptData(null);
    setIsReceiptModalOpen(true);
    try {
      const data = await apiFetch(`/api/client/orders/${orderId}/proof`);
      setReceiptData(data);
    } catch (err) {
      toast.error(err.message || 'Failed to load transaction receipt');
      setIsReceiptModalOpen(false);
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleDirectBuySubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!buyTermsAccepted || !buySignatureName.trim() || !buyingProduct) return;
    setIsBuyingProduct(true);
    try {
      await buyProductDesign(buyingProduct.id, buySignatureName.trim());
      toast.success('Direct purchase initiated! Please complete your advance payment.');
      setBuyingProduct(null);
      setBuySignatureName('');
      setBuyTermsAccepted(false);
      setActiveTab('orders');
    } catch (err) {
      toast.error(err.message || 'Direct buy failed');
    } finally {
      setIsBuyingProduct(false);
    }
  };

  const handleAcceptQuote = (quote) => {
    setSigningQuote(quote);
    setSignatureName('');
    setTermsAccepted(false);
  };

  const handleSignContractAndAccept = async () => {
    if (!termsAccepted) {
      toast.error('You must agree to the contract terms first.');
      return;
    }
    if (!signatureName.trim()) {
      toast.error('Please type your name to sign the contract.');
      return;
    }
    if (isAcceptingQuote) return;
    setIsAcceptingQuote(true);
    try {
      await acceptQuotation(signingQuote.id, { signed_by: signatureName });
      toast.success('Contract signed & Quotation accepted! Order created.');
      setSigningQuote(null);
      setActiveTab('orders');
    } catch (err) {
      toast.error(err.message || 'Failed to accept quotation');
    } finally {
      setIsAcceptingQuote(false);
    }
  };

  const handleRejectQuote = async (quoteId) => {
    try {
      await rejectQuotation(quoteId);
      toast.success('Quotation rejected.');
    } catch (err) {
      toast.error(err.message || 'Failed to reject quote');
    }
  };

  const openPaymentModal = (orderId, type, amount) => {
    setPaymentTarget({ orderId, type, amount });
    setTxRef(`TX-${type.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!txRef) {
      toast.error('Transaction reference is required');
      return;
    }
    if (isSubmittingPayment) return;
    setIsSubmittingPayment(true);
    try {
      if (paymentTarget.type === 'advance') {
        await payAdvance(paymentTarget.orderId, txRef);
        toast.success('Advance payment secured! Artisan notified.');
      } else {
        await payFinal(paymentTarget.orderId, txRef);
        toast.success('Final payment submitted! Awaiting delivery verification.');
      }
      setIsPaymentModalOpen(false);
      setPaymentTarget(null);
    } catch (err) {
      toast.error(err.message || 'Payment submission failed');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleConfirmDelivery = async (orderId) => {
    try {
      await completeOrder(orderId);
      toast.success('Order completed! Funds released.');
    } catch (err) {
      toast.error(err.message || 'Failed to complete order');
    }
  };

  const canCancel = (order) => {
    if (['Cancelled', 'Completed', 'Delivered', 'Disputed'].includes(order.status)) return false;
    const createdDate = new Date(order.created_at);
    const timeDiff = new Date() - createdDate;
    return timeDiff < 24 * 3600 * 1000;
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm(t('Are you sure you want to cancel this order?'))) {
      return;
    }
    try {
      await cancelOrder(orderId);
      toast.success(t('Order cancelled successfully.'));
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || t('Failed to cancel order.'));
    }
  };

  const handleCancelOrderDueToDelay = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order and request a 100% refund due to severe artisan delay?")) {
      return;
    }
    try {
      await cancelOrderDueToDelay(orderId);
      toast.success("Order cancelled successfully under the delay rule. 100% advance deposit refunded!");
    } catch (err) {
      toast.error(err.message || "Failed to cancel order");
    }
  };

  const getProgressPercentage = (status) => {
    switch (status) {
      case 'Advance Payment Pending': return 10;
      case 'Advance Payment Secured': return 25;
      case 'Design in Progress': return 40;
      case 'Production Started': return 55;
      case 'Work in Progress': return 70;
      case 'Quality Check': return 85;
      case 'Ready for Delivery': return 95;
      case 'Final Payment Pending': return 97;
      case 'Delivered': return 98;
      case 'Completed': return 100;
      default: return 0;
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
          <h2 className="headline-lg">{t('Client Portal')}</h2>
          <p className="body-md text-muted">
            {t('Purchase certified products or request tailored custom designs from verified artisans.')}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsRequestModalOpen(true)}>
          <Send size={16} /> {t('Custom Request')}
        </button>
      </div>

      {clientStats && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="label-sm">{t('Active Orders')}</span>
            <h3 className="display-lg">{activeOrdersCount}</h3>
          </div>
          <div className="stat-card">
            <span className="label-sm">{t('Pending Proposals')}</span>
            <h3 className="display-lg">{pendingQuotesCount}</h3>
          </div>
          <div className="stat-card">
            <span className="label-sm">{t('Total Spent')}</span>
            <h3 className="display-lg text-green">{formatCurrency(clientStats.total_spent)}</h3>
          </div>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-link ${activeTab === 'marketplace' ? 'active' : ''}`}
          onClick={() => setActiveTab('marketplace')}
        >
          <ShoppingBag size={18} /> {t('Marketplace')}
        </button>
        <button 
          className={`tab-link ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <FileText size={18} /> {t('Custom Requests')}
          {pendingQuotesCount > 0 && <span className="tab-badge gold">{pendingQuotesCount}</span>}
        </button>
        <button 
          className={`tab-link ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={18} /> {t('Orders')}
          {activeOrdersCount > 0 && <span className="tab-badge teal">{activeOrdersCount}</span>}
        </button>
        <button 
          className={`tab-link ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard size={18} /> {t('Payments')}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="tab-panel-content">
        <AnimatePresence mode="wait">
          {activeTab === 'marketplace' && (
            <motion.div 
              key="marketplace"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="marketplace-panel"
            >
              {/* Product Grid */}
              <div className="grid-section">
                <h3 className="headline-md">{t('In-Stock Designs')}</h3>
                {marketplaceProducts.length === 0 ? (
                  <div className="empty-state">{t('No showroom jewelry registered.')}</div>
                ) : (
                  <div className="products-grid">
                    {marketplaceProducts.map(product => (
                      <MarketplaceProductCard 
                        key={product.id}
                        product={product}
                        formatCurrency={formatCurrency}
                        setRequestForm={setRequestForm}
                        setIsRequestModalOpen={setIsRequestModalOpen}
                        setBuyingProduct={setBuyingProduct}
                        setSelectedProduct={setSelectedProduct}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Verified Artisans list */}
              <div className="grid-section mt-8">
                <h3 className="headline-md">{t('Verified Artisans')}</h3>
                {verifiedArtisans.length === 0 ? (
                  <div className="empty-state">{t('No master artisans registered.')}</div>
                ) : (
                  <div className="artisans-list">
                    {verifiedArtisans.map(artisan => (
                      <div key={artisan.artisan_id} className="card artisan-card">
                        <div className="artisan-header">
                          <div className="artisan-info">
                            <h4 className="headline-sm"><DynamicTranslate text={artisan.business_name} /></h4>
                            <span className="label-sm text-secondary"><DynamicTranslate text={artisan.jewellery_specialization} /></span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                            <span className="badge badge-green">{t('Verified')}</span>
                            {artisan.reliability_badge && (
                              <span 
                                className="badge" 
                                style={{ 
                                  background: artisan.reliability_badge === 'Reliable' ? '#e6f4ea' : artisan.reliability_badge === 'Usually On Time' ? '#e8f0fe' : artisan.reliability_badge === 'New / Building History' ? '#fef7e0' : '#fce8e6', 
                                  color: artisan.reliability_badge === 'Reliable' ? '#137333' : artisan.reliability_badge === 'Usually On Time' ? '#1a73e8' : artisan.reliability_badge === 'New / Building History' ? '#b06000' : '#c5221f',
                                  border: '1px solid currentColor',
                                  fontSize: '11px',
                                  padding: '1px 6px',
                                  fontWeight: '600'
                                }}
                              >
                                🛡️ {artisan.reliability_badge}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="body-md text-muted mt-2"><DynamicTranslate text={artisan.profile_description} /></p>
                        
                        {/* Offline contact helper */}
                        <div className="artisan-offline-contact bg-gray-50 border p-3 rounded-lg mt-3 flex flex-column gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span className="label-sm font-semibold text-secondary flex align-center gap-1">
                            {t('Direct Offline Booking')}
                          </span>
                          <span className="body-sm">
                            {t('Phone')}: <strong>{artisan.phone_number || '+91 98765 43210'}</strong>
                          </span>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <a 
                              href={`tel:${artisan.phone_number || '+919876543210'}`}
                              className="btn btn-secondary btn-sm text-center"
                              style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none', flex: 1, display: 'inline-block' }}
                            >
                              {t('Call Now')}
                            </a>
                            <a 
                              href={`sms:${artisan.phone_number || '+919876543210'}?body=${encodeURIComponent(t('Hello, I am interested in custom design services.'))}`}
                              className="btn btn-secondary btn-sm text-center"
                              style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none', flex: 1, display: 'inline-block' }}
                            >
                              {t('Send SMS')}
                            </a>
                          </div>
                        </div>

                        <div className="artisan-meta border-t pt-4 mt-4">
                          <span className="body-sm">{t('Location')}: <strong><DynamicTranslate text={artisan.location} /></strong></span>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setRequestForm(prev => ({
                                ...prev,
                                artisan_id: artisan.artisan_id
                              }));
                              setIsRequestModalOpen(true);
                            }}
                          >
                            {t('Request Design')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'requests' && (
            <motion.div 
              key="requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="requests-panel"
            >
              <div className="requests-container">
                {/* Custom Requests list */}
                <div className="panel-list-section">
                  <h3 className="headline-md">Your Custom Proposals</h3>
                  {clientRequests.length === 0 ? (
                    <div className="empty-state">No custom requests submitted yet.</div>
                  ) : (
                    <div className="requests-list">
                      {clientRequests.map(req => (
                        <div key={req.id} className="card request-list-card">
                          <div className="request-card-header">
                            <div>
                              <h4 className="headline-sm"><DynamicTranslate text={req.jewellery_type} /></h4>
                              <span className="label-sm text-muted">To: <DynamicTranslate text={req.artisan_business_name} /></span>
                            </div>
                            <span className={`badge ${req.status === 'accepted' ? 'badge-teal' : req.status === 'rejected' ? 'badge-red' : 'badge-gold'}`}>
                              {req.status}
                            </span>
                          </div>
                          <p className="body-sm text-muted mt-2"><DynamicTranslate text={req.description} /></p>
                          <div className="request-spec-grid mt-4">
                            <div>Budget: <strong>{formatCurrency(req.budget)}</strong></div>
                            <div>Material: <strong><DynamicTranslate text={req.material_preference} /></strong></div>
                            <div>Delivery: <strong>{new Date(req.expected_delivery_date).toLocaleDateString()}</strong></div>
                          </div>
                          <ReferenceImageSection url={req.reference_image_url} getImageUrl={getImageUrl} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quotations received */}
                <div className="panel-list-section">
                  <h3 className="headline-md">Received Custom Quotes</h3>
                  {clientQuotations.length === 0 ? (
                    <div className="empty-state">No quotations received.</div>
                  ) : (
                    <div className="quotations-list">
                      {clientQuotations.map(quote => (
                        <div key={quote.id} className="card quote-card">
                          <div className="quote-header">
                            <div>
                              <h4 className="headline-sm">Design Quotation</h4>
                              <span className="label-sm text-muted">From: <DynamicTranslate text={quote.artisan_business_name} /></span>
                            </div>
                            <span className={`badge ${quote.status === 'accepted' ? 'badge-green' : quote.status === 'rejected' ? 'badge-red' : 'badge-gold'}`}>
                              {quote.status}
                            </span>
                          </div>
                          <div className="quote-pricing-row mt-4">
                            <div className="pricing-box">
                              <span className="label-sm text-muted">Quoted Price</span>
                              <strong className="text-primary display-sm">{formatCurrency(quote.quoted_amount)}</strong>
                            </div>
                            <div className="pricing-box">
                              <span className="label-sm text-muted">Advance Deposit</span>
                              <strong className="text-secondary display-sm">{formatCurrency(quote.advance_amount)}</strong>
                            </div>
                          </div>
                          <div className="quote-notes mt-4">
                            <span className="label-sm text-muted">Artisan Design Notes:</span>
                            <p className="body-md italic"><DynamicTranslate text={quote.design_notes} /></p>
                          </div>
                          <div className="quote-meta border-t pt-4 mt-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span className="body-sm">Estimated Delivery: <strong>{new Date(quote.estimated_delivery_date).toLocaleDateString()}</strong></span>
                              {quote.expected_completion_date && (
                                <span className="body-sm">Expected Completion: <strong className="text-secondary">{new Date(quote.expected_completion_date).toLocaleDateString()}</strong></span>
                              )}
                            </div>
                            {quote.status === 'sent' && (
                              <div className="quote-actions">
                                <button className="btn btn-secondary btn-sm" onClick={() => handleRejectQuote(quote.id)}>
                                  Reject
                                </button>
                                <button className="btn btn-primary btn-sm" onClick={() => handleAcceptQuote(quote)}>
                                  Sign Contract & Accept
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="orders-panel"
            >
              <h3 className="headline-md mb-4">{t('Orders')}</h3>
              {clientOrders.length === 0 ? (
                <div className="empty-state">No orders active. Accept a quote to begin an order.</div>
              ) : (
                <div className="orders-list-vertical">
                  {clientOrders.map(order => {
                    const progress = getProgressPercentage(order.status);
                    return (
                      <div key={order.id} className="card client-order-card">
                        <div className="order-main-info">
                          <div className="order-title-block">
                            <h4 className="headline-sm">Custom Jewellery Order</h4>
                            <span className="label-sm text-muted">Order ID: {order.id} • Artisan: <DynamicTranslate text={order.artisan_business_name} /></span>
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
                              {order.contract_signed && (
                                <span className="label-sm" style={{ background: 'rgba(74, 185, 122, 0.15)', color: '#2f855a', padding: '2px 6px', borderRadius: '4px' }}>
                                  📄 Contract Signed by: <strong><DynamicTranslate text={order.contract_signed_by || 'Client'} /></strong>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="order-price-tags">
                            <div className="price-tag">
                              <span>Total Value</span>
                              <strong>{formatCurrency(order.total_amount)}</strong>
                            </div>
                            <div className="price-tag">
                              <span>Advance Due</span>
                              <strong>{formatCurrency(order.advance_amount)}</strong>
                            </div>
                            <div className="price-tag">
                              <span>Final Balance</span>
                              <strong>{formatCurrency(order.final_amount)}</strong>
                            </div>
                          </div>
                        </div>

                        {/* Status tracker bar */}
                        <div className="escrow-tracker mt-6">
                          <div className="tracker-status-label">
                            <span>Status: <strong className="text-secondary">{order.status}</strong></span>
                            <span>{progress}% Completed</span>
                          </div>
                          <div className="progress-bar-container">
                            <div className="progress-bar-bg">
                              <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>
                          <div className="progress-indicators">
                            <div className={`ind-step ${progress >= 10 ? 'active' : ''}`}>Accepted</div>
                            <div className={`ind-step ${progress >= 25 ? 'active' : ''}`}>Deposit</div>
                            <div className={`ind-step ${progress >= 55 ? 'active' : ''}`}>Production</div>
                            <div className={`ind-step ${progress >= 95 ? 'active' : ''}`}>Ready</div>
                            <div className={`ind-step ${progress >= 98 ? 'active' : ''}`}>Delivered</div>
                            <div className={`ind-step ${progress >= 100 ? 'active' : ''}`}>Completed</div>
                          </div>
                        </div>

                        {/* Actions drawer */}
                        <div className="order-actions-drawer border-t pt-4 mt-6">
                          <div className="actions-notes">
                            {order.status === 'Advance Payment Pending' && (
                              <p className="body-sm text-amber">
                                ⚠️ <strong>Advance Payment Required:</strong> Artisan will not start designs or source gems until deposit is secured.
                              </p>
                            )}
                            {order.status === 'Advance Payment Secured' && (
                              <p className="body-sm text-teal">
                                ✔️ Deposit secured. Artisan has been authorized to begin the design phase.
                              </p>
                            )}
                            {order.status === 'Ready for Delivery' && (
                              <p className="body-sm text-amber">
                                ⚠️ <strong>Final Balance Required:</strong> Settle final payment to unlock the delivery state.
                              </p>
                            )}
                            {order.status === 'Final Payment Pending' && (
                              <p className="body-sm text-teal">
                                ✔️ Final balance paid and held securely. Artisan is delivering physical shipment.
                              </p>
                            )}
                            {order.status === 'Delivered' && (
                              <p className="body-sm text-green">
                                💎 <strong>Item Delivered:</strong> Please verify the jewelry pieces and confirm delivery to release funds to the artisan.
                              </p>
                            )}
                            {order.status === 'Completed' && (
                              <p className="body-sm text-muted">
                                ✔️ Order complete. Funds released to artisan ledger. Thank you!
                              </p>
                            )}
                            {order.status === 'cancelled_artisan_delay' && (
                              <p className="body-sm text-red" style={{ color: '#e53e3e', fontWeight: 'bold' }}>
                                ❌ Cancelled due to Artisan Production Delay. {order.refunded_amount > 0 ? `100% refund of ${formatCurrency(order.refunded_amount)} repaid.` : 'Refund issued.'}
                              </p>
                            )}
                            {order.status === 'Cancelled' && (
                              <p className="body-sm text-red" style={{ color: '#e53e3e' }}>
                                ❌ Order cancelled. {order.refunded_amount > 0 ? `Refund of ${formatCurrency(order.refunded_amount)} (50% of advance) repaid.` : 'No refund issued.'}
                              </p>
                            )}
                            {order.delay_status?.is_delayed && order.status !== 'cancelled_artisan_delay' && (
                              <p className="body-sm text-red" style={{ color: '#e53e3e', fontWeight: 'bold', marginTop: '6px' }}>
                                ⚠️ Production Delayed: This order is currently {order.delay_status.delay_days} day(s) overdue.
                              </p>
                            )}
                            {order.delay_status?.eligible_for_refund && order.status !== 'cancelled_artisan_delay' && (
                              <p className="body-sm text-red" style={{ color: '#e53e3e', background: 'rgba(229, 62, 62, 0.08)', padding: '10px', borderRadius: '6px', marginTop: '6px', border: '1px solid rgba(229, 62, 62, 0.2)' }}>
                                💡 <strong>Refund Option Available:</strong> Since the artisan is 4+ days late and has not submitted a proactive extension request, you are entitled to cancel this order and receive a <strong>100% refund</strong> of your advance payment.
                              </p>
                            )}
                          </div>

                          <div className="drawer-buttons" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {order.status === 'Advance Payment Pending' && (
                              <button 
                                className="btn btn-primary"
                                onClick={() => openPaymentModal(order.id, 'advance', order.advance_amount)}
                              >
                                <IndianRupee size={16} /> Pay Advance ({formatCurrency(order.advance_amount)})
                              </button>
                            )}
                            {order.status === 'Ready for Delivery' && (
                              <button 
                                className="btn btn-primary"
                                onClick={() => openPaymentModal(order.id, 'final', order.final_amount)}
                              >
                                <IndianRupee size={16} /> Settle Final ({formatCurrency(order.final_amount)})
                              </button>
                            )}
                            {order.status === 'Delivered' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(20, 110, 120, 0.1)', color: 'var(--color-teal)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(20, 110, 120, 0.3)', fontSize: '13px', fontWeight: '500' }}>
                                  <span>⏳ <strong>Escrow Protection:</strong> Automatic payment release triggers in <strong>2 days, 23 hours</strong> if not confirmed manually.</span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                  <button 
                                    className="btn btn-primary"
                                    onClick={() => handleConfirmDelivery(order.id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                  >
                                    <CheckCircle2 size={16} /> Confirm Receipt & Release
                                  </button>
                                  <button 
                                    className="btn"
                                    onClick={async () => {
                                      try {
                                        await autoReleaseOrder(order.id);
                                        toast.success('Escrow period elapsed! Payments auto-released to artisan.');
                                      } catch (err) {
                                        toast.error(err.message || 'Auto-release failed');
                                      }
                                    }}
                                    style={{ background: 'var(--color-surface-mixed)', color: 'var(--color-primary)', border: '1px solid var(--color-outline)', display: 'flex', alignItems: 'center', gap: '6px' }}
                                  >
                                    ⚡ Simulate 3-Day Escrow Release
                                  </button>
                                </div>
                              </div>
                            )}
                            {order.status === 'Completed' && (
                              <button 
                                className="btn btn-secondary"
                                onClick={() => handleViewReceipt(order.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                <Shield size={16} /> View Transaction Receipt & QR
                              </button>
                            )}
                            {order.delay_status?.eligible_for_refund && order.status !== 'cancelled_artisan_delay' && (
                              <button 
                                className="btn btn-logout"
                                onClick={() => handleCancelOrderDueToDelay(order.id)}
                                style={{ background: '#e53e3e', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                <XCircle size={16} /> Cancel Order (100% Refund)
                              </button>
                            )}
                            {canCancel(order) && (
                              <button 
                                className="btn btn-logout"
                                onClick={() => handleCancelOrder(order.id)}
                                style={{ background: '#a0aec0', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                <XCircle size={16} /> {t('Cancel Order')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'payments' && (
            <motion.div 
              key="payments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="payments-panel"
            >
              <h3 className="headline-md mb-4">{t('Payments')}</h3>
              {clientPayments.length === 0 ? (
                <div className="empty-state">No payment history found.</div>
              ) : (
                <div className="table-responsive card">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Transaction Ref</th>
                        <th>Order ID</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientPayments.map(pay => (
                        <tr key={pay.id}>
                          <td><span className="font-mono text-muted">{pay.transaction_reference}</span></td>
                          <td><span className="font-mono text-muted">{pay.order_id}</span></td>
                          <td>
                            <span className={`badge ${pay.payment_type === 'advance' ? 'badge-gold' : pay.payment_type === 'refund' ? 'badge-red' : 'badge-teal'}`}>
                              {pay.payment_type}
                            </span>
                          </td>
                          <td><strong>{formatCurrency(pay.amount)}</strong></td>
                          <td>
                            <span className="badge badge-green">
                              {pay.status}
                            </span>
                          </td>
                          <td>{new Date(pay.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit Custom Request Modal */}
      <Modal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Submit Custom Jewelry Request">
        <form onSubmit={handleCustomRequestSubmit} className="modal-form-scrollable">
          <div className="input-group">
            <label className="input-label">Select Artisan</label>
            <select 
              className="input-field" 
              value={requestForm.artisan_id}
              onChange={(e) => setRequestForm({ ...requestForm, artisan_id: e.target.value })}
              required
            >
              <option value="">-- Choose verified artisan --</option>
              {verifiedArtisans.map(art => (
                <option key={art.artisan_id} value={art.artisan_id}>
                  {art.business_name} ({art.jewellery_specialization})
                </option>
              ))}
            </select>
          </div>

          <div className="input-grid">
            <div className="input-group">
              <label className="input-label">Jewellery Category</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Diamond Engagement Ring"
                value={requestForm.jewellery_type}
                onChange={(e) => setRequestForm({ ...requestForm, jewellery_type: e.target.value })}
                required 
              />
            </div>
            <div className="input-group">
              <label className="input-label">Material Preference</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. 18k White Gold"
                value={requestForm.material_preference}
                onChange={(e) => setRequestForm({ ...requestForm, material_preference: e.target.value })}
                required 
              />
            </div>
          </div>

          <div className="input-grid">
            <div className="input-group">
              <label className="input-label">Stone Preference (Optional)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. Blue Sapphire"
                value={requestForm.stone_preference}
                onChange={(e) => setRequestForm({ ...requestForm, stone_preference: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Quantity</label>
              <input 
                type="number" 
                className="input-field" 
                min="1"
                value={requestForm.quantity}
                onChange={(e) => setRequestForm({ ...requestForm, quantity: e.target.value })}
                required 
              />
            </div>
          </div>

          <div className="input-grid">
            <div className="input-group">
              <label className="input-label">Estimated Budget (INR)</label>
              <input 
                type="number" 
                className="input-field" 
                min="1" 
                placeholder="e.g. 1500"
                value={requestForm.budget}
                onChange={(e) => setRequestForm({ ...requestForm, budget: e.target.value })}
                required 
              />
            </div>
            <div className="input-group">
              <label className="input-label">Expected Delivery Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={requestForm.expected_delivery_date}
                onChange={(e) => setRequestForm({ ...requestForm, expected_delivery_date: e.target.value })}
                required 
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Description & Preferences</label>
            <textarea 
              className="input-field text-area-field" 
              placeholder="Describe your design vision, sizing, engravings, or any details to guide the artisan (min 10 chars)..."
              value={requestForm.description}
              onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
              required 
            />
          </div>

          <div className="input-group">
            <label className="input-label">Reference Image URL (Optional)</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Enter reference image URL, or upload below"
              value={requestForm.reference_image_url}
              onChange={(e) => setRequestForm({ ...requestForm, reference_image_url: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Or Upload Reference Image</label>
            <input 
              type="file" 
              className="input-field" 
              accept="image/*"
              onChange={handleReferenceFileChange}
            />
            {isUploading && <span className="label-sm text-secondary animate-pulse" style={{ display: 'block', marginTop: '4px' }}>Uploading file...</span>}
            {uploadProgressMessage && <span className="label-sm text-teal" style={{ display: 'block', marginTop: '4px' }}>{uploadProgressMessage}</span>}
          </div>

          <div className="modal-actions border-t pt-4">
            <button type="button" className="btn btn-secondary" onClick={() => setIsRequestModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmittingRequest}>
              {isSubmittingRequest ? 'Submitting...' : 'Submit Design request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Mock Payment Settlement Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Safe Payment Gateway (Mock)">
        {paymentTarget && (
          <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div className="payment-summary">
              <p className="body-md">Settle <strong>{paymentTarget.type} payment</strong> for order <strong>{paymentTarget.orderId}</strong></p>
              <div className="payment-amount-box text-center bg-gray-100 p-4 rounded-lg my-2">
                <span className="label-sm text-muted">Protected Amount</span>
                <h3 className="display-sm text-primary">{formatCurrency(paymentTarget.amount)}</h3>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Mock Transaction Reference</label>
              <input 
                type="text" 
                className="input-field font-mono" 
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                required 
              />
              <span className="label-sm text-muted mt-1">Generated sandbox reference. You can edit this.</span>
            </div>

            <div className="modal-actions border-t pt-4">
              <button type="button" className="btn btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel Sandbox</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmittingPayment}>
                {isSubmittingPayment ? 'Processing...' : 'Submit Payment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Digital Contract Modal */}
      <Modal isOpen={!!signingQuote} onClose={() => setSigningQuote(null)} title="📄 Digital Contract Commission Agreement">
        {signingQuote && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div className="contract-terms-box" style={{
              maxHeight: '260px',
              overflowY: 'auto',
              border: '1px solid var(--color-outline)',
              borderRadius: '8px',
              padding: '14px',
              background: 'var(--color-surface-mixed)',
              fontSize: '13px',
              lineHeight: '1.6',
              color: 'var(--color-text-body)'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)', fontWeight: 'bold' }}>COMMISSIONING CONTRACT TERMS</h4>
              <p>This document constitutes a binding digital agreement between <strong>Client ({signatureName || 'you'})</strong> and <strong>Artisan ({signingQuote.artisan_business_name})</strong> under the protection of the CraftShield Marketplace platform.</p>
              
              <h5 style={{ margin: '12px 0 4px 0', fontWeight: 'bold', color: 'var(--color-text-heading)' }}>1. Financial Commitment & Escrow</h5>
              <p>The client agrees to commission the custom design for a total amount of <strong>{formatCurrency(signingQuote.quoted_amount)}</strong>. An advance payment of <strong>{formatCurrency(signingQuote.advance_amount)}</strong> must be paid into the CraftShield Secure Escrow before work/design commences.</p>
              
              <h5 style={{ margin: '12px 0 4px 0', fontWeight: 'bold', color: 'var(--color-text-heading)' }}>2. Material & Labor Protections</h5>
              <p>To safeguard the artisan's materials and dedicated labor, <strong>no cancellations or refunds are permitted once production has started or design phases have begun</strong>. The 50% non-refundable advance fee will be forfeited to the artisan if cancellation is attempted after production starts.</p>
              
              <h5 style={{ margin: '12px 0 4px 0', fontWeight: 'bold', color: 'var(--color-text-heading)' }}>3. Completion & Escrow Auto-Release</h5>
              <p>The artisan commits to a target completion date of <strong>{new Date(signingQuote.estimated_delivery_date).toLocaleDateString()}</strong>. Upon delivery, the client has 3 days to inspect and confirm receipt. If no action is taken, the final payment is automatically released from escrow to the artisan.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '13px' }}>
                <input 
                  type="checkbox" 
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span>I read and agree to all terms, including the <strong>forfeiture of deposit</strong> and <strong>no cancellation policy</strong> after production has started.</span>
              </label>
            </div>

            <div className="input-group">
              <label className="input-label">Type your full name to sign digitally:</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. John Doe"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                required 
              />
            </div>

            <div className="modal-actions border-t pt-4">
              <button type="button" className="btn btn-secondary" onClick={() => setSigningQuote(null)}>Cancel</button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleSignContractAndAccept}
                disabled={!termsAccepted || !signatureName.trim() || isAcceptingQuote}
              >
                {isAcceptingQuote ? 'Signing & Committing...' : 'Sign Contract & Commission Design'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Direct Buy Checkout Modal */}
      <Modal isOpen={!!buyingProduct} onClose={() => setBuyingProduct(null)} title="🛒 Direct Design Checkout">
        {buyingProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(197, 160, 89, 0.08)', border: '1px solid rgba(197, 160, 89, 0.2)', padding: '14px', borderRadius: '8px' }}>
              <img 
                src={buyingProduct.image_url} 
                alt={buyingProduct.name} 
                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px' }} 
              />
              <div>
                <h4 style={{ margin: 0, fontWeight: 'bold' }}><DynamicTranslate text={buyingProduct.name} /></h4>
                <p className="body-sm text-muted" style={{ margin: '4px 0' }}><DynamicTranslate text={buyingProduct.description} /></p>
                <div style={{ fontWeight: 'bold', color: 'var(--color-secondary)' }}>Price: {formatCurrency(buyingProduct.price)}</div>
              </div>
            </div>

            <div className="contract-terms-box" style={{
              maxHeight: '180px',
              overflowY: 'auto',
              border: '1px solid var(--color-outline)',
              borderRadius: '8px',
              padding: '14px',
              background: 'var(--color-surface-mixed)',
              fontSize: '13px',
              lineHeight: '1.6',
              color: 'var(--color-text-body)'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)', fontWeight: 'bold' }}>PURCHASE AGREEMENT TERMS</h4>
              <p>This document constitutes a binding digital purchase contract between <strong>Client</strong> and <strong>Artisan (<DynamicTranslate text={buyingProduct.artisan_business_name} />)</strong> for the catalog design.</p>
              
              <h5 style={{ margin: '12px 0 4px 0', fontWeight: 'bold', color: 'var(--color-text-heading)' }}>1. Financial Commitment & Escrow</h5>
              <p>The total value is <strong>{formatCurrency(buyingProduct.price)}</strong>. To initiate the order, the client must pay an advance fee of <strong>{formatCurrency(buyingProduct.price * 0.5)}</strong> (50%) into the CraftShield Secure Escrow. The remaining 50% balance will be secured in escrow upon order completion.</p>
              
              <h5 style={{ margin: '12px 0 4px 0', fontWeight: 'bold', color: 'var(--color-text-heading)' }}>2. Material & Production Protections</h5>
              <p>Because the artisan starts crafting the selected design using precious materials upon booking, <strong>no cancellations or refunds are permitted once production begins</strong>. The 50% advance fee will be forfeited if the client attempts to cancel.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '13px' }}>
                <input 
                  type="checkbox" 
                  checked={buyTermsAccepted}
                  onChange={(e) => setBuyTermsAccepted(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <span>I read and agree to all terms, including the <strong>deposit forfeiture</strong> and <strong>no cancellation policy</strong>.</span>
              </label>
            </div>

            <div className="input-group">
              <label className="input-label">Type your full name to sign digitally:</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. John Doe"
                value={buySignatureName}
                onChange={(e) => setBuySignatureName(e.target.value)}
                required 
              />
            </div>

            <div className="modal-actions border-t pt-4">
              <button type="button" className="btn btn-secondary" onClick={() => setBuyingProduct(null)}>Cancel</button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleDirectBuySubmit}
                disabled={!buyTermsAccepted || !buySignatureName.trim() || isBuyingProduct}
              >
                {isBuyingProduct ? 'Processing Purchase...' : 'Sign Contract & Buy Now'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transaction Receipt Modal */}
      <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title="🛡️ Cryptographic Transaction Receipt & QR">
        {receiptLoading ? (
          <div className="empty-state">Loading cryptographic transaction proof...</div>
        ) : receiptData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(27, 94, 32, 0.08)', border: '1px solid rgba(27, 94, 32, 0.2)', padding: '14px', borderRadius: '8px' }}>
              <div style={{ background: '#1b5e20', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>\u2713</div>
              <div>
                <h4 style={{ margin: 0, color: '#1b5e20', fontWeight: 'bold' }}>Secured Receipt Verification</h4>
                <p className="body-sm text-muted" style={{ margin: 0 }}>HMAC-SHA256 authenticated by CraftShield Trust Node.</p>
              </div>
            </div>

            <div className="request-spec-grid mt-2" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', background: 'var(--color-surface-mixed)', padding: '14px', borderRadius: '8px', border: '1px solid var(--color-outline)', fontSize: '13px' }}>
              <div><strong>Proof ID:</strong> <span className="font-mono text-muted">{receiptData.proof.proof_id}</span></div>
              <div><strong>Order ID:</strong> <span className="font-mono text-muted">{receiptData.proof.order_id}</span></div>
              <div><strong>Category / Item:</strong> <span>{receiptData.proof.jewel_type}</span></div>
              <div><strong>Settled Amount:</strong> <strong>{formatCurrency(receiptData.proof.amount)}</strong></div>
              <div><strong>Completed At:</strong> <span>{new Date(receiptData.proof.completed_at).toLocaleString()}</span></div>
              <div style={{ overflowX: 'auto' }}><strong>HMAC-SHA256 Signature:</strong> <br/><span className="font-mono text-muted" style={{ fontSize: '11px', wordBreak: 'break-all' }}>{receiptData.proof.signature}</span></div>
            </div>

            {receiptData.qr_image && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px' }}>
                <img src={receiptData.qr_image} alt="Verification QR Code" style={{ width: '150px', height: '150px', border: '1px solid var(--color-outline)', borderRadius: '8px', padding: '8px', background: 'white' }} />
                <span className="label-sm text-muted">Scan QR with any device to verify on the public gateway</span>
              </div>
            )}

            <div className="modal-actions border-t pt-4" style={{ justifyContent: 'space-between' }}>
              <a 
                href={receiptData.verify_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-primary"
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Verify on Public Gateway
              </a>
              <button type="button" className="btn btn-secondary" onClick={() => setIsReceiptModalOpen(false)}>Close</button>
            </div>
          </div>
        ) : (
          <div className="empty-state text-red">Failed to load transaction receipt details.</div>
        )}
      </Modal>

      {/* Secure Inspect Design Details Modal */}
      {selectedProduct && (
        <Modal 
          isOpen={!!selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
          title="Inspect Design"
        >
          <div 
            className="inspect-modal-body" 
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }} onContextMenu={e => e.preventDefault()}>
              <img 
                src={getImageUrl(selectedProduct.image_url)} 
                alt={selectedProduct.name} 
                style={{ width: '100%', maxHeight: '380px', objectFit: 'contain', background: '#f5f5f0', display: 'block', margin: '0 auto', userSelect: 'none', pointerEvents: 'none' }}
                onDragStart={e => e.preventDefault()}
              />
            </div>

            <div>
              <h3 className="headline-md" style={{ margin: '0 0 6px 0' }}><DynamicTranslate text={selectedProduct.name} /></h3>
              <p className="body-md text-muted" style={{ margin: '0 0 14px 0' }}><DynamicTranslate text={selectedProduct.description} /></p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--color-surface-mixed)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-outline)', fontSize: '13px', marginBottom: '16px' }}>
                <div><strong>Category:</strong> <DynamicTranslate text={selectedProduct.category} /></div>
                <div><strong>Material:</strong> <DynamicTranslate text={selectedProduct.material} /></div>
                <div><strong>Delivery Frame:</strong> {selectedProduct.estimated_delivery_days} {selectedProduct.estimated_delivery_days === 1 ? 'day' : 'days'}</div>
                <div><strong>Price:</strong> <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{formatCurrency(selectedProduct.price)}</span></div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setBuyingProduct(selectedProduct);
                    setSelectedProduct(null);
                  }}
                >
                  <ShoppingBag size={16} /> Buy Design
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSelectedProduct(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}
