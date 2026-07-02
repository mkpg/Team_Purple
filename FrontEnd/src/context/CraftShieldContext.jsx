import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { translations } from '../utils/translations';

export const CraftShieldContext = createContext();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const CraftShieldProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Localization state
  const [language, setLangState] = useState(() => localStorage.getItem('language') || 'en');

  const setLanguage = (lang) => {
    localStorage.setItem('language', lang);
    setLangState(lang);
  };

  const t = useCallback((key) => {
    const langDict = translations[language] || translations['en'];
    return langDict[key] || translations['en'][key] || key;
  }, [language]);

  // Client states
  const [clientStats, setClientStats] = useState(null);
  const [verifiedArtisans, setVerifiedArtisans] = useState([]);
  const [marketplaceProducts, setMarketplaceProducts] = useState([]);
  const [clientRequests, setClientRequests] = useState([]);
  const [clientQuotations, setClientQuotations] = useState([]);
  const [clientOrders, setClientOrders] = useState([]);
  const [clientPayments, setClientPayments] = useState([]);

  // Artisan states
  const [artisanStats, setArtisanStats] = useState(null);
  const [artisanProfile, setArtisanProfile] = useState(null);
  const [artisanProducts, setArtisanProducts] = useState([]);
  const [artisanRequests, setArtisanRequests] = useState([]);
  const [artisanOrders, setArtisanOrders] = useState([]);
  const [artisanPayments, setArtisanPayments] = useState([]);

  // Admin states
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminPendingArtisans, setAdminPendingArtisans] = useState([]);
  const [adminProducts, setAdminProducts] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminPayments, setAdminPayments] = useState([]);
  const [adminDisputes, setAdminDisputes] = useState([]);

  // Base API Fetch Wrapper
  const apiFetch = useCallback(async (path, options = {}) => {
    const url = `${API_BASE_URL}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      let errorMsg = `Request failed with status ${response.status}`;
      if (data && typeof data === 'object') {
        if (typeof data.detail === 'string') {
          errorMsg = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMsg = data.detail.map(err => {
            const field = err.loc ? err.loc.slice(1).join('.') : 'field';
            return `${field}: ${err.msg}`;
          }).join(', ');
        } else if (data.detail && typeof data.detail === 'object') {
          errorMsg = JSON.stringify(data.detail);
        } else if (data.message) {
          errorMsg = data.message;
        }
      }
      throw new Error(errorMsg);
    }

    return data;
  }, []);

  // User Ref container to decouple state updates from refreshData callback
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Fetch current user details
  const fetchMe = useCallback(async () => {
    try {
      setLoading(true);
      const meData = await apiFetch('/api/auth/me');
      setUser(meData);
      return meData;
    } catch (err) {
      console.error("Error fetching current user profile", err);
      // Clean up token if invalid
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  // Load appropriate data based on role
  const refreshData = useCallback(async (currentUser) => {
    const activeUser = currentUser || userRef.current;
    if (!activeUser) return;
    
    try {
      const role = activeUser.role;
      if (role === 'client') {
        const [statsData, artisansData, productsData, requestsData, quotationsData, ordersData, paymentsData] = await Promise.all([
          apiFetch('/api/client/dashboard'),
          apiFetch('/api/client/artisans'),
          apiFetch('/api/client/products'),
          apiFetch('/api/client/custom-requests'),
          apiFetch('/api/client/quotations'),
          apiFetch('/api/client/orders'),
          apiFetch('/api/client/payments')
        ]);
        setClientStats(statsData.stats);
        setVerifiedArtisans(artisansData);
        setMarketplaceProducts(productsData);
        setClientRequests(requestsData);
        setClientQuotations(quotationsData);
        setClientOrders(ordersData);
        setClientPayments(paymentsData);
      } else if (role === 'artisan') {
        const [statsData, profileData, productsData, requestsData, ordersData, paymentsData] = await Promise.all([
          apiFetch('/api/artisan/dashboard'),
          apiFetch('/api/artisan/profile'),
          apiFetch('/api/artisan/products'),
          apiFetch('/api/artisan/custom-requests'),
          apiFetch('/api/artisan/orders'),
          apiFetch('/api/artisan/payments')
        ]);
        setArtisanStats(statsData.stats);
        setArtisanProfile(profileData);
        setArtisanProducts(productsData);
        setArtisanRequests(requestsData);
        setArtisanOrders(ordersData);
        setArtisanPayments(paymentsData);
      } else if (role === 'admin') {
        const [statsData, usersData, pendingArtisansData, productsData, ordersData, paymentsData, disputesData] = await Promise.all([
          apiFetch('/api/admin/dashboard'),
          apiFetch('/api/admin/users'),
          apiFetch('/api/admin/artisans/pending'),
          apiFetch('/api/admin/products'),
          apiFetch('/api/admin/orders'),
          apiFetch('/api/admin/payments'),
          apiFetch('/api/admin/disputes')
        ]);
        setAdminStats(statsData.stats);
        setAdminUsers(usersData);
        setAdminPendingArtisans(pendingArtisansData);
        setAdminProducts(productsData);
        setAdminOrders(ordersData);
        setAdminPayments(paymentsData);
        setAdminDisputes(disputesData);
      }
    } catch (err) {
      console.error("Error refreshing dashboard data", err);
    }
  }, [apiFetch]);

  // Handle auto-load on boot
  useEffect(() => {
    if (token) {
      fetchMe().then((currUser) => {
        if (currUser) {
          refreshData(currUser);
        }
      });
    } else {
      setLoading(false);
    }
  }, [token, fetchMe, refreshData]);

  // Auth Operations
  const login = async (usernameOrEmail, password, role) => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username_or_email: usernameOrEmail,
          password: password,
          role: role
        })
      });

      localStorage.setItem('token', response.access_token);
      setToken(response.access_token);
      
      const userProfile = await apiFetch('/api/auth/me');
      setUser(userProfile);
      await refreshData(userProfile);
      
      return userProfile;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerClient = async (clientData) => {
    return await apiFetch('/api/auth/register/client', {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
  };

  const registerArtisan = async (artisanData) => {
    return await apiFetch('/api/auth/register/artisan', {
      method: 'POST',
      body: JSON.stringify(artisanData)
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    // Reset all states
    setClientStats(null);
    setVerifiedArtisans([]);
    setMarketplaceProducts([]);
    setClientRequests([]);
    setClientQuotations([]);
    setClientOrders([]);
    setClientPayments([]);
    setArtisanStats(null);
    setArtisanProfile(null);
    setArtisanProducts([]);
    setArtisanRequests([]);
    setArtisanOrders([]);
    setArtisanPayments([]);
    setAdminStats(null);
    setAdminUsers([]);
    setAdminPendingArtisans([]);
    setAdminProducts([]);
    setAdminOrders([]);
    setAdminPayments([]);
    setAdminDisputes([]);
  };

  // Client actions
  const createCustomRequest = async (requestPayload) => {
    const res = await apiFetch('/api/client/custom-requests', {
      method: 'POST',
      body: JSON.stringify(requestPayload)
    });
    await refreshData();
    return res;
  };

  const acceptQuotation = async (quotationId) => {
    const res = await apiFetch(`/api/client/quotations/${quotationId}/accept`, {
      method: 'PUT'
    });
    await refreshData();
    return res;
  };

  const rejectQuotation = async (quotationId) => {
    const res = await apiFetch(`/api/client/quotations/${quotationId}/reject`, {
      method: 'PUT'
    });
    await refreshData();
    return res;
  };

  const payAdvance = async (orderId, transactionRef) => {
    const res = await apiFetch(`/api/client/orders/${orderId}/payments/advance`, {
      method: 'POST',
      body: JSON.stringify({ transaction_reference: transactionRef })
    });
    await refreshData();
    return res;
  };

  const payFinal = async (orderId, transactionRef) => {
    const res = await apiFetch(`/api/client/orders/${orderId}/payments/final`, {
      method: 'POST',
      body: JSON.stringify({ transaction_reference: transactionRef })
    });
    await refreshData();
    return res;
  };

  const completeOrder = async (orderId) => {
    const res = await apiFetch(`/api/client/orders/${orderId}/complete`, {
      method: 'PUT'
    });
    await refreshData();
    return res;
  };

  const cancelOrder = async (orderId) => {
    const res = await apiFetch(`/api/client/orders/${orderId}/cancel`, {
      method: 'PUT'
    });
    await refreshData();
    return res;
  };

  // Artisan actions
  const updateArtisanProfile = async (profileData) => {
    const res = await apiFetch('/api/artisan/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    await refreshData();
    return res;
  };

  const createProduct = async (productData) => {
    const res = await apiFetch('/api/artisan/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
    await refreshData();
    return res;
  };

  const updateProduct = async (productId, productData) => {
    const res = await apiFetch(`/api/artisan/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
    await refreshData();
    return res;
  };

  const deleteProduct = async (productId) => {
    const res = await apiFetch(`/api/artisan/products/${productId}`, {
      method: 'DELETE'
    });
    await refreshData();
    return res;
  };

  const uploadImages = async (filesList) => {
    const url = `${API_BASE_URL}/api/upload`;
    const formData = new FormData();
    for (let i = 0; i < filesList.length; i++) {
      formData.append('files', filesList[i]);
    }
    const storedToken = localStorage.getItem('token');
    const headers = {};
    if (storedToken) {
      headers['Authorization'] = `Bearer ${storedToken}`;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(errData.detail || 'Upload failed');
    }
    const data = await response.json();
    return data.urls;
  };

  const acceptCustomRequest = async (requestId) => {
    const res = await apiFetch(`/api/artisan/custom-requests/${requestId}/accept`, {
      method: 'PUT'
    });
    await refreshData();
    return res;
  };

  const rejectCustomRequest = async (requestId) => {
    const res = await apiFetch(`/api/artisan/custom-requests/${requestId}/reject`, {
      method: 'PUT'
    });
    await refreshData();
    return res;
  };

  const createQuotation = async (quotationPayload) => {
    const res = await apiFetch('/api/artisan/quotations', {
      method: 'POST',
      body: JSON.stringify(quotationPayload)
    });
    await refreshData();
    return res;
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const res = await apiFetch(`/api/artisan/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    await refreshData();
    return res;
  };

  // Admin actions
  const verifyArtisan = async (artisanId, verifyStatus) => {
    const res = await apiFetch(`/api/admin/artisans/${artisanId}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ status: verifyStatus })
    });
    await refreshData();
    return res;
  };

  return (
    <CraftShieldContext.Provider value={{
      // Core state
      API_BASE_URL,
      token,
      user,
      loading,
      login,
      registerClient,
      registerArtisan,
      logout,
      refreshData,
      
      // Localization
      language,
      setLanguage,
      t,

      // Client state
      clientStats,
      verifiedArtisans,
      marketplaceProducts,
      clientRequests,
      clientQuotations,
      clientOrders,
      clientPayments,
      
      // Client operations
      createCustomRequest,
      acceptQuotation,
      rejectQuotation,
      payAdvance,
      payFinal,
      completeOrder,
      cancelOrder,

      // Artisan state
      artisanStats,
      artisanProfile,
      artisanProducts,
      artisanRequests,
      artisanOrders,
      artisanPayments,

      // Artisan operations
      updateArtisanProfile,
      createProduct,
      updateProduct,
      deleteProduct,
      acceptCustomRequest,
      rejectCustomRequest,
      createQuotation,
      updateOrderStatus,
      uploadImages,

      // Admin state
      adminStats,
      adminUsers,
      adminPendingArtisans,
      adminProducts,
      adminOrders,
      adminPayments,
      adminDisputes,

      // Admin operations
      verifyArtisan
    }}>
      {children}
    </CraftShieldContext.Provider>
  );
};
