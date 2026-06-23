import React from 'react'
import { Card, Table, Button, Space, Tag, Input, Row, Col } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'

const Rules = () => {
  const columns = [
    { title: 'Rule ID', dataIndex: 'id', key: 'id' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Condition', dataIndex: 'condition', key: 'condition' },
    { title: 'Severity', dataIndex: 'severity', key: 'severity', render: (s) => <Tag color={s === 'High' ? 'red' : 'orange'}>{s}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'Active' ? 'green' : 'gray'}>{s}</Tag> },
    { title: 'Action', key: 'action', render: () => <Space><a>Edit</a><a>Delete</a></Space> },
  ]

  const data = [
    { key: 1, id: 'R001', name: 'High Amount', condition: 'amount > 5000', severity: 'High', status: 'Active' },
    { key: 2, id: 'R002', name: 'Velocity Check', condition: 'transactions > 5/hour', severity: 'Medium', status: 'Active' },
  ]

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontFamily: 'var(--fn-font-main)', fontWeight: 800 }}>Fraud Rules</h1>
      <Card className="fn-card-premium" style={{ marginBottom: '16px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input prefix={<SearchOutlined />} placeholder="Search rules..." />
          </Col>
          <Col xs={24} sm={12} md={16} style={{ textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />}>Create Rule</Button>
          </Col>
        </Row>
      </Card>
      <Card className="fn-card-premium">
        <Table columns={columns} dataSource={data} />
      </Card>
    </div>
  )
}

export default Rules
