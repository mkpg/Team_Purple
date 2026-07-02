import { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut, Gem, Shield, Hammer, User } from 'lucide-react';
import { CraftShieldContext } from '../context/CraftShieldContext';
import './Layout.css';

export default function Layout() {
  const { user, logout, language, setLanguage, t } = useContext(CraftShieldContext);

  const getRoleIcon = () => {
    if (!user) return <User size={20} />;
    if (user.role === 'admin') return <Shield size={20} className="text-secondary" />;
    if (user.role === 'artisan') return <Hammer size={20} className="text-tertiary" />;
    return <User size={20} className="text-green" />;
  };

  const getAvatarLetter = () => {
    if (!user || !user.full_name) return 'U';
    return user.full_name.charAt(0).toUpperCase();
  };

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="logo-container">
          <Gem className="logo-icon" size={32} />
          <h1 className="headline-md">{t('appName')}</h1>
        </div>
        
        <div className="sidebar-profile-card">
          <div className="avatar">{getAvatarLetter()}</div>
          <div className="profile-info">
            <h4 className="body-md font-bold text-white truncate max-w-xs">{user?.full_name}</h4>
            <div className="role-badge-row">
              <span className="label-sm text-secondary uppercase">{user?.role}</span>
              {user?.role === 'artisan' && (
                <span className={`micro-badge badge-${user?.verification_status === 'verified' ? 'green' : user?.verification_status === 'rejected' ? 'red' : 'gold'}`}>
                  {user?.verification_status || 'pending'}
                </span>
              )}
            </div>
          </div>
        </div>

        <nav className="nav-menu">
          <div className="nav-item active">
            {getRoleIcon()}
            <span className="label-md">
              {user?.role === 'client' && t('clientPortal')}
              {user?.role === 'artisan' && t('artisanStudio')}
              {user?.role === 'admin' && t('adminPanel')}
            </span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={logout}>
            <LogOut size={18} />
            <span>{language === 'ta' ? 'வெளியேறு' : language === 'te' ? 'లాగ్ అవుట్' : language === 'kn' ? 'ಲಾಗ್ ಔಟ್' : language === 'ml' ? 'ലോഗ് ഔട്ട്' : 'Log Out'}</span>
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-welcome">
            <span className="body-md text-muted">
              {t('securePaymentActive')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input-field"
              style={{
                width: 'auto',
                padding: '4px 8px',
                height: '32px',
                fontSize: '13px',
                background: 'rgba(255, 255, 255, 0.8)',
                color: '#1c1c19',
                borderRadius: '6px',
                border: '1px solid var(--color-outline-variant)'
              }}
            >
              <option value="en">English</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="te">తెలుగు (Telugu)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="ml">മലയാളം (Malayalam)</option>
            </select>
            <div className="user-profile">
              <span className="label-md font-semibold text-muted">
                {user?.username} ({user?.email})
              </span>
            </div>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
