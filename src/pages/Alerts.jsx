import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Table, Tag, Button, Space, Spin, message, Badge, Skeleton, Empty, Tooltip } from 'antd'
import { CheckCircleOutlined, AlertOutlined, ThunderboltOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import { alerts } from '../lib/api'
import { socket } from '../lib/socket'

const Alerts = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState(null)
  const [filters, setFilters] = useState({ status: '', severity: '' })

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const filterParams = {}
      if (filters.status) filterParams.status = filters.status
      if (filters.severity) filterParams.severity = filters.severity

      const [result, summaryData] = await Promise.all([
        alerts.getAll(page, pageSize, filterParams),
        alerts.getSummary()
      ])

      if (result.data?.alerts) {
        setData(result.data.alerts.map(a => ({ ...a, key: a.id })))
        setTotal(result.data.total || 0)
      }
      if (summaryData.data) setSummary(summaryData.data)
    } catch (error) {
      message.error('Error fetching alerts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()

    const handleNewAlert = (newAlert) => {
      setData(prev => [{ ...newAlert, key: newAlert.id }, ...prev])
      setTotal(prev => prev + 1)
      setSummary(prev => ({
        ...prev,
        total_alerts: (prev?.total_alerts || 0) + 1,
        open_alerts: (prev?.open_alerts || 0) + 1,
        severity_breakdown: {
          ...prev?.severity_breakdown,
          [newAlert.severity]: (prev?.severity_breakdown?.[newAlert.severity] || 0) + 1
        }
      }))
    }
    socket.on('new_alert', handleNewAlert)
    return () => socket.off('new_alert', handleNewAlert)
  }, [page, pageSize, filters])

  const handleResolveAlert = async (alertId) => {
    try {
      await alerts.update(alertId, { status: 'resolved' })
      setData(prev => prev.map(a => a.id === alertId ? { ...a, status: 'resolved' } : a))
      message.success('Alert resolved')
    } catch {
      message.error('Failed to resolve alert')
    }
  }

  const severityConfig = {
    critical: { color: 'red', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
    high: { color: 'volcano', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
    medium: { color: 'orange', bg: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.2)' },
    low: { color: 'green', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
  }

  const columns = [
    {
      title: 'Alert ID',
      dataIndex: 'id',
      key: 'id',
      width: 110,
      render: id => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--fn-text-muted)' }}>
          {id?.substring(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'alert_type',
      key: 'alert_type',
      width: 160,
      render: t => <span style={{ fontWeight: 600, color: 'var(--fn-text-primary)' }}>{t}</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: d => (
        <Tooltip title={d}>
          <span style={{ color: 'var(--fn-text-secondary)', fontSize: 12 }}>{d}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 110,
      render: s => {
        const cfg = severityConfig[s] || { color: 'default' }
        return (
          <Tag
            color={cfg.color}
            style={{ fontWeight: 700, letterSpacing: '0.05em', fontSize: 10 }}
          >
            {s?.toUpperCase()}
          </Tag>
        )
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: d => (
        <span style={{ fontSize: 11, color: 'var(--fn-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          {d ? new Date(d).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: s => (
        <Tag color={s === 'resolved' ? 'green' : s === 'investigating' ? 'blue' : 'red'}>
          {s?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'open' && (
            <Button
              type="primary"
              size="small"
              danger
              onClick={() => handleResolveAlert(record.id)}
            >
              Resolve
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const SummaryCard = ({ title, value, icon, color }) => (
    <div className="fn-stat-card" style={{ 
      '--card-accent': color,
      background: `radial-gradient(circle at 85% 15%, ${color}0d 0%, var(--fn-bg-card) 60%)`,
      boxShadow: `0 4px 15px rgba(0,0,0,0.2), 0 0 1px rgba(255,255,255,0.08)`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--fn-text-secondary)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            {title}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--fn-text-primary)', fontFamily: 'var(--fn-font-main)' }}>
            {loading ? <Spin size="small" /> : value ?? 0}
          </div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${color}15`,
          border: `1px solid ${color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color, fontSize: 16,
          boxShadow: `0 0 12px ${color}15`
        }}>{icon}</div>
      </div>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <AlertOutlined style={{ color: '#ef4444', marginRight: 10 }} />
          Alerts & Monitoring
        </h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="live-badge">
            <div className="live-badge-dot" />
            Live Monitoring
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchAlerts} style={{ borderColor: 'var(--fn-border)', color: 'var(--fn-text-secondary)' }}>
            Refresh
          </Button>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <SummaryCard title="Total Alerts" value={summary?.total_alerts} icon={<AlertOutlined />} color="#5c7cfa" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <SummaryCard title="Open" value={summary?.open_alerts} icon={<ThunderboltOutlined />} color="#ef4444" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <SummaryCard title="Critical" value={summary?.severity_breakdown?.critical} icon={<AlertOutlined />} color="#dc2626" />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <SummaryCard title="Resolved" value={summary?.resolved_alerts} icon={<CheckCircleOutlined />} color="#10b981" />
        </Col>
      </Row>

      <Card className="fn-card-danger">
        {loading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : data.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: 'var(--fn-text-muted)' }}>No alerts found</span>}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={data}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: (p, ps) => { setPage(p); setPageSize(ps) },
              showSizeChanger: true,
              showTotal: t => `${t} alerts`,
            }}
            loading={loading}
            scroll={{ x: 1000 }}
            size="small"
          />
        )}
      </Card>
    </div>
  )
}

export default Alerts
