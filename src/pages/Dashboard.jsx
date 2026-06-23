import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Table, Tag, Spin, Skeleton } from 'antd'
import {
  AlertOutlined, CheckCircleOutlined, RiseOutlined, ThunderboltOutlined,
  ArrowUpOutlined, SecurityScanOutlined
} from '@ant-design/icons'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { analytics, alerts, transactions } from '../lib/api'
import { socket } from '../lib/socket'

const COLORS = {
  primary: '#5c7cfa',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
}

const MetricCard = ({ title, value, suffix, prefix, color, icon, trend, loading }) => (
  <div className="fn-stat-card" style={{ 
    '--card-accent': color,
    background: `radial-gradient(circle at 85% 15%, ${color}0d 0%, var(--fn-bg-card) 60%)`,
    boxShadow: `0 4px 15px rgba(0,0,0,0.2), 0 0 1px rgba(255,255,255,0.08)`
  }}>
    {loading ? (
      <Skeleton active paragraph={{ rows: 1 }} />
    ) : (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, color: 'var(--fn-text-secondary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>
            {title}
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${color}15`,
            border: `1px solid ${color}28`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: color, fontSize: 16,
            boxShadow: `0 0 12px ${color}15`
          }}>
            {icon}
          </div>
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--fn-text-primary)', lineHeight: 1.1, fontFamily: 'var(--fn-font-main)' }}>
          {value ?? '—'}{suffix && <span style={{ fontSize: 13, color: 'var(--fn-text-secondary)', fontWeight: 500, marginLeft: 4, opacity: 0.85 }}>{suffix}</span>}
        </div>
        {trend != null && (
          <div style={{ marginTop: 10, fontSize: 11, color: trend >= 0 ? COLORS.danger : COLORS.success, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
            <ArrowUpOutlined style={{ transform: trend < 0 ? 'rotate(180deg)' : 'none' }} />
            {Math.abs(trend).toFixed(1)}% vs last period
          </div>
        )}
      </>
    )}
  </div>
)

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--fn-bg-elevated)',
      border: '1px solid var(--fn-border)',
      borderRadius: 10,
      padding: '12px 16px',
      fontSize: 12,
      backdropFilter: 'blur(16px)',
      boxShadow: 'var(--fn-shadow-md)'
    }}>
      <div style={{ color: 'var(--fn-text-secondary)', marginBottom: 8, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ color: entry.color, fontWeight: 700, display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 4 }}>
          <span>{entry.name}:</span>
          <span>{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [dashboardMetrics, setDashboardMetrics] = useState(null)
  const [fraudTrends, setFraudTrends] = useState([])
  const [alertsSummary, setAlertsSummary] = useState(null)
  const [recentAlerts, setRecentAlerts] = useState([])
  const [transactionStats, setTransactionStats] = useState(null)
  const [allTransactions, setAllTransactions] = useState([])
  const [userRole, setUserRole] = useState('admin')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [metricsRes, alertsRes, recentAlertsRes, transRes, allTransRes] = await Promise.all([
        analytics.getDashboardMetrics(30),
        alerts.getSummary(),
        alerts.getAll(1, 5),
        transactions.getStats(),
        transactions.getAll(1, 100)
      ])

      if (!metricsRes.error && metricsRes.data?.metrics) {
        setDashboardMetrics(metricsRes.data.metrics[metricsRes.data.metrics.length - 1])
        setFraudTrends(metricsRes.data.metrics)
      }
      if (!alertsRes.error && alertsRes.data) setAlertsSummary(alertsRes.data)
      if (!recentAlertsRes.error && recentAlertsRes.data?.alerts) setRecentAlerts(recentAlertsRes.data.alerts)
      if (!transRes.error && transRes.data) setTransactionStats(transRes.data)
      if (!allTransRes.error && allTransRes.data?.transactions) {
        setAllTransactions(allTransRes.data.transactions)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const currentUserString = localStorage.getItem('currentUser')
    const currentUser = currentUserString ? JSON.parse(currentUserString) : null
    if (currentUser?.role) {
      setUserRole(currentUser.role)
    }

    fetchData()

    const handleDashboardUpdate = () => fetchData()
    const handleNewAlert = (alert) => {
      setRecentAlerts(prev => [alert, ...prev].slice(0, 5))
      setAlertsSummary(prev => ({ ...prev, open_alerts: (prev?.open_alerts || 0) + 1 }))
    }
    socket.on('dashboard_update', handleDashboardUpdate)
    socket.on('new_alert', handleNewAlert)
    return () => {
      socket.off('dashboard_update', handleDashboardUpdate)
      socket.off('new_alert', handleNewAlert)
    }
  }, [])

  const alertColumns = [
    {
      title: 'Alert ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--fn-text-muted)' }}>
          {id?.substring(0, 8).toUpperCase()}
        </span>
      ),
      width: 100,
    },
    { title: 'Type', dataIndex: 'alert_type', key: 'alert_type', render: t => <span style={{ fontWeight: 600 }}>{t}</span> },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (s) => {
        const map = { critical: 'red', high: 'volcano', medium: 'orange', low: 'green' }
        return <Tag color={map[s] || 'default'} style={{ fontWeight: 700, letterSpacing: '0.04em' }}>{s?.toUpperCase()}</Tag>
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s) => (
        <Tag color={s === 'resolved' ? 'green' : s === 'open' ? 'red' : 'blue'}>
          {s?.toUpperCase()}
        </Tag>
      ),
    },
  ]

  const customerColumns = [
    {
      title: 'Customer Name',
      dataIndex: 'cardholder_name',
      key: 'cardholder_name',
      render: (text) => <span style={{ fontWeight: 600 }}>{text || '—'}</span>
    },
    {
      title: 'Transaction ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--fn-text-muted)' }}>
          {id?.substring(0, 8).toUpperCase()}
        </span>
      ),
      width: 120,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v) => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 13 }}>
          ${parseFloat(v || 0).toFixed(2)}
        </span>
      ),
      width: 120,
    },
    {
      title: 'Fraud Status',
      key: 'status',
      render: (_, record) => {
        if (record.status === 'rejected' || record.review_status === 'rejected') {
          return <Tag color="red" style={{ fontWeight: 700, letterSpacing: '0.04em' }}>REJECTED BY ADMIN</Tag>
        }
        return <Tag color="volcano" style={{ fontWeight: 700, letterSpacing: '0.04em' }}>FLAGGED FRAUD</Tag>
      }
    },
    {
      title: 'Fraud Score',
      dataIndex: 'fraud_score',
      key: 'fraud_score',
      render: (s) => {
        const score = parseFloat(s || 0)
        const color = score >= 75 ? '#ef4444' : score >= 50 ? '#f59e0b' : '#10b981'
        return <span style={{ fontFamily: 'JetBrains Mono, monospace', color, fontWeight: 'bold' }}>{score.toFixed(0)}</span>
      },
      width: 100,
    },
    {
      title: 'Triggered At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (dateStr) => {
        if (!dateStr) return '—'
        const d = new Date(dateStr)
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    }
  ]

  const chartData = fraudTrends.map(item => ({
    date: item.date?.substring(5) || 'N/A',
    fraudulent: item.fraudulent_transactions || 0,
    legitimate: (item.total_transactions || 0) - (item.fraudulent_transactions || 0),
    score: item.avg_fraud_score || 0,
  }))

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          <SecurityScanOutlined style={{ color: 'var(--fn-primary)', marginRight: 10 }} />
          {userRole === 'analyst' ? 'Analyst Fraud Dashboard' : 'Fraud Detection Dashboard'}
        </h1>
        <div className="live-badge">
          <div className="live-badge-dot" />
          Live Monitoring
        </div>
      </div>

      {/* Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            title="Total Transactions"
            value={(transactionStats?.total_transactions || 0).toLocaleString()}
            icon={<CheckCircleOutlined />}
            color={COLORS.success}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            title="Fraud Detected"
            value={transactionStats?.fraudulent_count || 0}
            suffix={`(${(transactionStats?.fraud_rate || 0).toFixed(1)}%)`}
            icon={<AlertOutlined />}
            color={COLORS.danger}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            title="Open Alerts"
            value={alertsSummary?.open_alerts || 0}
            icon={<ThunderboltOutlined />}
            color={COLORS.warning}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            title="Detection Rate"
            value={(dashboardMetrics?.fraud_detection_rate || 0).toFixed(1)}
            suffix="%"
            icon={<RiseOutlined />}
            color={COLORS.primary}
            loading={loading}
          />
        </Col>
      </Row>

      {/* Conditional Row: Table for Analyst, Charts for Admin/Others */}
      {userRole === 'analyst' ? (
        <Card className="fn-card-danger" title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertOutlined style={{ color: COLORS.danger }} />
            Flagged Fraudulent & Rejected Customer Accounts
          </div>
        } style={{ marginBottom: 24 }}>
          {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : (
            <Table
              columns={customerColumns}
              dataSource={allTransactions
                .filter(tx => tx.is_fraud || tx.status === 'rejected' || tx.review_status === 'rejected')
                .map(tx => ({ ...tx, key: tx.id }))
              }
              pagination={{ pageSize: 6 }}
              size="small"
            />
          )}
        </Card>
      ) : (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={14}>
            <Card className="fn-card-premium" title="Transaction Trends — Last 30 Days" style={{ height: 360 }}>
              {loading ? <Skeleton active /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="legitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fraudGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="legitimate" stroke={COLORS.success} fill="url(#legitGrad)" strokeWidth={2} name="Legitimate" dot={false} />
                    <Area type="monotone" dataKey="fraudulent" stroke={COLORS.danger} fill="url(#fraudGrad)" strokeWidth={2} name="Fraudulent" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card className="fn-card-premium" title="Fraud Activity (Last 10 days)" style={{ height: 360 }}>
              {loading ? <Skeleton active /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData.slice(-10)} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="legitimate" fill={COLORS.success} name="Legitimate" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fraudulent" fill={COLORS.danger} name="Fraudulent" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* Recent Alerts */}
      <Card className="fn-card-danger" title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertOutlined style={{ color: COLORS.danger }} />
          Recent Fraud Alerts
        </div>
      }>
        {loading ? <Skeleton active paragraph={{ rows: 5 }} /> : (
          recentAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--fn-text-muted)' }}>
              <CheckCircleOutlined style={{ fontSize: 36, color: COLORS.success, marginBottom: 12, display: 'block' }} />
              No fraud alerts at this time
            </div>
          ) : (
            <Table
              columns={alertColumns}
              dataSource={recentAlerts.map(a => ({ ...a, key: a.id }))}
              pagination={false}
              size="small"
            />
          )
        )}
      </Card>
    </div>
  )
}

export default Dashboard
