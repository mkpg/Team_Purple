import React, { useContext, useState } from 'react';
import { Package, Truck, CheckCircle2, IndianRupee, Hammer, Send, Eye, FileText, ShoppingBag, CreditCard } from 'lucide-react';
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

export default function ClientDashboard() {
  const {
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
    completeOrder
  } = useContext(CraftShieldContext);

  const [activeTab, setActiveTab] = useState('marketplace'); // marketplace, requests, orders, payments
  
  // Custom Request Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
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

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null); // { orderId, type: 'advance' | 'final', amount }
  const [txRef, setTxRef] = useState('');

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
      toast.success('Order completed! Escrow funds released.');
    } catch (err) {
      toast.error(err.message || 'Failed to complete order');
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
          <h2 className="headline-lg">Client Portal</h2>
          <p className="body-md text-muted">Purchase certified products or request tailored custom designs from verified artisans.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsRequestModalOpen(true)}>
          <Send size={16} /> Custom Request
        </button>
      </div>

      {clientStats && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="label-sm">Active Escrows</span>
            <h3 className="display-lg">{activeOrdersCount}</h3>
          </div>
          <div className="stat-card">
            <span className="label-sm">Pending Quotations</span>
            <h3 className="display-lg">{pendingQuotesCount}</h3>
          </div>
          <div className="stat-card">
            <span className="label-sm">Total Spent (Escrow Released)</span>
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
          <ShoppingBag size={18} /> Marketplace Catalog
        </button>
        <button 
          className={`tab-link ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <FileText size={18} /> Custom Requests
          {pendingQuotesCount > 0 && <span className="tab-badge gold">{pendingQuotesCount}</span>}
        </button>
        <button 
          className={`tab-link ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={18} /> Escrow Orders
          {activeOrdersCount > 0 && <span className="tab-badge teal">{activeOrdersCount}</span>}
        </button>
        <button 
          className={`tab-link ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard size={18} /> Escrow Ledger
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
                <h3 className="headline-md">In-Stock Premium Designs</h3>
                {marketplaceProducts.length === 0 ? (
                  <div className="empty-state">No products found in store.</div>
                ) : (
                  <div className="products-grid">
                    {marketplaceProducts.map(product => (
                      <div key={product.id} className="card product-card">
                        <div className="product-image-wrapper">
                          <img src={product.image_url} alt={product.name} className="product-image" />
                          <div className="product-category-badge label-sm">{product.category}</div>
                        </div>
                        <div className="card-content">
                          <h4 className="headline-sm">{product.name}</h4>
                          <p className="body-sm text-muted line-clamp">{product.description}</p>
                          <div className="product-specifications">
                            <span className="spec-label">Material: <strong>{product.material}</strong></span>
                            <span className="spec-label">Delivery: <strong>{product.estimated_delivery_days} days</strong></span>
                          </div>
                          <div className="product-card-footer border-t pt-4 mt-4">
                            <span className="display-sm font-bold text-secondary">{formatCurrency(product.price)}</span>
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
                              Request Custom Mock
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verified Artisans list */}
              <div className="grid-section mt-8">
                <h3 className="headline-md">Verified Master Artisans</h3>
                {verifiedArtisans.length === 0 ? (
                  <div className="empty-state">No verified artisans available.</div>
                ) : (
                  <div className="artisans-list">
                    {verifiedArtisans.map(artisan => (
                      <div key={artisan.artisan_id} className="card artisan-card">
                        <div className="artisan-header">
                          <div className="artisan-info">
                            <h4 className="headline-sm">{artisan.business_name}</h4>
                            <span className="label-sm text-secondary">{artisan.jewellery_specialization}</span>
                          </div>
                          <span className="badge badge-green">Verified</span>
                        </div>
                        <p className="body-md text-muted mt-2">{artisan.profile_description}</p>
                        <div className="artisan-meta border-t pt-4 mt-4">
                          <span className="body-sm">Location: <strong>{artisan.location}</strong></span>
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
                            Hire Artisan
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
              <h3 className="headline-md mb-4">Active Production Escrow</h3>
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
                                ⚠️ <strong>Advance Payment Required:</strong> Artisan will not start designs or source gems until deposit is secured in escrow.
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
                                ✔️ Final balance paid and held in escrow. Artisan is delivering physical shipment.
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
                          </div>

                          <div className="drawer-buttons">
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
              <h3 className="headline-md mb-4">Escrow Ledger Transactions</h3>
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
                            <span className={`badge ${pay.payment_type === 'advance' ? 'badge-gold' : 'badge-teal'}`}>
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

          <div className="modal-actions border-t pt-4">
            <button type="button" className="btn btn-secondary" onClick={() => setIsRequestModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Submit Design request</button>
          </div>
        </form>
      </Modal>

      {/* Mock Payment Settlement Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Escrow Payment Gateway (Mock)">
        {paymentTarget && (
          <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div className="payment-summary">
              <p className="body-md">Settle <strong>{paymentTarget.type} payment</strong> for order <strong>{paymentTarget.orderId}</strong></p>
              <div className="payment-amount-box text-center bg-gray-100 p-4 rounded-lg my-2">
                <span className="label-sm text-muted">Escrow Amount</span>
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
