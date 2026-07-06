import React, { useContext, useState } from 'react';
import { Package, Truck, CheckCircle2, IndianRupee, Hammer, Send, Eye, FileText, ShoppingBag, CreditCard, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CraftShieldContext } from '../context/CraftShieldContext';
import Modal from '../components/Modal';
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

function TransactionProofCard({ order, fetchProof }) {
  const [proofData, setProofData] = useState(null);
  const [loadingProof, setLoadingProof] = useState(false);

  const loadProof = async () => {
    setLoadingProof(true);
    try {
      const data = await fetchProof(order.id);
      setProofData(data);
    } catch (err) {
      toast.error(err.message || 'Could not load verified transaction receipt');
    } finally {
      setLoadingProof(false);
    }
  };

  const downloadProof = () => {
    if (!proofData?.qr_image) return;
    const link = document.createElement('a');
    link.href = proofData.qr_image;
    link.download = `craftshield-proof-${order.id}.png`;
    link.click();
  };

  return (
    <div className="card mt-4" style={{ padding: '16px', background: '#f8faf9' }}>
      <div className="quote-header">
        <div>
          <h4 className="headline-sm">Verified Transaction Receipt</h4>
          <p className="body-sm text-muted">The QR opens a server-side verification page. It proves this transaction record exists and has not been altered, not the physical material authenticity.</p>
        </div>
        {!proofData && (
          <button className="btn btn-secondary btn-sm" onClick={loadProof} disabled={loadingProof}>
            <FileText size={14} /> {loadingProof ? 'Loading...' : 'Show QR'}
          </button>
        )}
      </div>
      {proofData && (
        <div className="mt-4" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <img src={proofData.qr_image} alt="Verified transaction receipt QR" style={{ width: '132px', height: '132px', border: '1px solid var(--color-outline)', borderRadius: '8px' }} />
          <div>
            <div className="body-sm"><strong>Proof ID:</strong> {proofData.proof?.proof_id}</div>
            <div className="body-sm"><strong>Verify URL:</strong> <a href={proofData.verify_url} target="_blank" rel="noreferrer">{proofData.verify_url}</a></div>
            <button className="btn btn-primary btn-sm mt-2" onClick={downloadProof}>
              <FileText size={14} /> Download Proof
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function MarketplaceProductCard({ product, formatCurrency, setRequestForm, setIsRequestModalOpen, onDeleteSuccess }) {
  const { t, language, API_BASE_URL, user, deleteProduct } = useContext(CraftShieldContext);

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/uploads')) {
      return `${API_BASE_URL}${url}`;
    }
    return url;
  };

  const images = [product.image_url, ...(product.image_urls || [])].filter(Boolean).map(getImageUrl);
  const [currentIdx, setCurrentIdx] = useState(0);

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const getDaysTranslation = () => {
    if (language === 'ta') return 'நாட்கள்';
    if (language === 'te') return 'రోజులు';
    if (language === 'kn') return 'ದಿನಗಳು';
    if (language === 'ml') return 'ദിവസങ്ങൾ';
    return 'days';
  };

  return (
    <div className="card product-card">
      <div className="product-image-wrapper" style={{ position: 'relative', overflow: 'hidden' }}>
        <img src={images[currentIdx]} alt={product.name} className="product-image" style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
        <div className="product-category-badge label-sm">{t(product.category)}</div>
        
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
              ‹
            </button>
            <button 
              type="button"
              onClick={nextImage}
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
              ›
            </button>
            <div 
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
        <h4 className="headline-sm">{t(product.name)}</h4>
        <p className="body-sm text-muted line-clamp">{t(product.description)}</p>
        {product.artisan_reliability_badge && (
          <div className="mt-2">
            <span className={`badge ${product.artisan_reliability_badge === 'Reliable' ? 'badge-green' : product.artisan_reliability_badge === 'Usually On Time' ? 'badge-teal' : product.artisan_reliability_badge === 'New / Building History' ? 'badge-gold' : 'badge-red'}`}>
              {product.artisan_reliability_badge}
            </span>
          </div>
        )}
        <div className="product-specifications">
          <span className="spec-label">{t('material')}: <strong>{t(product.material)}</strong></span>
          <span className="spec-label">{t('delivery')}: <strong>{product.estimated_delivery_days} {getDaysTranslation()}</strong></span>
        </div>
        <div className="product-card-footer border-t pt-4 mt-4">
          <span className="display-sm font-bold text-secondary">{formatCurrency(product.price)}</span>
          {user?.role === 'admin' ? (
            <button 
              className="btn btn-logout btn-sm"
              style={{ backgroundColor: '#ba1a1a', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
              onClick={async (e) => {
                e.stopPropagation();
                if (window.confirm(`Are you sure you want to delete "${product.name}"? This action is permanent.`)) {
                  try {
                    await deleteProduct(product.id || product._id);
                    toast.success("Product deleted successfully!");
                    if (onDeleteSuccess) onDeleteSuccess();
                  } catch (err) {
                    toast.error(err.message || "Failed to delete product");
                  }
                }
              }}
            >
              Delete Post
            </button>
          ) : (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setRequestForm(prev => ({
                  ...prev,
                  artisan_id: product.artisan_id,
                  jewellery_type: product.category,
                  description: `Inquiry regarding: ${product.name}. Preferred customizations details...`,
                  material_preference: product.material,
                  budget: product.price
                }));
                setIsRequestModalOpen(true);
              }}
            >
              {t('requestCustomMock')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReferenceImageSection({ url, getImageUrl }) {
  const [error, setError] = useState(false);
  if (error || !url) return null;
  return (
    <div className="reference-image-preview mt-4">
      <span className="label-sm text-muted block mb-1">Reference Design:</span>
      <img 
        src={getImageUrl(url)} 
        alt="Reference Design" 
        onError={() => setError(true)}
        style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-outline)' }} 
      />
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
    clientTrustScore,
    createCustomRequest,
    acceptQuotation,
    rejectQuotation,
    payAdvance,
    payFinal,
    completeOrder,
    cancelOrder,
    resolveOrderDelay,
    getClientOrderProof,
    uploadImages,
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

  const [activeTab, setActiveTab] = useState('marketplace'); // marketplace, requests, orders, payments
  
  // Custom Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMessage, setUploadProgressMessage] = useState('');

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

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null); // { orderId, type: 'advance' | 'final', amount }
  const [txRef, setTxRef] = useState('');

  // Tab count indicators
  const activeOrdersCount = clientOrders.filter(o => !['Completed', 'Cancelled'].includes(o.status)).length;
  const pendingQuotesCount = clientQuotations.filter(q => q.status === 'sent').length;
  const trustProfile = clientTrustScore?.trust_profile || null;
  const trustBadge = clientTrustScore?.trust_badge || 'Reliable';
  const trustHistory = trustProfile?.score_history || [];

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
    }
  };

  const handleAcceptQuote = async (quoteId) => {
    try {
      await acceptQuotation(quoteId);
      toast.success('Quotation accepted! Order created.');
      setActiveTab('orders');
    } catch (err) {
      toast.error(err.message || 'Failed to accept quote');
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

  const handleResolveDelay = async (orderId, choice) => {
    try {
      await resolveOrderDelay(orderId, choice);
      toast.success(choice === 'stay_with_discount' ? 'Delay discount applied.' : 'Order cancelled and refund issued.');
    } catch (error) {
      toast.error(error.message || 'Unable to resolve delay');
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
    if (!window.confirm(t('cancelBookingConfirm'))) {
      return;
    }
    try {
      await cancelOrder(orderId);
      toast.success(t('cancelSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || t('cancelError'));
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
          <h2 className="headline-lg">{t('clientPortal')}</h2>
          <p className="body-md text-muted">
            {language === 'ta' ? 'சரிபார்க்கப்பட்ட கைவினைஞர்களிடமிருந்து சான்றளிக்கப்பட்ட நகைகளை வாங்கவும் அல்லது உங்களுக்கேற்ற வடிவமைப்பை கோரவும்.' : 
             language === 'te' ? 'ధృవీకరించబడిన కళాకారుల నుండి సర్టిఫైడ్ ఉత్పత్తులను కొనుగోలు చేయండి లేదా కస్టమ్ డిజైన్లను అభ్యర్థించండి.' : 
             language === 'kn' ? 'ದೃಢೀಕೃತ ಕಲಾಕಾರರಿಂದ ಪ್ರಮಾಣೀಕೃತ ಒಡವೆಗಳನ್ನು ಖರೀದಿಸಿ ಅಥವಾ ಕಸ್ಟಮ್ ವಿನ್ಯಾಸಗಳನ್ನು ವಿನಂತಿಸಿ.' : 
             language === 'ml' ? 'വെരിഫൈഡ് ആർട്ടിസാൻമാരിൽ നിന്ന് സർട്ടിഫൈഡ് ഉൽപ്പന്നങ്ങൾ വാങ്ങുക അല്ലെങ്കിൽ കസ്റ്റം ഡിസൈനുകൾ ആവശ്യപ്പെടുക.' : 
             'Purchase certified products or request tailored custom designs from verified artisans.'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsRequestModalOpen(true)}>
          <Send size={16} /> {t('customRequestBtn')}
        </button>
      </div>

      {clientStats && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="label-sm">{t('activeEscrows')}</span>
            <h3 className="display-lg">{activeOrdersCount}</h3>
          </div>
          <div className="stat-card">
            <span className="label-sm">{t('pendingQuotes')}</span>
            <h3 className="display-lg">{pendingQuotesCount}</h3>
          </div>
          <div className="stat-card">
            <span className="label-sm">{t('totalSpent')}</span>
            <h3 className="display-lg text-green">{formatCurrency(clientStats.total_spent)}</h3>
          </div>
        </div>
      )}

      {clientTrustScore && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="request-card-header">
            <div>
              <h3 className="headline-sm">{t('trustScore')}</h3>
              <span className="label-sm text-muted">{t('trustBadgeOverview')}</span>
            </div>
            <span className={`badge ${trustBadge === 'Reliable' ? 'badge-green' : trustBadge === 'Good Standing' ? 'badge-teal' : trustBadge === 'New / Building History' ? 'badge-gold' : 'badge-red'}`}>
              {trustBadge}
            </span>
          </div>
          <div className="request-spec-grid mt-4">
            <div>
              <span className="label-sm text-muted">{t('pathToImprovement')}</span>
              <strong>{clientTrustScore.path_to_improvement}</strong>
            </div>
            <div>
              <span className="label-sm text-muted">{t('trustOrdersCompleted')}</span>
              <strong>{trustProfile?.consecutive_good_orders || 0}</strong>
            </div>
          </div>
          {trustHistory.length > 0 && (
            <div className="mt-4">
              <span className="label-sm text-muted">{t('trustHistory')}</span>
              <div className="quotations-list mt-2">
                {trustHistory.slice(0, 3).map((entry, idx) => (
                  <div key={`${entry.event_type}-${idx}`} className="card" style={{ padding: '12px', background: '#faf8f5' }}>
                    <div className="quote-header">
                      <strong>{entry.event_type}</strong>
                      <span className={entry.delta < 0 ? 'text-red' : 'text-green'}>{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</span>
                    </div>
                    <p className="body-sm text-muted mt-1">{entry.note || t('trustHistoryDefaultNote')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs Menu */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-link ${activeTab === 'marketplace' ? 'active' : ''}`}
          onClick={() => setActiveTab('marketplace')}
        >
          <ShoppingBag size={18} /> {t('marketplace')}
        </button>
        <button 
          className={`tab-link ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <FileText size={18} /> {t('customRequests')}
          {pendingQuotesCount > 0 && <span className="tab-badge gold">{pendingQuotesCount}</span>}
        </button>
        <button 
          className={`tab-link ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={18} /> {t('escrowOrders')}
          {activeOrdersCount > 0 && <span className="tab-badge teal">{activeOrdersCount}</span>}
        </button>
        <button 
          className={`tab-link ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard size={18} /> {t('escrowLedger')}
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
                <h3 className="headline-md">{t('inStockDesigns')}</h3>
                {marketplaceProducts.length === 0 ? (
                  <div className="empty-state">{t('noProducts')}</div>
                ) : (
                  <div className="products-grid">
                    {marketplaceProducts.map(product => (
                      <MarketplaceProductCard 
                        key={product.id}
                        product={product}
                        formatCurrency={formatCurrency}
                        setRequestForm={setRequestForm}
                        setIsRequestModalOpen={setIsRequestModalOpen}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Verified Artisans list */}
              <div className="grid-section mt-8">
                <h3 className="headline-md">{t('masterArtisans')}</h3>
                {verifiedArtisans.length === 0 ? (
                  <div className="empty-state">{t('noArtisans')}</div>
                ) : (
                  <div className="artisans-list">
                    {verifiedArtisans.map(artisan => (
                      <div key={artisan.artisan_id} className="card artisan-card">
                        <div className="artisan-header">
                          <div className="artisan-info">
                            <h4 className="headline-sm">{artisan.business_name}</h4>
                            <span className="label-sm text-secondary">{artisan.jewellery_specialization}</span>
                          </div>
                          <span className="badge badge-green">{t('verified')}</span>
                        </div>
                        <div className="mt-2">
                          <span className={`badge ${artisan.trust_badge === 'Reliable' ? 'badge-green' : artisan.trust_badge === 'Good Standing' ? 'badge-teal' : artisan.trust_badge === 'New / Building History' ? 'badge-gold' : 'badge-red'}`}>
                            {artisan.trust_badge || t('trustBadge')}
                          </span>
                          <span className={`badge ml-2 ${artisan.reliability_badge === 'Reliable' ? 'badge-green' : artisan.reliability_badge === 'Usually On Time' ? 'badge-teal' : artisan.reliability_badge === 'New / Building History' ? 'badge-gold' : 'badge-red'}`} style={{ marginLeft: '8px' }}>
                            {artisan.reliability_badge || 'Reliable'}
                          </span>
                        </div>
                        <p className="body-md text-muted mt-2">{artisan.profile_description}</p>
                        
                        {/* Offline contact helper */}
                        <div className="artisan-offline-contact bg-gray-50 border p-3 rounded-lg mt-3 flex flex-column gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span className="label-sm font-semibold text-secondary flex align-center gap-1">
                            {t('directOfflineBooking')}
                          </span>
                          <span className="body-sm">
                            {language === 'ta' ? 'கைபேசி எண்' : language === 'te' ? 'ఫోన్ నంబర్' : language === 'kn' ? 'ದೂರವಾಣಿ ಸಂಖ್ಯೆ' : language === 'ml' ? 'ഫോൺ നമ്പർ' : 'Phone'}: <strong>{artisan.phone_number || '+91 98765 43210'}</strong>
                          </span>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            <a 
                              href={`tel:${artisan.phone_number || '+919876543210'}`}
                              className="btn btn-secondary btn-sm text-center"
                              style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none', flex: 1, display: 'inline-block' }}
                            >
                              {t('callNow')}
                            </a>
                            <a 
                              href={`sms:${artisan.phone_number || '+919876543210'}?body=${encodeURIComponent(t('directCallBody'))}`}
                              className="btn btn-secondary btn-sm text-center"
                              style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none', flex: 1, display: 'inline-block' }}
                            >
                              {t('sendSms')}
                            </a>
                          </div>
                        </div>

                        <div className="artisan-meta border-t pt-4 mt-4">
                          <span className="body-sm">{t('location')}: <strong>{artisan.location}</strong></span>
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
                            {t('hireArtisan')}
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
                              <h4 className="headline-sm">{req.jewellery_type}</h4>
                              <span className="label-sm text-muted">To: {req.artisan_business_name}</span>
                              <div className="mt-1">
                                <span className={`badge ${req.client_trust_badge === 'Reliable' ? 'badge-green' : req.client_trust_badge === 'Good Standing' ? 'badge-teal' : req.client_trust_badge === 'New / Building History' ? 'badge-gold' : 'badge-red'}`}>
                                  {req.client_trust_badge || t('trustBadge')}
                                </span>
                              </div>
                            </div>
                            <span className={`badge ${req.status === 'accepted' ? 'badge-teal' : req.status === 'rejected' ? 'badge-red' : 'badge-gold'}`}>
                              {req.status}
                            </span>
                          </div>
                          <p className="body-sm text-muted mt-2">{req.description}</p>
                          <div className="request-spec-grid mt-4">
                            <div>Budget: <strong>{formatCurrency(req.budget)}</strong></div>
                            <div>Material: <strong>{req.material_preference}</strong></div>
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
                              <span className="label-sm text-muted">From: {quote.artisan_business_name}</span>
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
                            <p className="body-md italic">{quote.design_notes}</p>
                          </div>
                          <div className="quote-meta border-t pt-4 mt-4">
                            <span className="body-sm">Estimated Delivery: <strong>{new Date(quote.estimated_delivery_date).toLocaleDateString()}</strong></span>
                            {quote.status === 'sent' && (
                              <div className="quote-actions">
                                <button className="btn btn-secondary btn-sm" onClick={() => handleRejectQuote(quote.id)}>
                                  Reject
                                </button>
                                <button className="btn btn-primary btn-sm" onClick={() => handleAcceptQuote(quote.id)}>
                                  Accept & Order
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
              <h3 className="headline-md mb-4">{t('escrowOrders')}</h3>
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
                            <span className="label-sm text-muted">Order ID: {order.id} • Artisan: {order.artisan_business_name}</span>
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
                            {order.status === 'Cancelled' && (
                              <p className="body-sm text-red" style={{ color: '#e53e3e' }}>
                                ❌ Order cancelled. {order.refunded_amount > 0 ? `Refund of ${formatCurrency(order.refunded_amount)} (50% of advance) repaid.` : 'No refund issued.'}
                              </p>
                            )}
                          </div>

                          {order.status === 'Completed' && (
                            <TransactionProofCard order={order} fetchProof={getClientOrderProof} />
                          )}

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
                              <button 
                                className="btn btn-primary"
                                onClick={() => handleConfirmDelivery(order.id)}
                              >
                                <CheckCircle2 size={16} /> Confirm Receipt & Release
                              </button>
                            )}
                            {order.delay_status === 'late' && (
                              <>
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => handleResolveDelay(order.id, 'stay_with_discount')}
                                >
                                  Keep with discount ({order.delay_discount_percent || 0}% off)
                                </button>
                                <button
                                  className="btn btn-logout"
                                  onClick={() => handleResolveDelay(order.id, 'cancel_full_refund')}
                                  style={{ background: '#c53030', color: 'white' }}
                                >
                                  Cancel and refund
                                </button>
                              </>
                            )}
                            {canCancel(order) && (
                              <button 
                                className="btn btn-logout"
                                onClick={() => handleCancelOrder(order.id)}
                                style={{ background: '#e53e3e', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                <XCircle size={16} /> {t('cancelBooking')}
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
              <h3 className="headline-md mb-4">{t('escrowLedger')}</h3>
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
            <button type="submit" className="btn btn-primary">Submit Design request</button>
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
              <button type="submit" className="btn btn-primary">Submit Payment</button>
            </div>
          </form>
        )}
      </Modal>
    </motion.div>
  );
}
