import React, { useContext, useState } from 'react';
import { CraftShieldContext } from '../context/CraftShieldContext';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Calendar, 
  Award, 
  Flame, 
  Activity, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  CreditCard, 
  AlertTriangle 
} from 'lucide-react';
import './Profile.css';

export default function Profile() {
  const { user, language } = useContext(CraftShieldContext);
  const [activeTab, setActiveTab] = useState('details');

  if (!user) return null;

  // Formatting date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Get Artisan badge details
  const getArtisanBadgeColor = (score) => {
    if (score >= 90.0) return 'text-teal bg-teal-light';
    if (score >= 70.0) return 'text-green bg-green-light';
    if (score >= 50.0) return 'text-gold bg-gold-light';
    return 'text-red bg-red-light';
  };

  const getArtisanBadgeText = (score) => {
    if (score >= 90.0) return 'Reliable';
    if (score >= 70.0) return 'Usually On Time';
    if (score >= 50.0) return 'New / Building History';
    return 'Frequently Delayed';
  };

  // Get Client badge details
  const getClientBadgeColor = (score) => {
    if (score >= 90.0) return 'text-teal bg-teal-light';
    if (score >= 70.0) return 'text-green bg-green-light';
    if (score >= 50.0) return 'text-gold bg-gold-light';
    return 'text-red bg-red-light';
  };

  const getClientBadgeText = (score) => {
    if (score >= 90.0) return 'Highly Trustworthy';
    if (score >= 70.0) return 'Good Standing';
    if (score >= 50.0) return 'New / Building History';
    return 'Caution';
  };

  // Extract score logs and details based on role
  const isArtisan = user.role === 'artisan';
  const isClient = user.role === 'client';
  const isAdmin = user.role === 'admin';

  // Artisan stats
  const artisanScore = isArtisan ? (user.reliability_profile?.reliability_score ?? 100.0) : 100.0;
  const artisanStreak = isArtisan ? (user.reliability_profile?.consecutive_ontime_orders ?? 0) : 0;
  const artisanHistory = isArtisan ? (user.reliability_profile?.score_history ?? []) : [];
  const artisanPath = isArtisan ? (user.reliability_path_to_improvement || 'Complete more on-time orders to improve this score.') : '';
  const artisanBadge = isArtisan ? (user.reliability_badge || getArtisanBadgeText(artisanScore)) : '';

  // Client stats
  const clientScore = isClient ? (user.trust_profile?.trust_score ?? 100.0) : 100.0;
  const clientLatePayments = isClient ? (user.trust_profile?.late_payments ?? 0) : 0;
  const clientCancelledOrders = isClient ? (user.trust_profile?.cancelled_orders ?? 0) : 0;
  const clientCompletedPayments = isClient ? (user.trust_profile?.completed_payments ?? 0) : 0;
  const clientHistory = isClient ? (user.trust_profile?.score_history ?? []) : [];
  const clientPath = isClient ? (user.trust_path_to_improvement || 'Complete more on-time orders to improve your standing.') : '';
  const clientBadge = isClient ? (user.trust_badge || getClientBadgeText(clientScore)) : '';

  return (
    <div className="profile-container">
      {/* Header section with profile overview */}
      <div className="profile-header-card">
        <div className="profile-header-bg"></div>
        <div className="profile-header-content">
          <div className="profile-avatar-large">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="profile-title-info">
            <h1 className="headline-lg text-white">{user.full_name}</h1>
            <div className="profile-badge-row">
              <span className="profile-role-badge">{user.role}</span>
              <span className="profile-status-badge">Active Account</span>
              {isArtisan && (
                <span className="profile-status-badge">{artisanBadge}</span>
              )}
              {isClient && (
                <span className="profile-status-badge">{clientBadge}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="profile-tabs-bar">
        <button 
          className={`profile-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          <User size={16} />
          <span>Personal Details</span>
        </button>
        {!isAdmin && (
          <button 
            className={`profile-tab-btn ${activeTab === 'scoring' ? 'active' : ''}`}
            onClick={() => setActiveTab('scoring')}
          >
            <Award size={16} />
            <span>{isArtisan ? 'Reliability Rating' : 'Trust Score System'}</span>
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div className="profile-tab-content-wrapper">
        {activeTab === 'details' && (
          <div className="profile-details-grid">
            {/* Account Info Card */}
            <div className="glass-card profile-info-card">
              <h2 className="headline-sm border-b pb-3 mb-4">Account Information</h2>
              <div className="info-row-item">
                <User className="info-icon" size={20} />
                <div className="info-content-text">
                  <span className="label-sm text-muted">Full Name</span>
                  <p className="body-md font-semibold">{user.full_name}</p>
                </div>
              </div>

              <div className="info-row-item">
                <User className="info-icon" size={20} />
                <div className="info-content-text">
                  <span className="label-sm text-muted">Username</span>
                  <p className="body-md font-semibold">@{user.username}</p>
                </div>
              </div>

              <div className="info-row-item">
                <Mail className="info-icon" size={20} />
                <div className="info-content-text">
                  <span className="label-sm text-muted">Email Address</span>
                  <p className="body-md font-semibold">{user.email}</p>
                </div>
              </div>

              <div className="info-row-item">
                <Phone className="info-icon" size={20} />
                <div className="info-content-text">
                  <span className="label-sm text-muted">Phone Number</span>
                  <p className="body-md font-semibold">{user.phone_number || 'Not Provided'}</p>
                </div>
              </div>
            </div>

            {/* Additional metadata info card */}
            <div className="glass-card profile-info-card">
              <h2 className="headline-sm border-b pb-3 mb-4">Platform Info</h2>
              <div className="info-row-item">
                <Shield className="info-icon" size={20} />
                <div className="info-content-text">
                  <span className="label-sm text-muted">Security Role</span>
                  <p className="body-md font-semibold uppercase">{user.role}</p>
                </div>
              </div>

              <div className="info-row-item">
                <Calendar className="info-icon" size={20} />
                <div className="info-content-text">
                  <span className="label-sm text-muted">Joined Date</span>
                  <p className="body-md font-semibold">{formatDate(user.created_at)}</p>
                </div>
              </div>

              {isArtisan && user.artisan_profile && (
                <>
                  <div className="info-row-item">
                    <Award className="info-icon" size={20} />
                    <div className="info-content-text">
                      <span className="label-sm text-muted">Jewellery Specialization</span>
                      <p className="body-md font-semibold">{user.artisan_profile.jewellery_specialization || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="info-row-item">
                    <Activity className="info-icon" size={20} />
                    <div className="info-content-text">
                      <span className="label-sm text-muted">Business / Studio Location</span>
                      <p className="body-md font-semibold">{user.artisan_profile.location || 'N/A'}</p>
                    </div>
                  </div>
                </>
              )}

              {isAdmin && (
                <div className="admin-status-box">
                  <Shield size={24} className="text-secondary" />
                  <p className="body-md font-semibold">Authorized Administrator Access</p>
                  <span className="label-xs text-muted">This account has complete access to oversee disputes, resolve product complaints, verify artisans, and audit reliability score overrides.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'scoring' && !isAdmin && (
          <div className="profile-scoring-layout">
            {/* Score Overview and Gauge Card */}
            <div className="profile-score-summary-grid">
              <div className="glass-card score-gauge-card">
                <h3 className="label-md font-semibold text-muted text-center uppercase tracking-wider mb-2">
                  {isArtisan ? 'Artisan Reliability Score' : 'Client Trust Score'}
                </h3>
                <div className="score-ring-container">
                  <svg className="score-ring" viewBox="0 0 120 120">
                    <circle className="score-ring-bg" cx="60" cy="60" r="50" />
                    <circle 
                      className="score-ring-fill" 
                      cx="60" 
                      cy="60" 
                      r="50" 
                      style={{ 
                        strokeDasharray: `${2 * Math.PI * 50}`,
                        strokeDashoffset: `${2 * Math.PI * 50 * (1 - (isArtisan ? artisanScore : clientScore) / 100)}`
                      }} 
                    />
                  </svg>
                  <div className="score-center-text">
                    <span className="score-num">{(isArtisan ? artisanScore : clientScore).toFixed(0)}</span>
                    <span className="score-max">/100</span>
                  </div>
                </div>
                
                <div className="text-center mt-4">
                  <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-bold ${isArtisan ? getArtisanBadgeColor(artisanScore) : getClientBadgeColor(clientScore)}`}>
                    {isArtisan ? artisanBadge : clientBadge}
                  </span>
                </div>
                <p className="body-sm text-muted text-center mt-3">
                  {isArtisan ? artisanPath : clientPath}
                </p>
              </div>

              {/* Point System Statistics */}
              <div className="glass-card statistics-breakdown-card">
                <h3 className="headline-sm border-b pb-3 mb-4">Point System Details</h3>
                
                {isArtisan ? (
                  <div className="stats-breakdown-rows">
                    <div className="stat-detail-item">
                      <Flame size={20} className="text-red" />
                      <div className="stat-detail-content">
                        <span className="label-sm text-muted">Consecutive On-Time Streak</span>
                        <p className="body-lg font-bold">{artisanStreak} Orders</p>
                      </div>
                    </div>
                    <div className="streak-bonus-box">
                      <p className="label-xs text-muted">
                        🎯 **Streak Bonus Rules**: Delivering 3 consecutive custom orders on-time awards a **+15.0 score bonus** (capped at 100.0). Delays will reset the streak.
                      </p>
                    </div>
                    <div className="scoring-rules-list">
                      <h4 className="label-sm font-bold uppercase tracking-wider text-muted">Adjustment Scale</h4>
                      <ul>
                        <li><span className="rule-badge rule-plus">+2.0</span> On-Time Delivery</li>
                        <li><span className="rule-badge rule-minus">-3.0</span> Late completion inside 3-day grace window</li>
                        <li><span className="rule-badge rule-minus">-10.0</span> Significant delay (4-9 days past deadline)</li>
                        <li><span className="rule-badge rule-minus">-20.0</span> Severe delay (10+ days past deadline)</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="stats-breakdown-rows">
                    <div className="client-stats-grid">
                      <div className="client-stat-box">
                        <CheckCircle2 size={24} className="text-teal" />
                        <span className="label-xs text-muted">Payments Made</span>
                        <p className="body-lg font-bold">{clientCompletedPayments}</p>
                      </div>
                      <div className="client-stat-box">
                        <XCircle size={24} className="text-red" />
                        <span className="label-xs text-muted">Cancellations</span>
                        <p className="body-lg font-bold">{clientCancelledOrders}</p>
                      </div>
                      <div className="client-stat-box">
                        <AlertTriangle size={24} className="text-gold" />
                        <span className="label-xs text-muted">Late Payments</span>
                        <p className="body-lg font-bold">{clientLatePayments}</p>
                      </div>
                    </div>

                    <div className="scoring-rules-list mt-4">
                      <h4 className="label-sm font-bold uppercase tracking-wider text-muted">Trust Score Rules</h4>
                      <ul>
                        <li><span className="rule-badge rule-plus">+5.0</span> Successful advance/final payment secured</li>
                        <li><span className="rule-badge rule-plus">+2.0</span> Order successfully completed</li>
                        <li><span className="rule-badge rule-minus">-5.0</span> Booking cancellation within 24 hours</li>
                        <li><span className="rule-badge rule-minus">-10.0</span> Final payment delayed beyond 5 days</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Score adjustment audit log timeline */}
            <div className="glass-card score-history-timeline-card mt-4">
              <h3 className="headline-sm border-b pb-3 mb-4">Scoring System Audit Timeline</h3>
              
              {(isArtisan ? artisanHistory : clientHistory).length === 0 ? (
                <div className="empty-timeline-state">
                  <Clock size={40} className="text-muted mb-2" />
                  <p className="body-md text-muted">No score adjustments logged yet.</p>
                  <span className="label-xs text-muted">Score history events are logged as you complete transactions, payments, or experience project delays.</span>
                </div>
              ) : (
                <div className="timeline-trail">
                  {(isArtisan ? artisanHistory : clientHistory).map((event, idx) => (
                    <div className="timeline-item" key={idx}>
                      <div className="timeline-marker">
                        <div className={`marker-dot ${event.delta >= 0 ? 'dot-plus' : 'dot-minus'}`}></div>
                        <div className="marker-line"></div>
                      </div>
                      <div className="timeline-info-card">
                        <div className="timeline-header-info">
                          <span className={`timeline-delta-badge ${event.delta >= 0 ? 'badge-plus' : 'badge-minus'}`}>
                            {event.delta >= 0 ? `+${event.delta.toFixed(1)}` : `${event.delta.toFixed(1)}`}
                          </span>
                          <span className="timeline-time">{formatDate(event.created_at)}</span>
                        </div>
                        <p className="body-md font-bold uppercase mt-1">{event.event_type.replace(/_/g, ' ')}</p>
                        <p className="body-sm text-muted mt-1">{event.note}</p>
                        {event.delta < 0 && (
                          <div className="mt-2">
                            <span className="label-xs text-secondary">
                              Think this isn&apos;t right? Contact support from the admin panel.
                            </span>
                          </div>
                        )}
                        {event.order_id && (
                          <span className="label-xs text-secondary mt-2 block">
                            Order Reference ID: {event.order_id}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
