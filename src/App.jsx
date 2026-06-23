import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, message } from 'antd'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Alerts from './pages/Alerts'
import MLModels from './pages/MLModels'
import Rules from './pages/Rules'
import Merchants from './pages/Merchants'
import Analytics from './pages/Analytics'
import Admin from './pages/Admin'
import ReviewQueue from './pages/ReviewQueue'
import Login from './pages/Login'
import Shop from './pages/Shop'
import './App.css'

// Ant Design dark theme configuration
const theme = {
  algorithm: undefined, // we use CSS vars + dark overrides
  token: {
    colorPrimary: '#4f6ef7',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#4f6ef7',
    colorTextBase: '#f0f2f8',
    colorBgBase: '#1e2336',
    colorBorder: 'rgba(255,255,255,0.07)',
    colorBorderSecondary: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  components: {
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(79,110,247,0.15)',
      darkItemColor: '#8892b0',
      darkItemSelectedColor: '#7b93fa',
    },
    Table: {
      colorBgContainer: 'transparent',
      headerBg: '#252b3b',
      rowHoverBg: '#252b3b',
    },
  },
}

const ProtectedRoute = ({ children, allowedRoles }) => {
  const currentUserString = localStorage.getItem('currentUser')
  const authToken = localStorage.getItem('auth_token')
  
  if (!currentUserString || !authToken) {
    return <Navigate to="/login" replace />
  }

  const currentUser = JSON.parse(currentUserString)
  
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    message.error("You don't have permission to access this page")
    
    // Redirect based on role home base
    if (currentUser.role === 'customer') {
      return <Navigate to="/shop" replace />
    } else if (currentUser.role === 'merchant') {
      return <Navigate to="/transactions" replace />
    } else if (currentUser.role === 'analyst') {
      return <Navigate to="/alerts" replace />
    } else {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <Layout>{children}</Layout>
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = localStorage.getItem('currentUser')
    const authToken = localStorage.getItem('auth_token')
    
    if (currentUser && authToken) {
      setIsAuthenticated(true)
    }
    
    setLoading(false)
  }, [])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>
  }

  return (
    <ConfigProvider theme={theme}>
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login setIsAuthenticated={setIsAuthenticated} />} 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'analyst', 'manager']}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/shop" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'analyst', 'manager', 'customer', 'merchant']}>
                <Shop />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/transactions"  
            element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'customer', 'merchant']}>
                <Transactions />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/alerts" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'analyst', 'manager']}>
                <Alerts />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ml-models" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'analyst']}>
                <MLModels />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/rules" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Rules />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/merchants" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'analyst', 'manager', 'merchant']}>
                <Merchants />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'analyst', 'manager']}>
                <Analytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/review-queue" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'analyst']}>
                <ReviewQueue />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </Router>
    </ConfigProvider>
  )
}

export default App
