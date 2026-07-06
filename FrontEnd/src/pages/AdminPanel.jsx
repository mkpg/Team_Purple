import React, { useContext, useState } from 'react';
import { Users, IndianRupee, Activity, Check, X, Shield, ShoppingBag, CreditCard, Clipboard, Download, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CraftShieldContext } from '../context/CraftShieldContext';
import { MarketplaceProductCard } from './ClientDashboard';
import './ClientDashboard.css';
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
    adjustUserScore,
    fetchUserScoreHistory,
    lookupAdminProof,
    deleteProduct,
    refreshData
  } = useContext(CraftShieldContext);

  const [activeTab, setActiveTab] = useState('verifications'); // verifications, users, catalog, ledgers, scores
  const [scoreTargetUser, setScoreTargetUser] = useState('');
  const [scoreProfileType, setScoreProfileType] = useState('trust');
  const [scoreDelta, setScoreDelta] = useState('');
  const [scoreNote, setScoreNote] = useState('Manual admin adjustment');
  const [selectedHistoryUser, setSelectedHistoryUser] = useState('');
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [proofLookup, setProofLookup] = useState('');
  const [proofResult, setProofResult] = useState(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid or table

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product? This action is permanent.")) return;
    try {
      await deleteProduct(productId);
      toast.success("Product deleted successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to delete product");
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

  const handleProofLookup = async (e) => {
    e.preventDefault();
    if (!proofLookup.trim()) return;
    setProofLoading(true);
    try {
      const result = await lookupAdminProof(proofLookup.trim());
      setProofResult(result);
      if (!result.found) {
        toast.error('No proof found for that ID');
      }
    } catch (err) {
      toast.error(err.message || 'Proof lookup failed');
    } finally {
      setProofLoading(false);
    }
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
      label: 'Awaiting Review', 
      value: adminStats ? (adminStats.pending_verifications).toString() : '0', 
      icon: Shield, 
      color: 'text-gold' 
    },
    { 
      label: 'Escrow Orders', 
      value: adminStats ? (adminStats.total_orders).toString() : '0', 
      icon: Clipboard, 
      color: 'text-tertiary' 
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
        <button 
          className={`tab-link ${activeTab === 'scores' ? 'active' : ''}`}
          onClick={() => setActiveTab('scores')}
        >
          <Scale size={18} /> Trust & Reliability Scores
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
                        <th>Phone Number</th>
                        <th>System Role</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map(u => (
                        <tr key={u.id || u._id}>
                          <td><span className="font-mono text-muted">{u.id || u._id}</span></td>
                          <td><strong>{u.full_name}</strong></td>
                          <td>{u.username}</td>
                          <td>{u.email}</td>
                          <td>{u.phone_number}</td>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="card mt-6" style={{ padding: '20px' }}>
                <h4 className="headline-sm mb-3">Manual Score Adjustment</h4>
                <div className="input-grid">
                  <div className="input-group">
                    <label className="input-label">Select user</label>
                    <select className="input-field" value={scoreTargetUser} onChange={(e) => setScoreTargetUser(e.target.value)}>
                      <option value="">Choose a user</option>
                      {adminUsers.map(u => (
                        <option key={u.id || u._id} value={u.id || u._id}>{u.full_name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Score type</label>
                    <select className="input-field" value={scoreProfileType} onChange={(e) => setScoreProfileType(e.target.value)}>
                      <option value="trust">Client trust</option>
                      <option value="reliability">Artisan reliability</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Delta</label>
                    <input className="input-field" type="number" step="0.1" value={scoreDelta} onChange={(e) => setScoreDelta(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Note</label>
                    <input className="input-field" value={scoreNote} onChange={(e) => setScoreNote(e.target.value)} />
                  </div>
                </div>
                <button
                  className="btn btn-primary mt-4"
                  onClick={async () => {
                    if (!scoreTargetUser || !scoreDelta) return toast.error('Choose a user and delta first');
                    try {
                      await adjustUserScore(scoreTargetUser, { profile_type: scoreProfileType, delta: parseFloat(scoreDelta), note: scoreNote });
                      toast.success('Score adjusted');
                    } catch (err) {
                      toast.error(err.message || 'Adjustment failed');
                    }
                  }}
                >
                  Apply Adjustment
                </button>

                <div className="mt-6">
                  <h4 className="headline-sm mb-3">View Score History</h4>
                  <div className="input-grid">
                    <div className="input-group">
                      <label className="input-label">User</label>
                      <select className="input-field" value={selectedHistoryUser} onChange={(e) => setSelectedHistoryUser(e.target.value)}>
                        <option value="">Choose a user</option>
                        {adminUsers.map(u => (
                          <option key={`history-${u.id || u._id}`} value={u.id || u._id}>{u.full_name} ({u.role})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary mt-3"
                    onClick={async () => {
                      if (!selectedHistoryUser) return toast.error('Choose a user first');
                      try {
                        const res = await fetchUserScoreHistory(selectedHistoryUser);
                        setSelectedHistory(res);
                      } catch (err) {
                        toast.error(err.message || 'Could not load score history');
                      }
                    }}
                  >
                    Load History
                  </button>
                  {selectedHistory && (
                    <div className="card mt-4" style={{ padding: '16px', background: '#faf8f5' }}>
                      <div className="quote-header">
                        <strong>{selectedHistory.profile_type === 'trust' ? 'Client Trust' : 'Artisan Reliability'}</strong>
                        <span className="badge badge-gold">{selectedHistory.badge}</span>
                      </div>
                      <p className="body-sm text-muted mt-2">{selectedHistory.path_to_improvement}</p>
                      <div className="quotations-list mt-3">
                        {(selectedHistory.score_history || []).slice(0, 5).map((entry, idx) => (
                          <div key={`${entry.event_type}-${idx}`} className="card" style={{ padding: '12px' }}>
                            <div className="quote-header">
                              <strong>{entry.event_type}</strong>
                              <span className={entry.delta < 0 ? 'text-red' : 'text-green'}>{entry.delta > 0 ? `+${entry.delta}` : entry.delta}</span>
                            </div>
                            <p className="body-sm text-muted mt-1">{entry.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 className="headline-md">Global Jewellery Catalog Audit</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('grid')}
                    style={{ padding: '8px 16px', fontSize: '14px', height: 'fit-content' }}
                  >
                    Visual Grid
                  </button>
                  <button 
                    className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('table')}
                    style={{ padding: '8px 16px', fontSize: '14px', height: 'fit-content' }}
                  >
                    Audit Table
                  </button>
                </div>
              </div>

              {adminProducts.length === 0 ? (
                <div className="empty-state">No products registered in system database.</div>
              ) : viewMode === 'grid' ? (
                <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                  {adminProducts.map(product => (
                    <MarketplaceProductCard 
                      key={product.id || product._id}
                      product={product}
                      formatCurrency={formatCurrency}
                      setRequestForm={() => {}}
                      setIsRequestModalOpen={() => {}}
                      onDeleteSuccess={refreshData}
                    />
                  ))}
                </div>
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
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminProducts.map(p => (
                        <tr key={p.id || p._id}>
                          <td><span className="font-mono text-muted">{p.id || p._id}</span></td>
                          <td><strong>{p.name}</strong></td>
                          <td>{p.category}</td>
                          <td>{p.material}</td>
                          <td><strong>{formatCurrency(p.price)}</strong></td>
                          <td><span className="font-mono text-muted">{p.artisan_id}</span></td>
                          <td>
                            <span className={`badge ${p.is_active ? 'badge-green' : 'badge-gold'}`}>
                              {p.is_active ? 'Visible' : 'Hidden'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-logout btn-sm"
                              style={{ padding: '4px 8px', color: '#ba1a1a', border: '1px solid rgba(186, 26, 26, 0.2)', fontSize: '12px', cursor: 'pointer' }}
                              onClick={() => handleDeleteProduct(p.id || p._id)}
                            >
                              Delete
                            </button>
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
                <div className="panel-list-section">
                  <h3 className="headline-md">Verified Transaction Receipt Lookup</h3>
                  <form onSubmit={handleProofLookup} className="auth-form" style={{ marginBottom: '16px' }}>
                    <div className="input-group">
                      <label className="input-label">Proof ID or Order ID</label>
                      <input
                        className="input-field"
                        value={proofLookup}
                        onChange={(e) => setProofLookup(e.target.value)}
                        placeholder="Paste proof_id or order_id"
                      />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={proofLoading}>
                      {proofLoading ? 'Checking...' : 'Verify Receipt'}
                    </button>
                  </form>
                  {proofResult && (
                    <div className="card" style={{ padding: '16px', background: proofResult.valid ? '#f0fdf8' : '#fff5f5' }}>
                      <div className="quote-header">
                        <div>
                          <h4 className="headline-sm">{proofResult.valid ? 'Verified Transaction' : 'Could Not Verify This Proof'}</h4>
                          <span className="label-sm text-muted">Server-side HMAC signature check</span>
                        </div>
                        <span className={`badge ${proofResult.valid ? 'badge-green' : 'badge-red'}`}>{proofResult.valid ? 'valid' : 'invalid'}</span>
                      </div>
                      {proofResult.proof && (
                        <div className="request-spec-grid mt-4">
                          <div>Proof ID: <strong>{proofResult.proof.proof_id}</strong></div>
                          <div>Order ID: <strong>{proofResult.proof.order_id}</strong></div>
                          <div>Jewel Type: <strong>{proofResult.proof.jewel_type}</strong></div>
                          <div>Amount: <strong>{formatCurrency(proofResult.proof.amount)}</strong></div>
                        </div>
                      )}
                      {proofResult.qr_image && (
                        <img src={proofResult.qr_image} alt="Proof QR" style={{ width: '112px', height: '112px', marginTop: '12px', border: '1px solid var(--color-outline)', borderRadius: '8px' }} />
                      )}
                    </div>
                  )}
                </div>

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

          {activeTab === 'scores' && (
            <motion.div
              key="scores"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="scores-panel"
            >
              <div className="card" style={{ padding: '20px' }}>
                <h3 className="headline-md mb-2">Score Governance</h3>
                <p className="body-md text-muted">Manual trust and reliability adjustments are logged here. Use these controls for dispute resolution, late-delivery remedies, or exceptional recovery cases.</p>
                <div className="mt-4" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span className="badge badge-green">Client trust histories available</span>
                  <span className="badge badge-teal">Artisan reliability histories available</span>
                  <span className="badge badge-gold">Admin adjustments are recorded</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
