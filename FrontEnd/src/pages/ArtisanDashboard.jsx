import React, { useContext, useState } from 'react';
import { Hammer, Clipboard, Plus, Shield, Package, Edit, Trash, IndianRupee, Calendar, Info, RefreshCw, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CraftShieldContext } from '../context/CraftShieldContext';
import Modal from '../components/Modal';
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

function CatalogProductCard({ product, handleDeleteProduct, isVerified, formatCurrency }) {
  const { t, language, API_BASE_URL, registerProductDesign, getProductDesignProof } = useContext(CraftShieldContext);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofData, setProofData] = useState(null);
  const [loadingProof, setLoadingProof] = useState(false);
  const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
  const [conflictWarnings, setConflictWarnings] = useState([]);

  const handleAnchorDesign = async (e, forceOverride = false) => {
    if (e) e.stopPropagation();
    setIsAnchoring(true);
    try {
      const res = await registerProductDesign(product.id, forceOverride);
      toast.success(res.message || 'Design anchored on-chain successfully!');
      setShowOverrideConfirm(false);
    } catch (err) {
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.warnings) {
          setConflictWarnings(parsed.warnings);
          setShowOverrideConfirm(true);
          setIsAnchoring(false);
          return;
        }
      } catch (_) {}
      toast.error(err.message || 'Failed to anchor design proof');
    } finally {
      setIsAnchoring(false);
    }
  };

  const handleViewProof = async (e) => {
    if (e) e.stopPropagation();
    setLoadingProof(true);
    setShowProofModal(true);
    try {
      const data = await getProductDesignProof(product.id);
      setProofData(data);
    } catch (err) {
      toast.error(err.message || 'Failed to load design proof details');
    } finally {
      setLoadingProof(false);
    }
  };

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
    if (language === 'ml') return 'ದിവസങ്ങൾ';
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
        {product.blockchain_registered ? (
          <div 
            onClick={handleViewProof}
            style={{
              background: '#e6f4ea',
              color: '#137333',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '8px',
              border: '1px solid #ceead6'
            }}
          >
            🛡️ {loadingProof ? 'Loading Proof...' : 'Blockchain Verified'}
          </div>
        ) : isVerified ? (
          <button
            type="button"
            className="btn btn-logout btn-sm"
            onClick={(e) => handleAnchorDesign(e, false)}
            disabled={isAnchoring}
            style={{
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              padding: '6px',
              fontSize: '11px',
              width: '100%',
              borderRadius: '4px',
              marginBottom: '8px',
              cursor: 'pointer'
            }}
          >
            {isAnchoring ? 'Anchoring...' : 'Anchor Design Proof'}
          </button>
        ) : null}
        <div className="product-specifications">
          <span>{t('material')}: <strong>{t(product.material)}</strong></span>
          <span>{t('delivery')}: <strong>{product.estimated_delivery_days} {getDaysTranslation()}</strong></span>
        </div>
        <div className="product-card-footer border-t pt-4 mt-4">
          <span className="display-sm font-bold text-secondary">{formatCurrency(product.price)}</span>
          <button 
            className="btn btn-logout btn-sm"
            onClick={() => handleDeleteProduct(product.id)}
            disabled={!isVerified}
            style={{ padding: '6px 10px', fontSize: '11px' }}
          >
            <Trash size={12} /> {t('delete')}
          </button>
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
      <span className="label-sm text-muted block mb-1">Client Reference Design:</span>
      <img 
        src={getImageUrl(url)} 
        alt="Client Design Reference" 
        onError={() => setError(true)}
        style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-outline)' }} 
      />
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
    deleteProduct,
    acceptCustomRequest,
    rejectCustomRequest,
    createQuotation,
    requestOrderExtension,
    updateOrderStatus,
    getArtisanOrderProof,
    checkImageSimilarity,
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

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMessage, setUploadProgressMessage] = useState('');
  const [imageSimilarityStatus, setImageSimilarityStatus] = useState(null);

  const handleProductFilesChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadProgressMessage(`Uploading ${files.length} images...`);
    try {
      const urls = await uploadImages(files);
      if (urls && urls.length > 0) {
        const primary = urls[0];
        setProductForm(prev => {
          const secondary = urls.slice(1);
          const currentUrls = prev.image_urls
            ? prev.image_urls.split(',').map(u => u.trim()).filter(Boolean)
            : [];
          const updatedUrls = [...currentUrls, ...secondary];
          return {
            ...prev,
            image_url: primary,
            image_urls: updatedUrls.join(', ')
          };
        });
        setUploadProgressMessage(`Uploaded ${files.length} images successfully!`);
        toast.success(`Uploaded ${files.length} images.`);
        setImageSimilarityStatus({ state: 'checking', message: 'Checking for similar designs...' });
        try {
          const check = await checkImageSimilarity(primary);
          if (check.warnings && check.warnings.length > 0) {
            setImageSimilarityStatus({
              state: 'warning',
              message: 'This image looks similar to an existing design. You may proceed if this is your own original work.',
              warnings: check.warnings
            });
          } else {
            setImageSimilarityStatus({ state: 'clear', message: 'No exact or close design match found for this uploaded image.' });
          }
        } catch (err) {
          setImageSimilarityStatus({ state: 'blocked', message: err.message || 'This exact image matches an existing registered design.' });
          toast.error(err.message || 'This exact image matches an existing registered design.');
        }
      }
    } catch (err) {
      toast.error(err.message || 'Image upload failed');
      setUploadProgressMessage('Image upload failed.');
      setImageSimilarityStatus(null);
    } finally {
      setIsUploading(false);
    }
  };

  const [activeTab, setActiveTab] = useState('requests'); // requests, pipeline, catalog, profile

  // Quotation Modal State
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [quoteForm, setQuoteForm] = useState({
    quoted_amount: '',
    advance_amount: '',
    estimated_delivery_date: '',
    design_notes: ''
  });

  // Product Upload Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    material: '',
    image_url: 'https://images.unsplash.com/photo-1605100804763-247f66126e28?w=500&q=80',
    image_urls: '',
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
      design_notes: `Custom designed ${request.jewellery_type}. Cast in ${request.material_preference} with hand-set ${request.stone_preference || 'gems'}.`
    });
    setIsQuoteModalOpen(true);
  };

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    const { quoted_amount, advance_amount, estimated_delivery_date, design_notes } = quoteForm;

    if (!quoted_amount || !advance_amount || !estimated_delivery_date || !design_notes) {
      toast.error('All quote fields are required');
      return;
    }

    if (parseFloat(advance_amount) > parseFloat(quoted_amount)) {
      toast.error('Advance deposit cannot exceed the total quoted price');
      return;
    }

    try {
      await createQuotation({
        custom_request_id: selectedRequest.id,
        quoted_amount: parseFloat(quoted_amount),
        advance_amount: parseFloat(advance_amount),
        expected_completion_date: estimated_delivery_date,
        estimated_delivery_date,
        design_notes
      });
      toast.success('Quotation dispatched to client!');
      setIsQuoteModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to send quotation');
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!isVerified) {
      toast.error('Only verified artisans can upload products');
      return;
    }

    const { name, description, category, price, material, estimated_delivery_days, image_url, image_urls } = productForm;
    if (!name || !description || !category || !price || !material || !estimated_delivery_days) {
      toast.error('Please fill in all product details');
      return;
    }
    if (imageSimilarityStatus?.state === 'blocked') {
      toast.error('Resolve the exact image duplicate before publishing this product.');
      return;
    }

    // Split additional images
    const extraImages = image_urls
      ? image_urls.split(',').map(url => url.trim()).filter(url => url.length > 0)
      : [];

    try {
      await createProduct({
        ...productForm,
        price: parseFloat(price),
        estimated_delivery_days: parseInt(estimated_delivery_days),
        image_urls: extraImages
      });
      toast.success('Product uploaded successfully!');
      setIsProductModalOpen(false);
      setProductForm({
        name: '',
        description: '',
        category: '',
        price: '',
        material: '',
        image_url: 'https://images.unsplash.com/photo-1605100804763-247f66126e28?w=500&q=80',
        image_urls: '',
        estimated_delivery_days: ''
      });
      setImageSimilarityStatus(null);
    } catch (err) {
      toast.error(err.message || 'Product upload failed');
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
    try {
      await updateArtisanProfile(profileForm);
      toast.success('Artisan profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    }
  };

  const handleOrderStatusAdvance = async (orderId, currentStatus, targetStatus) => {
    try {
      await updateOrderStatus(orderId, targetStatus);
      toast.success(`Order state advanced to ${targetStatus}`);
    } catch (err) {
      toast.error(err.message || 'Status transition denied by ledger rules.');
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
          <h2 className="headline-lg">Artisan Studio Dashboard</h2>
          <p className="body-md text-muted">Manage bespoke jewelry requests, track production stages, and update your public showroom catalog.</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            if (!isVerified) {
              toast.error('Product uploads are restricted. Profile verification is pending.');
              return;
            }
            setIsProductModalOpen(true);
          }}
          disabled={!isVerified}
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {!isVerified && (
        <div className="card alert-card-verification">
          <Shield size={24} className="text-secondary" />
          <div>
            <h4 className="headline-sm text-secondary">Awaiting Verification Review</h4>
            <p className="body-sm text-muted">Your artisan profile has been submitted. During this evaluation, product catalogs, quotation dispatches, and order processing actions are restricted. The administrator has been notified.</p>
          </div>
        </div>
      )}

      {artisanStats && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="label-sm">Active Orders</span>
            <h3 className="display-lg">{activeOrdersCount}</h3>
          </div>
          <div className="stat-card">
            <span className="label-sm">Pending Proposals</span>
            <h3 className="display-lg">{pendingRequestsCount}</h3>
          </div>
          <div className="stat-card">
            <span className="label-sm">Revenue Cleared</span>
            <h3 className="display-lg text-green">{formatCurrency(artisanStats.total_earned)}</h3>
          </div>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-link ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <Clipboard size={18} /> Request Board
          {pendingRequestsCount > 0 && <span className="tab-badge gold">{pendingRequestsCount}</span>}
        </button>
        <button 
          className={`tab-link ${activeTab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
        >
          <Hammer size={18} /> Production Pipeline
          {activeOrdersCount > 0 && <span className="tab-badge teal">{activeOrdersCount}</span>}
        </button>
        <button 
          className={`tab-link ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <Package size={18} /> Catalog Management
        </button>
        <button 
          className={`tab-link ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <Edit size={18} /> Studio Profile
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
                            {order.expected_completion_date && (
                              <span className="label-sm text-muted">Due: <strong>{new Date(order.expected_completion_date).toLocaleDateString()}</strong></span>
                            )}
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
                                disabled={!isVerified}
                              >
                                Begin Design Phase
                              </button>
                              <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => handleOrderStatusAdvance(order.id, order.status, 'Production Started')}
                                disabled={!isVerified}
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
                                disabled={!isVerified}
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

                          {['Advance Payment Secured', 'Design in Progress', 'Production Started', 'Work in Progress', 'Quality Check'].includes(order.status) && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={async () => {
                                const newDate = window.prompt('Enter new completion date (YYYY-MM-DD):');
                                if (!newDate) return;
                                const reason = window.prompt('Reason for extension request:');
                                if (!reason) return;
                                try {
                                  await requestOrderExtension(order.id, newDate, reason);
                                  toast.success('Extension request logged and shared with client.');
                                } catch (err) {
                                  toast.error(err.message || 'Could not request extension');
                                }
                              }}
                              disabled={!isVerified}
                            >
                              Request Extension
                            </button>
                          )}

                          {order.status === 'Final Payment Pending' && (
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleOrderStatusAdvance(order.id, order.status, 'Delivered')}
                              disabled={!isVerified}
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
                        </div>
                        {order.status === 'Completed' && (
                          <TransactionProofCard order={order} fetchProof={getArtisanOrderProof} />
                        )}
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
              <h3 className="headline-md mb-4">{language === 'ta' ? 'காட்சி அறை நகைகளின் பட்டியல்' : language === 'te' ? 'షోరూమ్ జ్యువెలరీ కేటలాగ్' : language === 'kn' ? 'ಶೋರೂಮ್ ಒಡವೆಗಳ ಕ್ಯಾಟಲಾಗ್' : language === 'ml' ? 'ഷോറൂം ജ്വല്ലറി കാറ്റലോഗ്' : 'Showroom Jewelry Catalog'}</h3>
              {artisanProducts.length === 0 ? (
                <div className="empty-state">
                  {language === 'ta' ? 'தயாரிப்புகள் எதுவும் பதிவு செய்யப்படவில்லை. உங்கள் பட்டியலை விரிவாக்க "தயாரிப்பு சேர்க்க" என்பதை கிளிக் செய்யவும்.' :
                   language === 'te' ? 'ఉత్పత్తులు ఏవీ నమోదు కాలేదు. మీ కేటలాగ్‌ను విస్తరించడానికి "ఉత్పత్తిని జోడించు" క్లిಕ್ చేయండి.' :
                   language === 'kn' ? 'ಯಾವುದೇ ಉತ್ಪನ್ನಗಳು ನೊಂದಾಯಿಸಲ್ಪಟ್ಟಿಲ್ಲ. ನಿಮ್ಮ ಕ್ಯಾಟಲಾಗ್ ವಿಸ್ತರಿಸಲು "ಉತ್ಪನ್ನ ಸೇರಿಸಿ" ಕ್ಲಿಕ್ ಮಾಡಿ.' :
                   language === 'ml' ? 'ഉൽപ്പന്നങ്ങളൊന്നും രജിസ്റ്റർ ചെയ്തിട്ടില്ല. നിങ്ങളുടെ കാറ്റലോഗ് വിപുലീകരിക്കാൻ "ഉൽപ്പന്നം ചേർക്കുക" ക്ലിക്ക് ചെയ്യുക.' :
                   'No products registered. Click "Add Product" to expand your catalog.'}
                </div>
              ) : (
                <div className="products-grid">
                  {artisanProducts.map(product => (
                    <CatalogProductCard 
                      key={product.id}
                      product={product}
                      handleDeleteProduct={handleDeleteProduct}
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
              <div className="card p-6 mb-4" style={{ maxWidth: '650px', margin: '0 auto 16px auto', padding: '24px' }}>
                <h3 className="headline-md border-b pb-2 mb-4 text-primary">Reliability Profile</h3>
                <div className="request-spec-grid">
                  <div>
                    <span className="label-sm text-muted">Badge</span>
                    <strong>{user?.reliability_badge || 'Reliable'}</strong>
                  </div>
                  <div>
                    <span className="label-sm text-muted">Path to improvement</span>
                    <strong>{user?.reliability_path_to_improvement || 'Complete more on-time orders to improve this score.'}</strong>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="label-sm text-muted">Current streak</span>
                  <strong>{user?.reliability_profile?.consecutive_ontime_orders || 0}</strong>
                </div>
                <div className="mt-4">
                  <span className="label-sm text-muted">Recent history</span>
                  <div className="quotations-list mt-2">
                    {(user?.reliability_profile?.score_history || []).slice(0, 3).map((entry, idx) => (
                      <div key={`${entry.event_type}-${idx}`} className="card" style={{ padding: '12px', background: '#faf8f5' }}>
                        <div className="quote-header">
                          <strong>{entry.event_type}</strong>
                          <span className={entry.delta < 0 ? 'text-red' : 'text-green'}>{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</span>
                        </div>
                        <p className="body-sm text-muted mt-1">{entry.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
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

                  <button type="submit" className="btn btn-primary w-full mt-4">
                    Save Studio Settings
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
              <label className="input-label">Estimated Delivery Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={quoteForm.estimated_delivery_date}
                onChange={(e) => setQuoteForm({ ...quoteForm, estimated_delivery_date: e.target.value })}
                required 
              />
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
              <button type="button" className="btn btn-secondary" onClick={() => setIsQuoteModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Dispatch Quote</button>
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
            <label className="input-label">Product Catalog Image URL</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Primary image URL, or upload below"
              value={productForm.image_url}
              onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
              required 
            />
          </div>

          <div className="input-group">
            <label className="input-label">{t('additionalImages')}</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder={t('additionalImagesPlaceholder')}
              value={productForm.image_urls || ''}
              onChange={(e) => setProductForm({ ...productForm, image_urls: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Or Upload Jewelry Images (Multiple allowed)</label>
            <input 
              type="file" 
              className="input-field" 
              accept="image/*"
              multiple 
              onChange={handleProductFilesChange}
            />
            {isUploading && <span className="label-sm text-secondary animate-pulse" style={{ display: 'block', marginTop: '4px' }}>Uploading files...</span>}
            {uploadProgressMessage && <span className="label-sm text-teal" style={{ display: 'block', marginTop: '4px' }}>{uploadProgressMessage}</span>}
            {imageSimilarityStatus && (
              <div
                className="body-sm mt-2"
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-outline)',
                  background: imageSimilarityStatus.state === 'blocked' ? '#fff5f5' : imageSimilarityStatus.state === 'warning' ? '#fffaf0' : '#f0fdf8',
                  color: imageSimilarityStatus.state === 'blocked' ? '#c53030' : imageSimilarityStatus.state === 'warning' ? '#975a16' : '#276749'
                }}
              >
                {imageSimilarityStatus.message}
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
            <button type="button" className="btn btn-secondary" onClick={() => setIsProductModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={imageSimilarityStatus?.state === 'blocked'}>Upload to Catalog</button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
