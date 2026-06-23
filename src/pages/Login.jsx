import React, { useState } from 'react'
import { Form, Input, Button, Card, Checkbox, message } from 'antd'
import { LockOutlined, UserOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/api'
import './Login.css'

const Login = ({ setIsAuthenticated }) => {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [form] = Form.useForm()
  const navigate = useNavigate()

  const onFinish = async (values) => {
    setLoading(true)
    try {
      let result
      if (isSignUp) {
        result = await auth.register(values.email, values.password, values.name)
      } else {
        result = await auth.login(values.email, values.password)
      }

      if (result.error) {
        const errorMsg = typeof result.error === 'string' ? result.error : (result.error.message || 'Authentication failed')
        message.error(errorMsg)
        return
      }

      if (result.data?.user) {
        const userData = { ...result.data.user, token: result.data.token }
        localStorage.setItem('currentUser', JSON.stringify(userData))
        localStorage.setItem('auth_token', result.data.token)
        message.success(isSignUp ? 'Account created successfully!' : `Welcome back, ${userData.full_name || 'User'}!`)
        setIsAuthenticated(true)

        let redirectPath = '/dashboard'
        if (userData.role === 'customer') redirectPath = '/shop'
        else if (userData.role === 'merchant') redirectPath = '/transactions'
        else if (userData.role === 'analyst') redirectPath = '/alerts'

        navigate(redirectPath)
      }
    } catch (error) {
      message.error(error.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-bg">
      <div className="login-glow-right" />

      <div className="login-card-wrapper">
        <Card className="login-card">
          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon">F</div>
            <h1 className="login-title">FraudNet</h1>
            <p className="login-subtitle">AI-Powered Fraud Defense Platform</p>
          </div>

          {/* Demo Credentials */}
          {!isSignUp && (
            <div className="demo-credentials">
              <strong>🔑 Demo Credentials</strong>
              Admin: <code>admin@fraudnet.com</code> / <code>admin123</code><br />
              Analyst: <code>analyst@fraudnet.com</code> / <code>analyst123</code><br />
              Customer: <code>customer@fraudnet.com</code> / <code>customer123</code>
            </div>
          )}

          <Form form={form} layout="vertical" onFinish={onFinish} autoComplete="off">
            {isSignUp && (
              <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Please enter your name' }]}>
                <Input prefix={<UserOutlined />} placeholder="John Doe" size="large" />
              </Form.Item>
            )}

            <Form.Item
              name="email"
              label="Email Address"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="you@example.com" size="large" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
            </Form.Item>

            {!isSignUp && (
              <Form.Item name="remember" valuePropName="checked" initialValue={true}>
                <Checkbox style={{ color: 'var(--fn-text-muted)' }}>Keep me signed in</Checkbox>
              </Form.Item>
            )}

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                className="login-submit-btn"
              >
                {isSignUp ? 'Create Account' : 'Sign In to FraudNet'}
              </Button>
            </Form.Item>
          </Form>

          <div className="login-toggle-text">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <a onClick={() => { setIsSignUp(!isSignUp); form.resetFields() }}>
              {isSignUp ? 'Sign In' : 'Create Account'}
            </a>
          </div>
        </Card>

        <div className="login-footer">
          © 2026 FraudNet · AI-Powered Security · End-to-End Encrypted
        </div>
      </div>
    </div>
  )
}

export default Login
