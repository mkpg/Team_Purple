import React, { useContext, useState } from 'react';
import { Hammer, Clipboard, Plus, Shield, Package, Edit, Trash, IndianRupee, Calendar, Info, RefreshCw } from 'lucide-react';
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

export default function ArtisanDashboard() {
  const {
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
    updateOrderStatus
  } = useContext(CraftShieldContext);

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

    const { name, description, category, price, material, estimated_delivery_days } = productForm;
    if (!name || !description || !category || !price || !material || !estimated_delivery_days) {
      toast.error('Please fill in all product details');
      return;
    }

    try {
      await createProduct({
        ...productForm,
        price: parseFloat(price),
        estimated_delivery_days: parseInt(estimated_delivery_days)
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
        estimated_delivery_days: ''
      });
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
                          <span>Current Escrow State: <strong className="text-secondary">{order.status}</strong></span>
                        </div>
                        
                        {/* Rules description */}
                        <div className="status-timeline-helper mt-4 p-4 rounded-lg bg-gray-50 border">
                          <div className="flex align-center gap-2 mb-2">
                            <Info size={16} className="text-tertiary" />
                            <span className="label-sm">Escrow Stage Verification Guidance:</span>
                          </div>
                          <ul className="body-sm text-muted list-disc ml-4">
                            <li><strong>Advance Payment Pending:</strong> Wait for client deposit. Do not begin production.</li>
                            <li><strong>Advance Payment Secured:</strong> Deposit secured in escrow! Begin <strong>Design</strong>, <strong>Casting</strong> or <strong>Production</strong>.</li>
                            <li><strong>Ready for Delivery:</strong> Work complete. Settle final client payment to unlock delivery state.</li>
                            <li><strong>Final Payment Pending:</strong> Client has funded escrow! You are authorized to dispatch / ship the item.</li>
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
                            <span className="body-sm text-green font-semibold">Escrow Released. Settle complete.</span>
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
              <h3 className="headline-md mb-4">Showroom Jewelry Catalog</h3>
              {artisanProducts.length === 0 ? (
                <div className="empty-state">No products registered. Click "Add Product" to expand your catalog.</div>
              ) : (
                <div className="products-grid">
                  {artisanProducts.map(product => (
                    <div key={product.id} className="card product-card">
                      <div className="product-image-wrapper">
                        <img src={product.image_url} alt={product.name} className="product-image" />
                        <div className="product-category-badge label-sm">{product.category}</div>
                      </div>
                      <div className="card-content">
                        <h4 className="headline-sm">{product.name}</h4>
                        <p className="body-sm text-muted line-clamp">{product.description}</p>
                        <div className="product-specifications">
                          <span>Material: <strong>{product.material}</strong></span>
                          <span>Delivery: <strong>{product.estimated_delivery_days} days</strong></span>
                        </div>
                        <div className="product-card-footer border-t pt-4 mt-4">
                          <span className="display-sm font-bold text-secondary">{formatCurrency(product.price)}</span>
                          <button 
                            className="btn btn-logout btn-sm"
                            onClick={() => handleDeleteProduct(product.id)}
                            disabled={!isVerified}
                            style={{ padding: '6px 10px', fontSize: '11px' }}
                          >
                            <Trash size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
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
                <label className="input-label">Advance Escrow Deposit Required (INR)</label>
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
              type="url" 
              className="input-field" 
              value={productForm.image_url}
              onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
              required 
            />
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
            <button type="submit" className="btn btn-primary">Upload to Catalog</button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
