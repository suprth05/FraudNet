import React from 'react'
import { Card, Table, Button, Space, Tag, Tabs, Row, Col, Input, Avatar } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

const Admin = () => {
  const usersColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (name) => <Space><Avatar>{name[0]}</Avatar>{name}</Space> },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Role', dataIndex: 'role', key: 'role' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'Active' ? 'green' : 'red'}>{s}</Tag> },
    { title: 'Action', key: 'action', render: () => <Space><a>Edit</a><a>Suspend</a></Space> },
  ]

  const usersData = [
    { key: 1, name: 'John Admin', email: 'john@fraudnet.com', role: 'Admin', status: 'Active' },
    { key: 2, name: 'Jane Analyst', email: 'jane@fraudnet.com', role: 'Analyst', status: 'Active' },
  ]

  const settingsItems = [
    { label: 'Users', key: '1', children: <Table columns={usersColumns} dataSource={usersData} /> },
    { label: 'System Settings', key: '2', children: <Card><p>System configuration options here</p></Card> },
    { label: 'Integrations', key: '3', children: <Card><p>Integration management here</p></Card> },
  ]

  return (
    <div>
      <h1>Admin Settings</h1>
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col xs={24} md={8}>
            <Input prefix={<SearchOutlined />} placeholder="Search users..." />
          </Col>
        </Row>
      </Card>
      <Card>
        <Tabs items={settingsItems} />
      </Card>
    </div>
  )
}

export default Admin
