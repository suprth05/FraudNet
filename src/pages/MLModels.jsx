import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Progress, Button, Space, Spin, message, Modal, Upload } from 'antd'
import { CheckCircleOutlined, ThunderboltOutlined, UploadOutlined } from '@ant-design/icons'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { fraudDetection } from '../lib/api'

const MLModels = () => {
  const [models, setModels] = useState([])
  const [performance, setPerformance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [retrainingModel, setRetrainingModel] = useState(null)

  useEffect(() => {
    const fetchModelData = async () => {
      setLoading(true)
      try {
        const [modelsRes, perfRes] = await Promise.all([
          fraudDetection.getModels(),
          fraudDetection.getModelPerformance()
        ])

        if (!modelsRes.error && modelsRes.data?.models) {
          setModels(modelsRes.data.models)
        }

        if (!perfRes.error && perfRes.data?.models) {
          setPerformance(perfRes.data)
        }
      } catch (error) {
        message.error('Failed to fetch model data')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchModelData()
  }, [])

  const handleRetrain = async (file) => {
    setRetrainingModel('rf_hybrid_v1')
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const { data, error } = await fraudDetection.retrain(formData)
      if (error) {
        message.error(error || 'Failed to retrain model')
        return
      }
      
      message.success('Model retrained successfully!')
      
      // Update performance
      if (data.metrics) {
        setPerformance({ performance: data.metrics })
        setModels([{
            id: 'rf_hybrid_v1',
            name: 'Hybrid RandomForest Ensemble v1.0',
            type: 'ensemble',
            accuracy: data.metrics.accuracy * 100,
            precision: data.metrics.precision * 100,
            recall: data.metrics.recall * 100,
            f1_score: data.metrics.f1_score * 100,
            last_updated: data.metrics.last_trained,
            status: 'active'
        }])
      }
    } catch (error) {
      message.error('Error retraining model')
    } finally {
      setRetrainingModel(null)
    }
  }

  const uploadProps = {
    beforeUpload: (file) => {
      if (!file.name.endsWith('.csv')) {
        message.error('You can only upload CSV files!')
        return Upload.LIST_IGNORE
      }
      handleRetrain(file)
      return false // Prevent default upload behavior
    },
    showUploadList: false,
  }

  const columns = [
    { 
      title: 'Model Name', 
      dataIndex: 'name', 
      key: 'name',
      width: 200
    },
    { 
      title: 'Type', 
      dataIndex: 'type', 
      key: 'type',
      width: 150
    },
    { 
      title: 'Accuracy', 
      dataIndex: 'accuracy', 
      key: 'accuracy',
      width: 120,
      render: (a) => <Progress type="circle" percent={a} width={50} />
    },
    { 
      title: 'Precision', 
      dataIndex: 'precision', 
      key: 'precision',
      width: 100,
      render: (p) => `${parseFloat(p).toFixed(1)}%`
    },
    { 
      title: 'Recall', 
      dataIndex: 'recall', 
      key: 'recall',
      width: 100,
      render: (r) => `${parseFloat(r).toFixed(1)}%`
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      width: 100,
      render: (s) => <Tag color={s === 'active' ? 'green' : 'blue'}>{s}</Tag>
    },
    { 
      title: 'Action', 
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Upload {...uploadProps}>
          <Button 
            type="primary" 
            size="small"
            icon={<UploadOutlined />}
            loading={retrainingModel === record.id}
          >
            Upload CSV & Retrain
          </Button>
        </Upload>
      )
    },
  ]

  const featureImportanceData = performance?.performance?.feature_importance 
    ? Object.keys(performance.performance.feature_importance).map(key => ({
        feature: key,
        importance: performance.performance.feature_importance[key]
      })).sort((a, b) => b.importance - a.importance)
    : []

  if (loading) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }} />
  }

  const avgAccuracy = models.length > 0 
    ? Math.round(models.reduce((sum, m) => sum + m.accuracy, 0) / models.length)
    : 0

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontFamily: 'var(--fn-font-main)', fontWeight: 800 }}>Machine Learning Models</h1>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="fn-card-premium">
            <Statistic 
              title="Active Models" 
              value={models.filter(m => m.status === 'active').length} 
              prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />} 
              valueStyle={{ color: '#10b981', fontFamily: 'var(--fn-font-main)', fontWeight: 800 }} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="fn-card-premium">
            <Statistic 
              title="Avg Accuracy" 
              value={avgAccuracy} 
              suffix="%" 
              prefix={<ThunderboltOutlined style={{ color: '#5c7cfa' }} />}
              valueStyle={{ color: '#5c7cfa', fontFamily: 'var(--fn-font-main)', fontWeight: 800 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="fn-card-premium">
            <Statistic 
              title="Avg Precision" 
              value={(models.length > 0 
                ? (models.reduce((sum, m) => sum + m.precision, 0) / models.length).toFixed(1)
                : 0)}
              suffix="%" 
              valueStyle={{ fontFamily: 'var(--fn-font-main)', fontWeight: 800 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="fn-card-premium">
            <Statistic 
              title="Avg Recall" 
              value={(models.length > 0 
                ? (models.reduce((sum, m) => sum + m.recall, 0) / models.length).toFixed(1)
                : 0)}
              suffix="%" 
              valueStyle={{ fontFamily: 'var(--fn-font-main)', fontWeight: 800 }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="fn-card-premium" title="Feature Importance Visualization" style={{ marginBottom: '24px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={featureImportanceData} layout="vertical" margin={{ left: 50 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 'dataMax']} />
            <YAxis dataKey="feature" type="category" width={120} />
            <Tooltip formatter={(val) => [(val * 100).toFixed(1) + '%', 'Importance']} />
            <Legend />
            <Bar dataKey="importance" fill="#5c7cfa" name="Information Gain" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="fn-card-premium" title="Available Models">
        <Table 
          columns={columns} 
          dataSource={models.map(m => ({ ...m, key: m.id }))}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  )
}

export default MLModels
