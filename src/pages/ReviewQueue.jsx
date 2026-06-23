import React, { useState, useEffect } from 'react'
import { Table, Tag, Button, Card, Space, Skeleton, Empty, Modal, message, Typography, Row, Col, Input } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, FileSearchOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { transactions } from '../lib/api'
import { socket } from '../lib/socket'

const { Title, Text } = Typography
const { TextArea } = Input

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
      {risk}
    </span>
  )
}

const ReviewQueue = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const [reviewModalVisible, setReviewModalVisible] = useState(false)
  const [selectedTx, setSelectedTx] = useState(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchQueue = async () => {
    setLoading(true)
    try {
      const { data: result, error } = await transactions.getAll(page, pageSize, { status: 'pending_admin_review' })
      if (!error && result?.transactions) {
        setData(result.transactions.map(tx => ({ ...tx, key: tx.id })))
        setTotal(result.total || 0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()

    const handleUpdate = () => {
      fetchQueue()
    }

    socket.on('new_transaction', handleUpdate)
    socket.on('review_queue_updated', handleUpdate)
    return () => {
      socket.off('new_transaction', handleUpdate)
      socket.off('review_queue_updated', handleUpdate)
    }
  }, [page, pageSize])

  const handleApprove = async () => {
    if (!selectedTx) return
    setActionLoading(true)
    try {
      const { error } = await transactions.approve(selectedTx.id, reviewNotes)
      if (error) {
        message.error(error)
      } else {
        message.success(`Transaction ${selectedTx.id.substring(0, 8)} approved`)
        setReviewModalVisible(false)
        fetchQueue()
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedTx) return
    if (!reviewNotes.trim()) {
      message.warning("Please provide a reason for rejection in the notes.")
      return
    }
    setActionLoading(true)
    try {
      const { error } = await transactions.reject(selectedTx.id, reviewNotes)
      if (error) {
        message.error(error)
      } else {
        message.success(`Transaction ${selectedTx.id.substring(0, 8)} rejected`)
        setReviewModalVisible(false)
        fetchQueue()
      }
    } finally {
      setActionLoading(false)
    }
  }

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
    },
    {
      title: 'Cardholder',
      dataIndex: 'cardholder_name',
      key: 'cardholder_name',
      width: 150,
      render: n => <span style={{ fontWeight: 500 }}>{n || '—'}</span>,
    },
    {
      title: 'Location',
      dataIndex: 'transaction_location',
      key: 'transaction_location',
      width: 90,
      render: l => <span style={{ fontWeight: 500 }}>{l || 'US'}</span>,
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
      width: 100,
      render: s => {
        const score = parseFloat(s || 0)
        const color = score >= 75 ? '#ef4444' : score >= 50 ? '#f59e0b' : '#10b981'
        return <span style={{ fontFamily: 'JetBrains Mono, monospace', color, fontWeight: 'bold' }}>{score.toFixed(0)}</span>
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button 
          type="primary" 
          icon={<FileSearchOutlined />} 
          size="small" 
          onClick={() => {
            setSelectedTx(record)
            setReviewNotes('')
            setReviewModalVisible(true)
          }}
        >
          Review
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">
          <SafetyCertificateOutlined style={{ color: 'var(--fn-primary)', marginRight: 10 }} />
          Admin Review Queue
        </h1>
      </div>

      <Card className="fn-card-premium">
        {loading ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : data.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: 'var(--fn-text-muted)' }}>No transactions pending review. Queue is clear!</span>}
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
            }}
            loading={loading}
            size="small"
          />
        )}
      </Card>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SafetyCertificateOutlined style={{ color: '#f59e0b', fontSize: 20 }} />
            <span>Review Transaction: {selectedTx?.id.substring(0, 8).toUpperCase()}</span>
          </div>
        }
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => setReviewModalVisible(false)}>
            Cancel
          </Button>,
          <Button key="reject" danger type="primary" icon={<CloseCircleOutlined />} onClick={handleReject} loading={actionLoading}>
            Reject Order
          </Button>,
          <Button key="approve" type="primary" style={{ background: '#10b981', borderColor: '#10b981' }} icon={<CheckCircleOutlined />} onClick={handleApprove} loading={actionLoading}>
            Approve Order
          </Button>,
        ]}
      >
        {selectedTx && (
          <div style={{ padding: '10px 0' }}>
            <Row gutter={[24, 24]}>
              <Col span={12}>
                <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Transaction Details</Title>
                <div style={{ background: 'var(--fn-bg-elevated)', padding: 16, borderRadius: 8, border: '1px solid var(--fn-border)' }}>
                  <p><strong>Amount:</strong> ${parseFloat(selectedTx.amount).toFixed(2)}</p>
                  <p><strong>Cardholder:</strong> {selectedTx.cardholder_name}</p>
                  <p><strong>Card (Last 4):</strong> •••• {selectedTx.card_last_four}</p>
                  <p><strong>IP Address:</strong> {selectedTx.ip_address}</p>
                  <p><strong>Location:</strong> {selectedTx.transaction_location || 'US'}</p>
                  <p><strong>OTP Fails:</strong> {selectedTx.otp_failed_attempts || 0}</p>
                </div>
              </Col>
              <Col span={12}>
                <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Risk Profile</Title>
                <div style={{ background: 'var(--fn-bg-elevated)', padding: 16, borderRadius: 8, border: '1px solid var(--fn-border)' }}>
                  <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Risk Level:</strong> <RiskBadge risk={selectedTx.risk_level} />
                  </p>
                  <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>Fraud Score:</strong> <span style={{ color: selectedTx.fraud_score >= 75 ? '#ef4444' : '#f59e0b', fontWeight: 'bold' }}>{selectedTx.fraud_score} / 100</span>
                  </p>
                  <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>ML Confidence:</strong> <span style={{ color: selectedTx.risk_metadata?.ml_confidence > 70 ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{selectedTx.risk_metadata?.ml_confidence ? `${selectedTx.risk_metadata.ml_confidence.toFixed(1)}%` : 'N/A'}</span>
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <strong>Detected Reasons:</strong>
                    {selectedTx.fraud_reasons && selectedTx.fraud_reasons.length > 0 ? (
                      <ul style={{ paddingLeft: 20, margin: '8px 0 0 0', color: '#fca5a5', fontSize: 13 }}>
                        {selectedTx.fraud_reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    ) : (
                      <div style={{ color: '#8892b0', fontSize: 13, marginTop: 4 }}>No specific reasons listed.</div>
                    )}
                  </div>
                </div>
              </Col>
            </Row>

            <div style={{ marginTop: 24 }}>
              <Title level={5} style={{ marginBottom: 8 }}>Review Notes <span style={{ color: '#ef4444' }}>*</span></Title>
              <TextArea 
                rows={4} 
                placeholder="Enter justification for approval or rejection..." 
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
              />
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                Notes are required if rejecting the order.
              </Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ReviewQueue
