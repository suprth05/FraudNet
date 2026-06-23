import React, { useState, useRef } from 'react'
import { Card, Button, Row, Col, Typography, Badge, Drawer, Form, Input, message, Result, Modal, Tag, Alert } from 'antd'
import { ShoppingCartOutlined, CreditCardOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { checkout } from '../lib/api'

const { Title, Text } = Typography

// Stable session fingerprint — generated once per browser session, not per checkout
// This prevents legitimate repeat purchases from always being flagged as a new/different device
const SESSION_IP = '192.168.1.' + Math.floor(Math.random() * 200 + 10)
const SESSION_FINGERPRINT = navigator.userAgent.substring(0, 50) + '_session_' + Math.random().toString(36).substring(2, 8)

// Mock Products
const products = [
  { id: 1, name: 'Premium Wireless Headphones', price: 299.99, category: 'Electronics', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80' },
  { id: 2, name: 'Smart Fitness Watch', price: 199.50, category: 'Electronics', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80' },
  { id: 3, name: 'Ultra HD 4K Camera', price: 899.00, category: 'Photography', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&q=80' },
  { id: 4, name: 'Luxury Diamond Necklace', price: 2450.00, category: 'Jewelry', image: 'https://images.unsplash.com/photo-1599643478524-fb66f7ca065b?w=500&q=80' },
  { id: 5, name: 'Designer Leather Bag', price: 1200.00, category: 'Fashion', image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=500&q=80' },
  { id: 6, name: 'Gaming Laptop Pro', price: 2199.99, category: 'Electronics', image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500&q=80' },
]

const Shop = () => {
  const [cart, setCart] = useState([])
  const [cartVisible, setCartVisible] = useState(false)
  const [checkoutVisible, setCheckoutVisible] = useState(false)
  const [otpVisible, setOtpVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [orderStatus, setOrderStatus] = useState(null) // 'success', 'flagged'
  const [currentTxId, setCurrentTxId] = useState(null)
  const [fraudReasons, setFraudReasons] = useState([])
  const [form] = Form.useForm()

  const addToCart = (product) => {
    setCart([...cart, product])
    message.success(`${product.name} added to cart`)
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0)

  // Listen to live transaction updates for the current transaction
  React.useEffect(() => {
    if (!currentTxId) return;

    const handleTxUpdate = (updatedTx) => {
      if (updatedTx.id === currentTxId) {
        if (updatedTx.status === 'approved') {
          setOrderStatus('success')
        } else if (updatedTx.status === 'rejected') {
          setOrderStatus('flagged')
          setFraudReasons(['Transaction manually rejected by admin', updatedTx.admin_decision_reason || ''])
        }
      }
    }

    import('../lib/socket').then(({ socket }) => {
      socket.on('transaction_approved', handleTxUpdate)
      socket.on('transaction_rejected', handleTxUpdate)
      return () => {
        socket.off('transaction_approved', handleTxUpdate)
        socket.off('transaction_rejected', handleTxUpdate)
      }
    })
  }, [currentTxId])

  const handleCheckout = async (values) => {
    setLoading(true)
    try {
      const payload = {
        amount: cartTotal,
        cardholder_name: values.cardName,
        card_number: values.cardNumber,
        ip_address: SESSION_IP,
        device_fingerprint: SESSION_FINGERPRINT,
        location: 'Bengaluru' // Default location
      }

      // Demo trigger: if cardName contains 'Fraud', simulate a high-risk transaction
      if (values.cardName.toLowerCase().includes('fraud')) {
         payload.amount = 5000;
      }

      // Demo trigger: Location Jump
      if (values.cardName.toLowerCase() === 'traveler') {
         payload.location = 'RU'; // Will trigger location mismatch if previous tx was US
      }

      const { data, error } = await checkout.evaluate(payload)
      
      if (error) {
        message.error(error)
        setLoading(false)
        return
      }

      setCurrentTxId(data.transaction_id)
      
      if (data.action === 'proceed') {
        setOrderStatus('success')
        setCart([])
      } else if (data.action === 'request_otp') {
        setOtpVisible(true)
        message.warning('Additional verification required for this transaction.')
      } else if (data.action === 'block' || data.action === 'under_review') {
        if (data.action === 'under_review') {
          setOrderStatus('under_review')
          setCart([])
        } else {
          setOrderStatus('flagged')
        }
        setFraudReasons(data.fraud_reasons || [])
      }
      
      setCheckoutVisible(false)
      setCartVisible(false)
    } catch (err) {
      message.error('An error occurred during checkout')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (values) => {
    setLoading(true)
    try {
      const { data, error } = await checkout.verifyOtp(currentTxId, values.otp)
      if (error) {
        message.error(error)
        setOtpVisible(false)
        if (data && data.action === 'under_review') {
          setOrderStatus('under_review')
        } else {
          setOrderStatus('flagged')
        }
        setFraudReasons(['Failed OTP Verification', 'Suspicious Activity Detected'])
        return
      }

      if (data.success) {
        setOrderStatus('success')
        setCart([])
        setOtpVisible(false)
      }
    } catch (err) {
      message.error('OTP verification failed')
    } finally {
      setLoading(false)
    }
  }

  if (orderStatus === 'success') {
    return (
      <Result
        status="success"
        title="Order Placed Successfully!"
        subTitle={`Transaction ID: ${currentTxId}. Your order has been approved by FraudNet.`}
        extra={[
          <Button type="primary" key="console" onClick={() => { setOrderStatus(null); setCurrentTxId(null) }}>
            Continue Shopping
          </Button>
        ]}
      />
    )
  }

  if (orderStatus === 'flagged') {
    return (
      <Result
        status="error"
        title="Transaction Declined"
        subTitle="Your order was blocked by our Fraud Protection System."
        extra={[
          <div style={{ textAlign: 'left', background: '#fff1f0', padding: 20, borderRadius: 8, margin: '20px auto', maxWidth: 600, border: '1px solid #ffa39e' }}>
             <Typography.Title level={4} style={{ color: '#cf1322' }}><SafetyCertificateOutlined /> Fraud Alert</Typography.Title>
             <p>This transaction triggered critical security alerts and has been blocked. The merchant has been notified.</p>
             <p><strong>Detected Risks:</strong></p>
             <ul>
               {fraudReasons.map((r, i) => <li key={i}>{r}</li>)}
             </ul>
          </div>,
          <Button type="primary" key="console" onClick={() => { setOrderStatus(null); setCurrentTxId(null) }}>
            Return to Shop
          </Button>
        ]}
      />
    )
  }

  if (orderStatus === 'under_review') {
    return (
      <Result
        status="warning"
        title="Order Under Manual Review"
        subTitle={`Transaction ID: ${currentTxId}. Your order has been flagged for manual review by our security team.`}
        extra={[
          <div style={{ textAlign: 'center', background: '#fffbe6', padding: 20, borderRadius: 8, margin: '20px auto', maxWidth: 600, border: '1px solid #ffe58f' }}>
             <Typography.Title level={4} style={{ color: '#d46b08' }}>Action Required</Typography.Title>
             <p>Please wait while an administrator reviews your transaction. This page will update automatically when a decision is made.</p>
          </div>,
          <Button type="primary" key="console" onClick={() => { setOrderStatus(null); setCurrentTxId(null) }}>
            Continue Shopping
          </Button>
        ]}
      />
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>E-Commerce Store</Title>
        <Badge count={cart.length}>
          <Button type="primary" icon={<ShoppingCartOutlined />} size="large" onClick={() => setCartVisible(true)}>
            Cart (${cartTotal.toFixed(2)})
          </Button>
        </Badge>
      </div>

      <Alert 
        message="Demo Instructions for Advanced Fraud Rules" 
        description={
          <ul>
            <li><strong>High Amount:</strong> Buy items &gt; $2000, $5000, or $10000</li>
            <li><strong>Blacklist Risk:</strong> Use Cardholder Name "Blacklist User"</li>
            <li><strong>Location Jump:</strong> Use Cardholder Name "Traveler" to simulate impossible travel</li>
            <li><strong>OTP Abuse:</strong> Fail OTP verification 3 times</li>
          </ul>
        }
        type="info" 
        showIcon 
        style={{ marginBottom: 24 }} 
      />

      <Row gutter={[16, 16]}>
        {products.map(product => (
          <Col xs={24} sm={12} md={8} lg={6} key={product.id}>
            <Card
              hoverable
              cover={<img alt={product.name} src={product.image} style={{ height: 200, objectFit: 'cover' }} />}
              actions={[
                <Button type="primary" onClick={() => addToCart(product)}>Add to Cart</Button>
              ]}
            >
              <Card.Meta 
                title={product.name} 
                description={
                  <div>
                    <Tag color="blue" style={{ marginBottom: 8 }}>{product.category}</Tag>
                    <Title level={4} style={{ margin: 0 }}>${product.price.toFixed(2)}</Title>
                  </div>
                } 
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Cart Drawer */}
      <Drawer
        title={`Shopping Cart (${cart.length} items)`}
        placement="right"
        onClose={() => setCartVisible(false)}
        open={cartVisible}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>Total: ${cartTotal.toFixed(2)}</Title>
            <Button type="primary" size="large" disabled={cart.length === 0} onClick={() => setCheckoutVisible(true)}>
              Checkout
            </Button>
          </div>
        }
      >
        {cart.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          cart.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
              <div>
                <strong>{item.name}</strong>
                <div style={{ color: '#888' }}>{item.category}</div>
              </div>
              <div>${item.price.toFixed(2)}</div>
            </div>
          ))
        )}
      </Drawer>

      {/* Checkout Modal */}
      <Modal
        title="Secure Checkout"
        open={checkoutVisible}
        onCancel={() => setCheckoutVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCheckout}>
          <Form.Item name="cardName" label="Cardholder Name" rules={[{ required: true }]}>
            <Input prefix={<CreditCardOutlined />} placeholder="John Doe" />
          </Form.Item>
          <Form.Item name="cardNumber" label="Card Number" rules={[{ required: true, min: 16 }]}>
            <Input placeholder="1234 5678 9101 1121" maxLength={16} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="expiry" label="Expiry Date" rules={[{ required: true }]}>
                <Input placeholder="MM/YY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cvv" label="CVV" rules={[{ required: true }]}>
                <Input placeholder="123" maxLength={3} type="password" />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Pay ${cartTotal.toFixed(2)} Securely
          </Button>
          <div style={{ textAlign: 'center', marginTop: 16, color: '#52c41a' }}>
            <SafetyCertificateOutlined /> Protected by FraudNet AI
          </div>
        </Form>
      </Modal>

      {/* OTP Verification Modal */}
      <Modal
        title="Security Verification Required"
        open={otpVisible}
        closable={false}
        footer={null}
      >
        <Alert
          message="Medium Risk Transaction"
          description="We've detected unusual activity. Please verify your identity by entering the code sent to your phone. (Demo code: 123456)"
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
        <Form layout="vertical" onFinish={handleOtpSubmit}>
          <Form.Item name="otp" label="Enter 6-digit OTP" rules={[{ required: true, len: 6 }]}>
            <Input placeholder="123456" size="large" style={{ textAlign: 'center', letterSpacing: 8, fontSize: 24 }} maxLength={6} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Verify & Complete Order
          </Button>
        </Form>
      </Modal>

    </div>
  )
}

export default Shop
