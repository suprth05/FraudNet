import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Select, Button, Space, Spin, message, Table } from 'antd'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { DownloadOutlined } from '@ant-design/icons'
import { analytics } from '../lib/api'

const Analytics = () => {
  const [loading, setLoading] = useState(true)
  const [fraudTrends, setFraudTrends] = useState([])
  const [merchantData, setMerchantData] = useState([])
  const [transactionTypes, setTransactionTypes] = useState([])
  const [geoData, setGeoData] = useState([])
  const [days, setDays] = useState(30)

  const COLORS = ['#52c41a', '#faad14', '#f5222d', '#eb2f96', '#722ed1']

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true)
      try {
        // Fetch all analytics data
        const [
          trendsResult,
          merchantResult,
          typesResult,
          geoResult,
        ] = await Promise.all([
          analytics.getFraudTrends(days),
          analytics.getMerchantAnalytics(),
          analytics.getTransactionTypes(),
          analytics.getGeographicAnalysis(),
        ])

        if (!trendsResult.error && trendsResult.data?.trends) {
          setFraudTrends(trendsResult.data.trends)
        }

        if (!merchantResult.error && merchantResult.data?.merchants) {
          setMerchantData(merchantResult.data.merchants)
        }

        if (!typesResult.error && typesResult.data?.transaction_types) {
          setTransactionTypes(typesResult.data.transaction_types)
        }

        if (!geoResult.error && geoResult.data?.regions) {
          setGeoData(geoResult.data.regions)
        }
      } catch (error) {
        message.error('Failed to fetch analytics data')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [days])

  const merchantColumns = [
    { title: 'Merchant Name', dataIndex: 'merchant_name', key: 'merchant_name' },
    { title: 'Transactions', dataIndex: 'total_transactions', key: 'total_transactions' },
    { title: 'Fraudulent', dataIndex: 'fraudulent_count', key: 'fraudulent_count' },
    { 
      title: 'Fraud Rate', 
      dataIndex: 'fraud_rate', 
      key: 'fraud_rate',
      render: (rate) => `${parseFloat(rate).toFixed(2)}%`
    },
    { 
      title: 'Avg Amount', 
      dataIndex: 'average_transaction_amount', 
      key: 'average_transaction_amount',
      render: (amt) => `$${parseFloat(amt).toFixed(2)}`
    },
  ]

  const typeColumns = [
    { title: 'Transaction Type', dataIndex: 'transaction_type', key: 'transaction_type' },
    { title: 'Count', dataIndex: 'count', key: 'count' },
    { title: 'Fraud Count', dataIndex: 'fraud_count', key: 'fraud_count' },
    { 
      title: 'Fraud Rate', 
      dataIndex: 'fraud_rate', 
      key: 'fraud_rate',
      render: (rate) => `${parseFloat(rate).toFixed(2)}%`
    },
  ]

  const geoColumns = [
    { title: 'Region', dataIndex: 'region', key: 'region' },
    { title: 'Transactions', dataIndex: 'transactions', key: 'transactions' },
    { title: 'Fraud Count', dataIndex: 'fraud_count', key: 'fraud_count' },
    { 
      title: 'Fraud Rate', 
      dataIndex: 'fraud_rate', 
      key: 'fraud_rate',
      render: (rate) => `${parseFloat(rate).toFixed(2)}%`
    },
  ]

  if (loading) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }} />
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontFamily: 'var(--fn-font-main)', fontWeight: 800 }}>Analytics & Reporting</h1>

      <Card className="fn-card-premium" style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={6}>
            <div style={{ fontSize: 11, color: 'var(--fn-text-secondary)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Time Period</div>
            <Select 
              value={days} 
              style={{ width: '100%' }} 
              onChange={setDays}
              options={[
                { value: 7, label: '7 days' },
                { value: 30, label: '30 days' },
                { value: 90, label: '90 days' },
                { value: 365, label: '1 year' },
              ]} 
            />
          </Col>
          <Col xs={24} sm={12} md={18} style={{ textAlign: 'right' }}>
            <Space style={{ marginTop: 22 }}>
              <Button icon={<DownloadOutlined />}>Download Report</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card className="fn-card-premium" title="Fraud Trends (Last 30 Days)" style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={fraudTrends.slice(0, 15)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="fraud_rate" stroke="#ef4444" strokeWidth={2} name="Fraud Rate (%)" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="fn-card-danger" title="Fraud Amount vs Transaction Count" style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fraudTrends.slice(0, 15)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_amount" fill="#5c7cfa" name="Total Amount" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fraud_amount" fill="#ef4444" name="Fraud Amount" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card className="fn-card-premium" title="Merchant Fraud Analysis" style={{ marginBottom: '24px' }}>
        <Table 
          columns={merchantColumns} 
          dataSource={merchantData.map(m => ({ ...m, key: m.merchant_id }))}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={12}>
          <Card className="fn-card-premium" title="Fraud by Transaction Type">
            <Table 
              columns={typeColumns} 
              dataSource={transactionTypes.map((t, idx) => ({ ...t, key: idx }))}
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="fn-card-premium" title="Fraud by Geographic Region">
            <Table 
              columns={geoColumns} 
              dataSource={geoData.map((g, idx) => ({ ...g, key: idx }))}
              pagination={false}
              size="small"
              scroll={{ x: 600 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Analytics
