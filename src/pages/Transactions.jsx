import React, { useState, useEffect } from 'react'
import { Table, Tag, Button, Card, Row, Col, Select, Space, Badge, Skeleton, Empty, Tooltip, message } from 'antd'
import { EyeOutlined, ReloadOutlined, ThunderboltOutlined, SwapOutlined, AlertOutlined } from '@ant-design/icons'
import { transactions } from '../lib/api'
import { socket } from '../lib/socket'

const RISK_COLORS = {
  Critical: { bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.35)', text: '#fca5a5' },
  High:     { bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.30)', text: '#fca5a5' },
  Medium:   { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)', text: '#fcd34d' },
  Low:      { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', text: '#6ee7b7' },
}

const RiskBadge = ({ risk }) => {
  const cfg = RISK_COLORS[risk] || RISK_COLORS.Low
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 100,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.text, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em'
    }}>
      {risk === 'Critical' || risk === 'High' ? <AlertOutlined /> : null}
      {risk}
    </span>
  )
}

const Transactions = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState({ status: '', is_fraud: '' })
  const [expandedKeys, setExpandedKeys] = useState([])

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true)
      try {
        const filterParams = {}
        if (filters.status) filterParams.status = filters.status
        if (filters.is_fraud) filterParams.is_fraud = filters.is_fraud

        const { data: result, error } = await transactions.getAll(page, pageSize, filterParams)
        if (!error && result?.transactions) {
          setData(result.transactions.map(tx => ({ ...tx, key: tx.id })))
          setTotal(result.total || 0)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()

    const handleNewTx = (newTx) => {
      setData(prev => [{ ...newTx, key: newTx.id }, ...prev])
      setTotal(prev => prev + 1)
      if (newTx.is_fraud) {
        message.error({ content: `🚨 Fraud detected: $${parseFloat(newTx.amount).toFixed(2)}`, duration: 4 })
      } else {
        message.info({ content: `New transaction: $${parseFloat(newTx.amount).toFixed(2)}`, duration: 2 })
      }
    }
    const handleUpdateTx = (updatedTx) => {
      setData(prev => prev.map(tx => tx.id === updatedTx.id ? { ...updatedTx, key: updatedTx.id } : tx))
    }

    socket.on('new_transaction', handleNewTx)
    socket.on('transaction_update', handleUpdateTx)
    return () => {
      socket.off('new_transaction', handleNewTx)
      socket.off('transaction_update', handleUpdateTx)
    }
  }, [page, pageSize, filters])

  const columns = [
    {
      title: 'TX ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: id => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--fn-text-muted)' }}>
          {id?.substring(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: v => (
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--fn-text-primary)', fontSize: 13 }}>
          ${parseFloat(v || 0).toFixed(2)}
        </span>
      ),
      sorter: (a, b) => a.amount - b.amount,
    },
    {
      title: 'Cardholder',
      dataIndex: 'cardholder_name',
      key: 'cardholder_name',
      width: 150,
      render: n => <span style={{ fontWeight: 500 }}>{n || '—'}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: s => {
        const map = { approved: 'green', flagged: 'red', pending_verification: 'gold', completed: 'cyan', declined: 'default', pending_admin_review: 'purple', rejected: 'red' }
        return <Tag color={map[s] || 'default'} style={{ fontWeight: 600, fontSize: 10, letterSpacing: '0.04em' }}>{s?.toUpperCase().replace(/_/g, ' ')}</Tag>
      },
    },
    {
      title: 'Location',
      dataIndex: 'transaction_location',
      key: 'transaction_location',
      width: 90,
      render: l => <span style={{ fontWeight: 500 }}>{l || 'US'}</span>,
    },
    {
      title: 'OTP Fails',
      dataIndex: 'otp_failed_attempts',
      key: 'otp_failed_attempts',
      width: 90,
      render: count => {
        if (!count) return <span style={{ color: 'var(--fn-text-muted)' }}>0</span>;
        return <Badge count={count} color={count >= 3 ? 'red' : 'orange'} showZero />
      },
    },
    {
      title: 'Risk Level',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 110,
      render: r => r ? <RiskBadge risk={r} /> : <span style={{ color: 'var(--fn-text-muted)' }}>—</span>,
    },
    {
      title: 'Fraud Score',
      dataIndex: 'fraud_score',
      key: 'fraud_score',
      width: 120,
      render: s => {
        const score = parseFloat(s || 0)
        const color = score >= 75 ? '#ef4444' : score >= 50 ? '#f59e0b' : '#10b981'
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: 'var(--fn-bg-elevated)', borderRadius: 2 }}>
              <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s' }} />
            </div>
            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color, minWidth: 28, textAlign: 'right' }}>
              {score.toFixed(0)}
            </span>
          </div>
        )
      },
    },
    {
      title: 'Fraud',
      dataIndex: 'is_fraud',
      key: 'is_fraud',
      width: 70,
      render: v => v ? (
        <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 11 }}>⚠ YES</span>
      ) : (
        <span style={{ color: '#10b981', fontSize: 11 }}>✓ No</span>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: d => (
        <span style={{ fontSize: 11, color: 'var(--fn-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          {d ? new Date(d).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
        </span>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <SwapOutlined style={{ color: 'var(--fn-primary)', marginRight: 10 }} />
          Transactions
        </h1>
        <div className="live-badge">
          <div className="live-badge-dot" />
          Live Feed Active
        </div>
      </div>

      {/* Filters */}
      <Card className="fn-card-premium" style={{ marginBottom: 20 }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8} md={6}>
            <div style={{ fontSize: 11, color: 'var(--fn-text-secondary)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Status</div>
            <Select
              style={{ width: '100%' }}
              placeholder="All statuses"
              allowClear
              onChange={v => { setFilters(f => ({ ...f, status: v || '' })); setPage(1) }}
              options={[
                { value: 'approved', label: 'Approved' },
                { value: 'flagged', label: 'Flagged' },
                { value: 'pending_verification', label: 'Pending Verification' },
                { value: 'declined', label: 'Declined' },
              ]}
            />
          </Col>
          <Col xs={24} sm={8} md={6}>
            <div style={{ fontSize: 11, color: 'var(--fn-text-secondary)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Fraud Status</div>
            <Select
              style={{ width: '100%' }}
              placeholder="All transactions"
              allowClear
              onChange={v => { setFilters(f => ({ ...f, is_fraud: v || '' })); setPage(1) }}
              options={[
                { value: 'true', label: '⚠ Fraudulent Only' },
                { value: 'false', label: '✓ Legitimate Only' },
              ]}
            />
          </Col>
          <Col xs={24} sm={8} md={4} style={{ display: 'flex', alignItems: 'flex-end', paddingTop: 22 }}>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => { setFilters({ status: '', is_fraud: '' }); setPage(1) }}
              style={{ width: '100%' }}
            >
              Reset
            </Button>
          </Col>
        </Row>
      </Card>

      <Card className="fn-card-premium">
        {loading ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : data.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: 'var(--fn-text-muted)' }}>No transactions found</span>}
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
              showTotal: t => `${t.toLocaleString()} transactions`,
            }}
            loading={loading}
            scroll={{ x: 1100 }}
            size="small"
            expandable={{
              expandedRowRender: record => (
                <div style={{ margin: 0, padding: '12px 20px', background: 'var(--fn-bg-elevated)', borderRadius: 8 }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <div style={{ fontSize: 11, color: 'var(--fn-text-muted)', fontWeight: 700, letterSpacing: '0.07em', marginBottom: 8, textTransform: 'uppercase' }}>
                        Risk Analysis & Fraud Reasons
                      </div>
                      {record.fraud_reasons?.length > 0 ? (
                        <ul style={{ margin: 0, padding: '0 0 0 20px' }}>
                          {record.fraud_reasons.map((r, i) => (
                            <li key={i} style={{ color: '#fca5a5', fontSize: 13, marginBottom: 4 }}>
                              {r}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span style={{ color: '#6ee7b7', fontSize: 13 }}>✓ No suspicious indicators detected</span>
                      )}
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: 11, color: 'var(--fn-text-muted)', fontWeight: 700, letterSpacing: '0.07em', marginBottom: 8, textTransform: 'uppercase' }}>
                        Additional Metadata
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--fn-text-primary)' }}>
                        <p style={{ margin: '0 0 4px' }}><strong>IP Address:</strong> {record.ip_address || '—'}</p>
                        <p style={{ margin: '0 0 4px' }}><strong>Device Fingerprint:</strong> {record.device_fingerprint || '—'}</p>
                        <p style={{ margin: '0 0 4px' }}><strong>Location:</strong> {record.transaction_location || 'US'}</p>
                        <p style={{ margin: '0 0 4px' }}><strong>OTP Failed Attempts:</strong> {record.otp_failed_attempts || 0}</p>
                      </div>
                    </Col>
                  </Row>
                </div>
              ),
            }}
          />
        )}
      </Card>
    </div>
  )
}

export default Transactions
