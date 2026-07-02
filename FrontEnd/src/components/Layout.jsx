import { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut, Gem, Shield, Hammer, User } from 'lucide-react';
import { CraftShieldContext } from '../context/CraftShieldContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useContext(CraftShieldContext);

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
          <h1 className="headline-md">CraftShield</h1>
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
              {user?.role === 'client' && 'Client Portal'}
              {user?.role === 'artisan' && 'Artisan Studio'}
              {user?.role === 'admin' && 'Admin Control'}
            </span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={logout}>
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-welcome">
            <span className="body-md text-muted">
              Secure jewellery escrow protocol active
            </span>
          </div>
          <div className="user-profile">
            <span className="label-md font-semibold text-muted">
              {user?.username} ({user?.email})
            </span>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
