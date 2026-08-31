'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { App, Typography, Form, Input, Button } from 'antd';
import { CircleUser, Key } from 'styled-icons/fa-solid';
import { LoginInput } from '@/models/schemas/admin';

const { Title } = Typography;

export default function AdminLogin() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);

  const onLogin = async (values: LoginInput) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const result = await res.json();

      if (!res.ok) {
        const fields = Object.entries(result.errors || {}).map(([name, message]) => ({
          name: [name],
          errors: [String(message)],
        }));

        form.setFields(fields);
        throw new Error(result.message || '登入失敗，請檢查帳號密碼');
      }

      message.success('登入成功');
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      message.error(err instanceof Error ? err.message : '伺服器發生錯誤');
    }
    setLoading(false);
  };

  return (
    <Wrapper>
      <div className="container">
        <LoginCard>
          <Title level={2} className="title">
            後台系統
          </Title>
          <Form form={form} size="large" onFinish={onLogin}>
            <Form.Item name="username" rules={[{ required: true, message: '請輸入帳號' }]}>
              <Input placeholder="帳號" prefix={<CircleUser size={16} color="var(--primary-color)" />} />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '請輸入密碼' }]}>
              <Input.Password placeholder="密碼" prefix={<Key size={16} color="var(--primary-color)" />} />
            </Form.Item>
            <Button type="primary" htmlType="submit" block style={{ marginTop: 24 }} loading={loading}>
              登入
            </Button>
          </Form>
        </LoginCard>
      </div>
    </Wrapper>
  );
}

const Wrapper = styled.main`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const LoginCard = styled.div`
  width: 100%;
  max-width: 400px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  margin: auto;
  padding: 40px;

  & > .title {
    text-align: center;
    margin-bottom: 24px;
  }

  & .ant-input-prefix {
    margin-inline-end: 8px;
  }
`;
