import React from 'react'
import { Card, Table, Button, Space, Tag, Avatar, Row, Col, Input } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'

const Merchants = () => {
  const columns = [
    {
      title: 'Merchant',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <Space><Avatar size="large">{name[0]}</Avatar><span>{name}</span></Space>,
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Industry', dataIndex: 'industry', key: 'industry' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'Active' ? 'green' : 'gray'}>{s}</Tag> },
    { title: 'Risk Level', dataIndex: 'risk', key: 'risk' },
    { title: 'Action', key: 'action', render: () => <Space><a>View</a><a>Edit</a></Space> },
  ]

  const data = [
    { key: 1, name: 'Amazon', email: 'merchant@amazon.com', industry: 'Retail', status: 'Active', risk: 'Low' },
    { key: 2, name: 'eBay', email: 'seller@ebay.com', industry: 'Marketplace', status: 'Active', risk: 'Low' },
  ]

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontFamily: 'var(--fn-font-main)', fontWeight: 800 }}>Merchants</h1>
      <Card className="fn-card-premium" style={{ marginBottom: '16px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input prefix={<SearchOutlined />} placeholder="Search merchants..." />
          </Col>
          <Col xs={24} sm={12} md={16} style={{ textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />}>Add Merchant</Button>
          </Col>
        </Row>
      </Card>
      <Card className="fn-card-premium">
        <Table columns={columns} dataSource={data} />
      </Card>
    </div>
  )
}

export default Merchants
