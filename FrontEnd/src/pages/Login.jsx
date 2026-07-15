import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Gem, LogIn, UserPlus } from 'lucide-react';
import { CraftShieldContext } from '../context/CraftShieldContext';
import DigiLockerSandbox from '../components/DigiLockerSandbox';
import './Login.css';

export default function Login() {
  const { login, registerClient, registerArtisan } = useContext(CraftShieldContext);
  const [isRegister, setIsRegister] = useState(false);
  
  const [loginRole, setLoginRole] = useState('client'); // client, artisan, admin
  const [loginCreds, setLoginCreds] = useState({ username: '', password: '' });
  
  // KYC Modal State
  const [showKYC, setShowKYC] = useState(false);
  
  // Register Form State
  const [registerRole, setRegisterRole] = useState('client'); // client, artisan
  const [registerData, setRegisterData] = useState({
    full_name: '',
    username: '',
    email: '',
    phone_number: '',
    password: '',
    business_name: '',
    jewellery_specialization: '',
    location: '',
    profile_description: ''
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginCreds.username || !loginCreds.password) {
      toast.error('Please enter username/email and password');
      return;
    }

    try {
      await login(loginCreds.username, loginCreds.password, loginRole);
      toast.success(`Welcome back to CraftShield!`);
    } catch (err) {
      toast.error(err.message || 'Login failed. Please check credentials.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const { full_name, username, email, phone_number, password } = registerData;

    if (!full_name || !username || !email || !phone_number || !password) {
      toast.error('Please fill in all standard fields');
      return;
    }

    try {
      if (registerRole === 'client') {
        await registerClient({
          full_name,
          username,
          email,
          phone_number,
          password,
          role: 'client'
        });
        toast.success('Registration successful! You can now log in.');
        setIsRegister(false);
        setLoginRole('client');
        setLoginCreds({ username, password });
      } else {
        const { business_name, jewellery_specialization, location, profile_description } = registerData;
        if (!business_name || !jewellery_specialization || !location || !profile_description) {
          toast.error('Please fill in all artisan business fields');
          return;
        }

        // Trigger KYC Sandbox first instead of registering immediately
        setShowKYC(true);
      }
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    }
  };

  const handleKYCComplete = async () => {
    setShowKYC(false);
    const { full_name, username, email, phone_number, password, business_name, jewellery_specialization, location, profile_description } = registerData;
    
    try {
      await registerArtisan({
        full_name,
        username,
        email,
        phone_number,
        password,
        role: 'artisan',
        business_name,
        jewellery_specialization,
        location,
        profile_description
      });
      
      toast.success('Artisan registration submitted! Access is pending administrator verification.');
      setIsRegister(false);
      setLoginRole('artisan');
      setLoginCreds({ username, password });
    } catch (err) {
      toast.error(err.message || 'Registration failed after KYC');
    }
  };

  const setDemoLogin = (username, password, role) => {
    setLoginRole(role);
    setLoginCreds({ username, password });
    toast.success(`Demo credentials loaded for ${role}: ${username}`);
  };

  return (
    <div className="login-page">
      {/* KYC Modal */}
      {showKYC && (
        <DigiLockerSandbox 
          onComplete={handleKYCComplete} 
          onCancel={() => setShowKYC(false)} 
        />
      )}

      <div className="login-backdrop"></div>
      <motion.div 
        className="login-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="login-logo">
          <Gem className="logo-icon animate-pulse" size={48} />
          <h2>CraftShield</h2>
          <p>Jewellery Marketplace & Protected Ledger</p>
        </div>

        <div className="auth-tab-switchers">
          <button 
            className={`tab-btn ${!isRegister ? 'active' : ''}`}
            onClick={() => setIsRegister(false)}
          >
            <LogIn size={16} /> Login
          </button>
          <button 
            className={`tab-btn ${isRegister ? 'active' : ''}`}
            onClick={() => setIsRegister(true)}
          >
            <UserPlus size={16} /> Register
          </button>
        </div>

        {!isRegister ? (
          <form onSubmit={handleLoginSubmit} className="auth-form">
            <div className="role-selector">
              <label className="input-label">I want to login as:</label>
              <div className="role-btns">
                <button 
                  type="button" 
                  className={`role-btn ${loginRole === 'client' ? 'active' : ''}`}
                  onClick={() => setLoginRole('client')}
                >
                  Client
                </button>
                <button 
                  type="button" 
                  className={`role-btn ${loginRole === 'artisan' ? 'active' : ''}`}
                  onClick={() => setLoginRole('artisan')}
                >
                  Artisan
                </button>
                <button 
                  type="button" 
                  className={`role-btn ${loginRole === 'admin' ? 'active' : ''}`}
                  onClick={() => setLoginRole('admin')}
                >
                  Admin
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Username or Email</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Enter username or email"
                value={loginCreds.username}
                onChange={(e) => setLoginCreds({ ...loginCreds, username: e.target.value })}
                required 
              />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••"
                value={loginCreds.password}
                onChange={(e) => setLoginCreds({ ...loginCreds, password: e.target.value })}
                required 
              />
            </div>

            <button type="submit" className="btn btn-primary w-full mt-4">
              Access Portal
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="auth-form scrollable-form">
            <div className="role-selector">
              <label className="input-label">Registering as:</label>
              <div className="role-btns">
                <button 
                  type="button" 
                  className={`role-btn ${registerRole === 'client' ? 'active' : ''}`}
                  onClick={() => setRegisterRole('client')}
                >
                  Client
                </button>
                <button 
                  type="button" 
                  className={`role-btn ${registerRole === 'artisan' ? 'active' : ''}`}
                  onClick={() => setRegisterRole('artisan')}
                >
                  Artisan
                </button>
              </div>
            </div>

            <div className="input-grid">
              <div className="input-group">
                <label className="input-label">Full Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Eleanor Vance"
                  value={registerData.full_name}
                  onChange={(e) => setRegisterData({ ...registerData, full_name: e.target.value })}
                  required 
                />
              </div>

              <div className="input-group">
                <label className="input-label">Username</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="eleanor_vance"
                  value={registerData.username}
                  onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                  required 
                />
              </div>
            </div>

            <div className="input-grid">
              <div className="input-group">
                <label className="input-label">Email</label>
                <input 
                  type="email" 
                  className="input-field" 
                  placeholder="eleanor@vance.com"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  required 
                />
              </div>

              <div className="input-group">
                <label className="input-label">Phone Number</label>
                <input 
                  type="tel" 
                  className="input-field" 
                  placeholder="+15550199"
                  value={registerData.phone_number}
                  onChange={(e) => setRegisterData({ ...registerData, phone_number: e.target.value })}
                  required 
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <input 
                type="password" 
                className="input-field" 
                placeholder="•••••••• (min 4 chars)"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                required 
              />
            </div>

            {registerRole === 'artisan' && (
              <div className="artisan-fields-section">
                <h4 className="headline-sm border-t pt-4 text-secondary">Artisan Business Details</h4>
                
                <div className="input-grid">
                  <div className="input-group">
                    <label className="input-label">Business Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Vance Diamond House"
                      value={registerData.business_name}
                      onChange={(e) => setRegisterData({ ...registerData, business_name: e.target.value })}
                      required={registerRole === 'artisan'}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">Location (City, Country)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Milan, Italy"
                      value={registerData.location}
                      onChange={(e) => setRegisterData({ ...registerData, location: e.target.value })}
                      required={registerRole === 'artisan'}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Jewellery Specialization</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Platinum Casting, Gem Setting"
                    value={registerData.jewellery_specialization}
                    onChange={(e) => setRegisterData({ ...registerData, jewellery_specialization: e.target.value })}
                    required={registerRole === 'artisan'}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Profile Description</label>
                  <textarea 
                    className="input-field text-area-field" 
                    placeholder="Describe your design craft, history, and workshop capabilities (min 10 chars)..."
                    value={registerData.profile_description}
                    onChange={(e) => setRegisterData({ ...registerData, profile_description: e.target.value })}
                    required={registerRole === 'artisan'}
                  />
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full mt-4">
              Sign Up
            </button>
          </form>
        )}

        <div className="demo-credentials">
          <p className="demo-title label-sm">Quick Demo Credentials</p>
          <div className="demo-grid">
            <button 
              type="button" 
              className="demo-btn"
              onClick={() => setDemoLogin('admin', '1234', 'admin')}
            >
              Admin Portal
            </button>
            <button 
              type="button" 
              className="demo-btn"
              onClick={() => setDemoLogin('aurelia_gold', 'password123', 'artisan')}
            >
              Artisan (Aurelia)
            </button>
            <button 
              type="button" 
              className="demo-btn"
              onClick={() => setDemoLogin('tanaka_metals', 'password123', 'artisan')}
            >
              Artisan (Hiroshi)
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
