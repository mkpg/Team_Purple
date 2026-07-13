import { useContext, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Gem, Shield, Hammer, User } from 'lucide-react';
import { CraftShieldContext } from '../context/CraftShieldContext';
import './Layout.css';

export default function Layout() {
  const { user, logout, language, setLanguage, t } = useContext(CraftShieldContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Dynamically load/initialize the Google Translate widget on component mount
    const initWidget = () => {
      if (window.google && window.google.translate) {
        try {
          // Clear any stale widget containers inside google_translate_element
          const container = document.getElementById('google_translate_element');
          if (container) {
            container.innerHTML = '';
          }
          new window.google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'en,ta,te,kn,ml',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
          }, 'google_translate_element');
        } catch (e) {
          console.warn('Google Translate initialization failed:', e);
        }
      }
    };

    // If script isn't in document, add it
    if (!document.getElementById('google-translate-widget-script')) {
      window.googleTranslateElementInit = initWidget;
      const script = document.createElement('script');
      script.id = 'google-translate-widget-script';
      script.type = 'text/javascript';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.body.appendChild(script);
    } else {
      // If already loaded, trigger init directly
      initWidget();
    }
  }, []);

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
          <h1 className="headline-md">{t('CraftShield')}</h1>
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
          <button
            type="button"
            className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            {getRoleIcon()}
            <span className="label-md">
              {user?.role === 'client' && t('Client Portal')}
              {user?.role === 'artisan' && t('Artisan Studio')}
              {user?.role === 'admin' && t('Admin Panel')}
            </span>
          </button>
          <button
            className={`nav-item ${location.pathname.endsWith('/profile') ? 'active' : ''}`}
            onClick={() => navigate('profile')}
            type="button"
          >
            <User size={20} />
            <span className="label-md">{t('Profile')}</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={logout}>
            <LogOut size={18} />
            <span>{t('Log Out')}</span>
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-welcome">
            <span className="body-md text-muted">
              {t('Secure Payments Active')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div id="google_translate_element"></div>
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
