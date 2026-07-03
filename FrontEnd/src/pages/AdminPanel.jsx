import React, { useContext, useState } from 'react';
import { Users, IndianRupee, Activity, Check, X, Shield, ShoppingBag, CreditCard, Clipboard, Download, Edit, Trash, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CraftShieldContext } from '../context/CraftShieldContext';
import Modal from '../components/Modal';
import './AdminPanel.css';


const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  exit: { opacity: 0 }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export default function AdminPanel() {
  const {
    adminStats,
    adminUsers,
    adminPendingArtisans,
    adminProducts,
    adminOrders,
    adminPayments,
    adminDisputes,
    verifyArtisan,
    getDesignProof,
    adminDeleteProduct,
    adminUpdateProduct,
    getArtisanReliability,
    adjustArtisanReliability,
    uploadImages,
    API_BASE_URL
  } = useContext(CraftShieldContext);

  const [activeTab, setActiveTab] = useState('verifications'); // verifications, users, catalog, ledgers
  const [showProof, setShowProof] = useState(false);
  const [proofData, setProofData] = useState(null);
  const [loadingProof, setLoadingProof] = useState(false);

  // Reliability Modal State
  const [isReliabilityModalOpen, setIsReliabilityModalOpen] = useState(false);
  const [selectedArtisan, setSelectedArtisan] = useState(null);
  const [reliabilityDetails, setReliabilityDetails] = useState(null);
  const [loadingReliability, setLoadingReliability] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    score_delta: '',
    reason: ''
  });

  // Admin Product Edit modal state
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editProductForm, setEditProductForm] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    material: '',
    estimated_delivery_days: ''
  });
  const [editUploadedImages, setEditUploadedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMessage, setUploadProgressMessage] = useState('');

  const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/uploads')) {
      return `${API_BASE_URL}${url}`;
    }
    return url;
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

  const handleOpenEditProductModal = (product) => {
    setSelectedProduct(product);
    setEditProductForm({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      material: product.material,
      estimated_delivery_days: product.estimated_delivery_days
    });
    const urls = [product.image_url, ...(product.image_urls || [])].filter(Boolean);
    setEditUploadedImages(urls);
    setIsEditProductModalOpen(true);
  };

  const handleUpdateProductSubmit = async (e) => {
    e.preventDefault();
    const { name, description, category, price, material, estimated_delivery_days } = editProductForm;
    const primaryImage = editUploadedImages.length > 0 ? editUploadedImages[0] : 'https://images.unsplash.com/photo-1605100804763-247f66126e28?w=500&q=80';
    const secondaryImages = editUploadedImages.length > 1 ? editUploadedImages.slice(1) : [];

    try {
      await adminUpdateProduct(selectedProduct.id, {
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
      setIsEditProductModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Product update failed');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product from the global catalog?')) return;
    try {
      await adminDeleteProduct(productId);
      toast.success('Product deleted successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to delete product');
    }
  };

  const handleShowProof = async (productId) => {
    setLoadingProof(true);
    try {
      const res = await getDesignProof(productId);
      setProofData(res);
      setShowProof(true);
    } catch (err) {
      toast.error(err.message || 'Failed to load design proof');
    } finally {
      setLoadingProof(false);
    }
  };


  const handleVerify = async (artisanId, status) => {
    try {
      await verifyArtisan(artisanId, status);
      toast.success(`Artisan profile ${status} successfully!`);
    } catch (err) {
      toast.error(err.message || 'Failed to update artisan status');
    }
  };

  const handleOpenReliabilityModal = async (artisan) => {
    setSelectedArtisan(artisan);
    setReliabilityDetails(null);
    setLoadingReliability(true);
    setIsReliabilityModalOpen(true);
    setAdjustForm({ score_delta: '', reason: '' });
    try {
      const details = await getArtisanReliability(artisan.id || artisan._id);
      setReliabilityDetails(details);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch artisan reliability profile');
    } finally {
      setLoadingReliability(false);
    }
  };

  const handleAdjustReliability = async (e) => {
    e.preventDefault();
    if (!adjustForm.score_delta || !adjustForm.reason) {
      toast.error('Both adjustments values are required');
      return;
    }
    try {
      await adjustArtisanReliability(
        selectedArtisan.id || selectedArtisan._id, 
        parseFloat(adjustForm.score_delta), 
        adjustForm.reason
      );
      toast.success('Reliability adjusted successfully!');
      
      // Refresh the modal content
      const details = await getArtisanReliability(selectedArtisan.id || selectedArtisan._id);
      setReliabilityDetails(details);
      setAdjustForm({ score_delta: '', reason: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to adjust reliability');
    }
  };

  const handleExportUsers = () => {
    if (adminUsers.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Name,Username,Email,Phone,Role,Created\n"
      + adminUsers.map(e => `${e.id || e._id},${e.full_name},${e.username},${e.email},${e.phone_number},${e.role},${e.created_at}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "craftshield_users_directory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('User directory exported successfully!');
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(val);
  };

  // Build system stats array dynamically
  const systemStats = [
    { 
      label: 'Escrow Volume', 
      value: adminStats ? formatCurrency(adminStats.total_revenue) : '₹0', 
      icon: IndianRupee, 
      color: 'text-green' 
    },
    { 
      label: 'Verified Artisans', 
      value: adminStats ? (adminStats.total_artisans).toString() : '0', 
      icon: Users, 
      color: 'text-primary' 
    },
    { 
      label: 'Avg Reliability', 
      value: adminStats?.average_reliability ? `${adminStats.average_reliability.toFixed(1)}%` : '100.0%', 
      icon: Activity, 
      color: 'text-teal' 
    },
    { 
      label: 'Delayed Orders', 
      value: adminStats?.delayed_orders_count !== undefined ? (adminStats.delayed_orders_count).toString() : '0', 
      icon: Shield, 
      color: 'text-red' 
    }
  ];

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
          <h2 className="headline-lg">System Administration</h2>
          <p className="body-md text-muted">Verify artisan applications, audit escrow ledger agreements, and inspect system-wide user directories.</p>
        </div>
      </div>

      <div className="stats-row">
        {systemStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="stat-card">
              <span className="label-sm">{stat.label}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="display-lg">{stat.value}</h3>
                <Icon size={24} className={stat.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs Menu */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-link ${activeTab === 'verifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('verifications')}
        >
          <Shield size={18} /> Artisan Verifications
          {adminPendingArtisans.length > 0 && (
            <span className="tab-badge gold">{adminPendingArtisans.length}</span>
          )}
        </button>
        <button 
          className={`tab-link ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={18} /> User Directory
        </button>
        <button 
          className={`tab-link ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <ShoppingBag size={18} /> Global Products
        </button>
        <button 
          className={`tab-link ${activeTab === 'ledgers' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledgers')}
        >
          <CreditCard size={18} /> Audit Escrow Ledgers
        </button>
      </div>

      {/* Tab Panels */}
      <div className="tab-panel-content">
        <AnimatePresence mode="wait">
          {activeTab === 'verifications' && (
            <motion.div 
              key="verifications"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="verifications-panel"
            >
              <h3 className="headline-md mb-4">Pending Artisan Reviews</h3>
              {adminPendingArtisans.length === 0 ? (
                <div className="empty-state">No pending artisan profiles awaiting verification review.</div>
              ) : (
                <div className="admin-pending-grid">
                  {adminPendingArtisans.map(artisan => (
                    <div key={artisan.artisan_id} className="card pending-artisan-card">
                      <div className="pending-card-header">
                        <div>
                          <h4 className="headline-sm">{artisan.business_name}</h4>
                          <span className="label-sm text-secondary">{artisan.jewellery_specialization}</span>
                        </div>
                        <span className="badge badge-gold">Pending Review</span>
                      </div>
                      
                      <div className="profile-details-info mt-4">
                        <div className="info-row"><strong>Owner Name:</strong> {artisan.full_name} ({artisan.username})</div>
                        <div className="info-row"><strong>Email:</strong> {artisan.email}</div>
                        <div className="info-row"><strong>Phone:</strong> {artisan.phone_number}</div>
                        <div className="info-row"><strong>Location:</strong> {artisan.location}</div>
                      </div>

                      <div className="profile-description-bio mt-4">
                        <span className="label-sm text-muted">Workshop Bio:</span>
                        <p className="body-md italic mt-1">"{artisan.profile_description}"</p>
                      </div>

                      <div className="pending-actions-bar border-t pt-4 mt-6">
                        <button 
                          className="btn btn-logout btn-sm"
                          onClick={() => handleVerify(artisan.artisan_id, 'rejected')}
                          style={{ padding: '8px 16px', color: '#ba1a1a', border: '1px solid rgba(186, 26, 26, 0.2)' }}
                        >
                          <X size={14} /> Deny Application
                        </button>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleVerify(artisan.artisan_id, 'verified')}
                          style={{ padding: '8px 16px', backgroundColor: '#1b5e20' }}
                        >
                          <Check size={14} /> Approve & Verify
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div 
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="users-panel"
            >
              <div className="section-header card-padding flex justify-between align-center mb-4">
                <h3 className="headline-md">Registered Users Directory</h3>
                <button className="btn btn-secondary" onClick={handleExportUsers}>
                  <Download size={18} /> Export Users List
                </button>
              </div>

              {adminUsers.length === 0 ? (
                <div className="empty-state">No registered users found.</div>
              ) : (
                <div className="table-responsive card">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Name</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Phone / Score</th>
                        <th>System Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map(u => (
                        <tr key={u.id || u._id}>
                          <td><span className="font-mono text-muted">{u.id || u._id}</span></td>
                          <td><strong>{u.full_name}</strong></td>
                          <td>{u.username}</td>
                          <td>{u.email}</td>
                          <td>
                            <div>{u.phone_number}</div>
                            {u.role === 'artisan' && u.reliability_profile && (
                              <div style={{ marginTop: '4px' }}>
                                <span 
                                  className="badge"
                                  style={{
                                    background: u.reliability_profile.reliability_score >= 90 ? '#e6f4ea' : u.reliability_profile.reliability_score >= 70 ? '#e8f0fe' : u.reliability_profile.reliability_score >= 50 ? '#fef7e0' : '#fce8e6', 
                                    color: u.reliability_profile.reliability_score >= 90 ? '#137333' : u.reliability_profile.reliability_score >= 70 ? '#1a73e8' : u.reliability_profile.reliability_score >= 50 ? '#b06000' : '#c5221f',
                                    fontSize: '10px',
                                    padding: '2px 6px',
                                    fontWeight: 'bold',
                                    border: '1px solid currentColor'
                                  }}
                                >
                                  🛡️ {u.reliability_profile.reliability_score.toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${u.role === 'admin' ? 'badge-gold' : u.role === 'artisan' ? 'badge-teal' : 'badge-green'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-green">
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            {u.role === 'artisan' && (
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenReliabilityModal(u)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px' }}
                              >
                                <Activity size={12} /> Audit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
              <h3 className="headline-md mb-4">Global Jewellery Catalog Audit</h3>
              {adminProducts.length === 0 ? (
                <div className="empty-state">No products registered in system database.</div>
              ) : (
                <div className="table-responsive card">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product ID</th>
                        <th>Jewelry Name</th>
                        <th>Category</th>
                        <th>Material</th>
                        <th>Price</th>
                        <th>Artisan ID</th>
                        <th>Blockchain Proof</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminProducts.map(p => (
                        <tr key={p.id}>
                          <td><span className="font-mono text-muted">{p.id}</span></td>
                          <td><strong>{p.name}</strong></td>
                          <td>{p.category}</td>
                          <td>{p.material}</td>
                          <td><strong>{formatCurrency(p.price)}</strong></td>
                          <td><span className="font-mono text-muted">{p.artisan_id}</span></td>
                          <td>
                            {p.design_hash ? (
                              <span 
                                className="badge badge-teal" 
                                style={{ cursor: 'pointer', background: 'rgba(20, 110, 120, 0.1)', color: 'var(--color-teal)', border: '1px solid var(--color-teal)' }}
                                onClick={() => handleShowProof(p.id)}
                              >
                                View Proof
                              </span>
                            ) : (
                              <span className="badge badge-gold" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                                Not Anchored
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${p.is_active ? 'badge-green' : 'badge-gold'}`}>
                              {p.is_active ? 'Visible' : 'Hidden'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenEditProductModal(p)}
                                style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Edit size={12} /> Edit
                              </button>
                              <button 
                                className="btn btn-logout btn-sm"
                                onClick={() => handleDeleteProduct(p.id)}
                                style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Trash size={12} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'ledgers' && (
            <motion.div 
              key="ledgers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="ledgers-panel"
            >
              <div className="requests-container">
                {/* Orders List */}
                <div className="panel-list-section">
                  <h3 className="headline-md">System Orders Directory</h3>
                  {adminOrders.length === 0 ? (
                    <div className="empty-state">No orders registered.</div>
                  ) : (
                    <div className="requests-list">
                      {adminOrders.map(order => (
                        <div key={order.id} className="card request-list-card">
                          <div className="request-card-header">
                            <div>
                              <h4 className="headline-sm">Order ID: {order.id}</h4>
                              <span className="label-sm text-muted">Artisan ID: {order.artisan_id}</span>
                            </div>
                            <span className="badge badge-teal">{order.status}</span>
                          </div>
                          
                          <div className="request-spec-grid mt-4">
                            <div>Total: <strong>{formatCurrency(order.total_amount)}</strong></div>
                            <div>Advance: <strong>{formatCurrency(order.advance_amount)}</strong></div>
                            <div>Final: <strong>{formatCurrency(order.final_amount)}</strong></div>
                          </div>
                          <div className="body-sm text-muted mt-2">
                            Created: {new Date(order.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payments list */}
                <div className="panel-list-section">
                  <h3 className="headline-md">Escrow Payments Transaction Log</h3>
                  {adminPayments.length === 0 ? (
                    <div className="empty-state">No transactions captured.</div>
                  ) : (
                    <div className="quotations-list">
                      {adminPayments.map(pay => (
                        <div key={pay.id} className="card quote-card" style={{ borderColor: '#dcdad5' }}>
                          <div className="quote-header">
                            <div>
                              <h4 className="headline-sm">Tx Ref: {pay.transaction_reference}</h4>
                              <span className="label-sm text-muted">Order ID: {pay.order_id}</span>
                            </div>
                            <span className="badge badge-green">{pay.status}</span>
                          </div>
                          
                          <div className="quote-pricing-row mt-4" style={{ gap: '10px' }}>
                            <div className="pricing-box">
                              <span className="label-sm">Settle Amount</span>
                              <strong className="text-primary">{formatCurrency(pay.amount)}</strong>
                            </div>
                            <div className="pricing-box">
                              <span className="label-sm">Escrow Allocation</span>
                              <strong className="text-secondary">{pay.payment_type} deposit</strong>
                            </div>
                          </div>
                          
                          <div className="body-sm text-muted mt-4">
                            Transmitted: {new Date(pay.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
              <p className="font-semibold" style={{ fontWeight: 'bold' }}>Blockchain Design Authenticity Verified</p>
              <p className="text-xs mt-1" style={{ fontSize: '12px', marginTop: '4px' }}>This proof bundle confirms the design's registration date and ownership on the VeChain Thor Testnet blockchain.</p>
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
                href={proofData.explorer_url} 
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

      {/* Admin Edit Product Modal */}
      <Modal isOpen={isEditProductModalOpen} onClose={() => setIsEditProductModalOpen(false)} title="Admin: Edit Catalog Product">
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
                onClick={() => document.getElementById('admin-edit-product-image-file-input').click()}
              >
                <Plus size={24} style={{ margin: '0 auto 8px', color: 'var(--color-primary)' }} />
                <p className="body-sm" style={{ margin: 0 }}>Click or drag images to upload additional files</p>
                <span className="label-sm text-muted">Multiple images allowed. The first image will be set as primary.</span>
              </div>
              <input 
                id="admin-edit-product-image-file-input"
                type="file" 
                style={{ display: 'none' }}
                accept="image/*"
                multiple 
                onChange={handleEditProductFilesChange}
              />
              {isUploading && <span className="label-sm text-secondary animate-pulse" style={{ display: 'block', marginTop: '8px' }}>Uploading files...</span>}
              {uploadProgressMessage && <span className="label-sm text-teal" style={{ display: 'block', marginTop: '8px' }}>{uploadProgressMessage}</span>}
              
              {/* Visual Preview Grid */}
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
                        ✕
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
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditProductModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Artisan Reliability Audit & Manual Override Modal */}
      <Modal 
        isOpen={isReliabilityModalOpen} 
        onClose={() => setIsReliabilityModalOpen(false)} 
        title={selectedArtisan ? `Reliability Audit: ${selectedArtisan.full_name}` : "Artisan Reliability Audit"}
      >
        <div className="space-y-6" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '75vh', overflowY: 'auto', paddingRight: '4px' }}>
          {loadingReliability && <div className="text-center py-4">Loading reliability profile and history...</div>}
          
          {!loadingReliability && reliabilityDetails && (
            <>
              {/* Score Summary Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: '#f7fafc', padding: '16px', borderRadius: '8px', border: '1px solid #edf2f7', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#718096', textTransform: 'uppercase', tracking: 'wide' }}>Current Score</span>
                  <h4 style={{ fontSize: '24px', color: 'var(--color-primary)', margin: '4px 0 0 0', fontWeight: 'bold' }}>
                    {reliabilityDetails.reliability_score.toFixed(1)}%
                  </h4>
                </div>
                <div style={{ background: '#f7fafc', padding: '16px', borderRadius: '8px', border: '1px solid #edf2f7', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#718096', textTransform: 'uppercase', tracking: 'wide' }}>On-Time Streak</span>
                  <h4 style={{ fontSize: '24px', color: 'var(--color-teal)', margin: '4px 0 0 0', fontWeight: 'bold' }}>
                    {reliabilityDetails.consecutive_ontime_orders} Orders
                  </h4>
                </div>
              </div>

              {/* History Timeline */}
              <div>
                <h4 className="label-sm mb-2" style={{ fontWeight: 'bold' }}>Score Event History:</h4>
                {reliabilityDetails.score_history?.length === 0 ? (
                  <p className="body-sm text-muted">No penalty/reward events logged yet. Default score: 100.0</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                    {reliabilityDetails.score_history.map((event, index) => (
                      <div key={index} style={{ borderBottom: '1px solid #edf2f7', paddingBottom: '6px', marginBottom: '6px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                          <span style={{ color: event.delta < 0 ? '#c53030' : event.delta > 0 ? '#22543d' : '#2b6cb0' }}>
                            {event.event_type} ({event.delta >= 0 ? `+${event.delta.toFixed(1)}` : event.delta.toFixed(1)})
                          </span>
                          <span className="text-muted" style={{ fontSize: '10px' }}>{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                        {event.order_id && <div className="text-muted">Order ID: {event.order_id}</div>}
                        <div style={{ color: '#4a5568' }}>{event.note}</div>
                        <div className="text-muted" style={{ fontSize: '9px' }}>Score transitioned: {event.old_score.toFixed(1)} ➔ {event.new_score.toFixed(1)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Override Form */}
              <form onSubmit={handleAdjustReliability} style={{ borderTop: '1px solid #edf2f7', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 className="label-sm" style={{ fontWeight: 'bold' }}>Apply Manual Score Adjustment:</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '11px' }}>Score Change (e.g. -10, +5)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      className="input-field" 
                      placeholder="Delta"
                      value={adjustForm.score_delta}
                      onChange={(e) => setAdjustForm({ ...adjustForm, score_delta: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '11px' }}>Adjustment Justification Reason</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Excused late delivery..."
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-sm"
                    style={{ background: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    Apply Adjustment Override
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="modal-actions border-t pt-4" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button className="btn btn-secondary text-sm" onClick={() => setIsReliabilityModalOpen(false)}>Close Audit</button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}

