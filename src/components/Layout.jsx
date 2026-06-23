import React, { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown, Avatar, Badge, notification, Popover, List, Divider, Space } from 'antd'
import {
  BarChartOutlined,
  SwapOutlined,
  BellOutlined,
  ExperimentOutlined,
  FilterOutlined,
  ShopOutlined,
  LineChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  AlertOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { socket, connectSocket, disconnectSocket } from '../lib/socket'
import './Layout.css'

const { Header, Sider, Content } = Layout

const Layout_Component = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [alertCount, setAlertCount] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const [api, contextHolder] = notification.useNotification()

  const currentUserString = localStorage.getItem('currentUser')
  const currentUser = currentUserString ? JSON.parse(currentUserString) : null
  const userRole = currentUser?.role || 'customer'

  const [popoverOpen, setPopoverOpen] = useState(false)
  const [notificationsList, setNotificationsList] = useState([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`notifications_${currentUser?.email || 'anon'}`)
      if (stored) {
        setNotificationsList(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Error loading notifications:', e)
    }
  }, [currentUser?.email])

  const saveNotifications = (list) => {
    setNotificationsList(list)
    try {
      localStorage.setItem(`notifications_${currentUser?.email || 'anon'}`, JSON.stringify(list))
    } catch (e) {
      console.error('Error saving notifications:', e)
    }
  }

  const unreadCount = notificationsList.filter(n => n.status === 'unread').length

  const handleMarkAsRead = (id) => {
    const updated = notificationsList.map(n => n.id === id ? { ...n, status: 'read' } : n)
    saveNotifications(updated)
  }

  const handleMarkAllAsRead = () => {
    const updated = notificationsList.map(n => ({ ...n, status: 'read' }))
    saveNotifications(updated)
  }

  const handleClearAll = () => {
    saveNotifications([])
  }

  const notificationPopoverContent = (
    <div className="notification-popover-content">
      <div className="notification-popover-title">
        <span style={{ fontSize: 13, fontWeight: 700 }}>Notifications center</span>
        <Space size={12}>
          {unreadCount > 0 && (
            <Button type="link" size="small" onClick={handleMarkAllAsRead} style={{ padding: 0, fontSize: 11, color: '#7b93fa' }}>
              Mark read
            </Button>
          )}
          {notificationsList.length > 0 && (
            <Button type="link" size="small" danger onClick={handleClearAll} style={{ padding: 0, fontSize: 11 }}>
              Clear
            </Button>
          )}
        </Space>
      </div>
      <Divider style={{ margin: '8px 0', background: 'var(--fn-border)' }} />
      {notificationsList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--fn-text-muted)', fontSize: 12 }}>
          No alert notifications yet.
        </div>
      ) : (
        <List
          dataSource={notificationsList}
          size="small"
          renderItem={(item) => {
            const isUnread = item.status === 'unread'
            const severityColor = item.severity === 'critical' ? '#ef4444' : '#f59e0b'
            
            return (
              <div 
                className={`notification-item-container ${isUnread ? 'notification-item-unread' : ''}`}
                onClick={() => {
                  handleMarkAsRead(item.id)
                  setPopoverOpen(false)
                  navigate('/alerts')
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <AlertOutlined style={{ color: severityColor, fontSize: 14, marginTop: 3 }} />
                  <div>
                    <div className="notification-item-desc">
                      {item.description}
                    </div>
                    <div className="notification-item-time">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                {isUnread && <div className="notification-item-unread-dot" />}
              </div>
            )
          }}
          style={{ maxHeight: 280, overflowY: 'auto' }}
        />
      )}
      <Divider style={{ margin: '8px 0', background: 'var(--fn-border)' }} />
      <div style={{ textAlign: 'center', padding: '4px 0 0 0' }}>
        <Button 
          type="link" 
          size="small" 
          onClick={() => {
            setPopoverOpen(false)
            navigate('/alerts')
          }}
          style={{ fontSize: 12, color: '#7b93fa', padding: 0 }}
        >
          View All Alerts
        </Button>
      </div>
    </div>
  )

  const allMenuItems = [
    {
      key: '/shop',
      icon: <ShopOutlined />,
      label: 'Storefront',
      roles: ['customer', 'merchant', 'admin']
    },
    {
      key: '/dashboard',
      icon: <BarChartOutlined />,
      label: 'Dashboard',
      roles: ['admin', 'analyst', 'manager']
    },
    {
      key: '/transactions',
      icon: <SwapOutlined />,
      label: 'Transactions',
      roles: ['admin', 'manager', 'customer', 'merchant']
    },
    {
      key: '/alerts',
      icon: <BellOutlined />,
      label: 'Alerts & Monitoring',
      roles: ['admin', 'analyst', 'manager']
    },
    {
      key: '/review-queue',
      icon: <SafetyCertificateOutlined />,
      label: 'Review Queue',
      roles: ['admin', 'analyst']
    },
    {
      key: '/ml-models',
      icon: <ExperimentOutlined />,
      label: 'ML Models',
      roles: ['admin', 'analyst']
    },
    {
      key: '/rules',
      icon: <FilterOutlined />,
      label: 'Fraud Rules',
      roles: ['admin']
    },
    {
      key: '/merchants',
      icon: <ShopOutlined />,
      label: 'Merchants',
      roles: ['admin', 'analyst', 'manager', 'merchant']
    },
    {
      key: '/analytics',
      icon: <LineChartOutlined />,
      label: 'Analytics',
      roles: ['admin', 'analyst', 'manager']
    },
    {
      key: '/admin',
      icon: <SettingOutlined />,
      label: 'Admin',
      roles: ['admin']
    },
  ]

  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole))

  useEffect(() => {
    connectSocket()

    const handleNewAlert = (alertData) => {
      if (['admin', 'analyst', 'manager'].includes(userRole)) {
        const newNotif = {
          id: alertData.id || String(Math.random()),
          title: '🚨 Fraud Alert',
          description: alertData.description || 'A high-risk transaction was flagged.',
          severity: alertData.severity || 'high',
          status: 'unread',
          created_at: new Date().toISOString()
        }

        setNotificationsList(prev => {
          const updated = [newNotif, ...prev].slice(0, 50)
          try {
            localStorage.setItem(`notifications_${currentUser?.email || 'anon'}`, JSON.stringify(updated))
          } catch (e) {
            console.error('Error saving new notification:', e)
          }
          return updated
        })

        api.error({
          message: (
            <span style={{ color: '#f0f2f8', fontWeight: 700 }}>
              🚨 Fraud Alert Detected
            </span>
          ),
          description: (
            <span style={{ color: '#8892b0', fontSize: 13 }}>
              {alertData.description || 'A high-risk transaction was flagged.'}
            </span>
          ),
          placement: 'topRight',
          duration: 6,
          style: {
            background: '#1e2336',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 12,
            boxShadow: '0 0 20px rgba(239,68,68,0.25)',
          },
          icon: <AlertOutlined style={{ color: '#ef4444' }} />,
        })
      }
    }

    const handleNewTransaction = (txData) => {
      if (['admin', 'manager', 'merchant'].includes(userRole) && txData.is_fraud) {
        api.warning({
          message: (
            <span style={{ color: '#f0f2f8', fontWeight: 700 }}>
              ⚠️ Suspicious Transaction
            </span>
          ),
          description: (
            <span style={{ color: '#8892b0', fontSize: 13 }}>
              ${parseFloat(txData.amount || 0).toFixed(2)} flagged — Risk: {txData.risk_level}
            </span>
          ),
          placement: 'topRight',
          duration: 4,
          style: {
            background: '#1e2336',
            border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: 12,
          },
          icon: <ThunderboltOutlined style={{ color: '#f59e0b' }} />,
        })
      }
    }

    socket.on('new_alert', handleNewAlert)
    socket.on('new_transaction', handleNewTransaction)

    return () => {
      socket.off('new_alert', handleNewAlert)
      socket.off('new_transaction', handleNewTransaction)
      disconnectSocket()
    }
  }, [userRole, api, currentUser?.email])

  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    localStorage.removeItem('auth_token')
    navigate('/login')
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: (
        <div>
          <div style={{ fontWeight: 600, color: '#f0f2f8' }}>{currentUser?.full_name || 'User'}</div>
          <div style={{ fontSize: 11, color: '#8892b0' }}>{currentUser?.email}</div>
        </div>
      ),
    },
    {
      key: 'role_info',
      label: (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '2px 8px',
          background: 'rgba(79,110,247,0.15)',
          border: '1px solid rgba(79,110,247,0.3)',
          borderRadius: 100,
          fontSize: 10,
          fontWeight: 700,
          color: '#7b93fa',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          <SafetyCertificateOutlined />
          {userRole}
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: handleLogout,
      danger: true,
    },
  ]

  const handleMenuClick = ({ key }) => {
    navigate(key)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {contextHolder}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="layout-sider"
        theme="dark"
        width={224}
      >
        <div className="logo">
          <div className="logo-inner">
            <div className="logo-icon">F</div>
            {!collapsed && (
              <div>
                <h2>FraudNet</h2>
                <div className="logo-tagline">AI Defense Platform</div>
              </div>
            )}
          </div>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems.map(({ key, icon, label }) => ({ key, icon, label }))}
          onClick={handleMenuClick}
          className="sidebar-menu"
          style={{ background: 'transparent' }}
        />
      </Sider>

      <Layout>
        <Header className="layout-header">
          <div className="header-left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="toggle-button"
            />
            <div className="header-status">
              <div className="header-status-dot" />
              System Online
            </div>
          </div>
          <div className="header-right">
            {['admin', 'analyst', 'manager'].includes(userRole) ? (
              <Popover
                content={notificationPopoverContent}
                trigger="click"
                open={popoverOpen}
                onOpenChange={setPopoverOpen}
                placement="bottomRight"
                overlayClassName="fn-notif-popover"
              >
                <Badge
                  count={unreadCount}
                  overflowCount={99}
                  offset={[-2, 2]}
                  style={{ cursor: 'pointer' }}
                >
                  <Button
                    type="text"
                    icon={<BellOutlined style={{ fontSize: '16px' }} />}
                    className="header-notification-btn"
                  />
                </Badge>
              </Popover>
            ) : (
              <Badge
                count={alertCount}
                overflowCount={99}
                offset={[-2, 2]}
              >
                <Button
                  type="text"
                  icon={<BellOutlined style={{ fontSize: '16px' }} />}
                  className="header-notification-btn"
                  onClick={() => { setAlertCount(0); navigate('/transactions') }}
                />
              </Badge>
            )}
            <div className="header-divider" />
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
              <Avatar
                className="user-avatar"
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.full_name || 'User'}&backgroundColor=4f6ef7`}
                size={36}
              />
            </Dropdown>
          </div>
        </Header>

        <Content className="layout-content">
          <div className="content-container">
            {children || <Outlet />}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default Layout_Component
