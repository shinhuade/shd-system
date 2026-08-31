'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styled from 'styled-components';
import { Typography, Form, Input, Button, App } from 'antd';
import { CircleUser, Key, Signature, Envelope } from 'styled-icons/fa-solid';
import ImageUpload from '@/components/widgets/image-upload';

const { Title, Text } = Typography;

interface RegisterFormValues {
  username: string;
  password: string;
  confirmPassword: string;
  name: string;
  email: string;
  avatar?: File | string;
}

const REGISTER_FIELD_KEYS: Array<keyof RegisterFormValues> = [
  'username',
  'password',
  'confirmPassword',
  'name',
  'email',
  'avatar',
];

interface FormImageUploadProps {
  value?: File | string;
  onChange?: (value: string | File) => void;
}

function FormImageUpload({ value, onChange }: FormImageUploadProps) {
  return <ImageUpload value={value} onChange={onChange ?? (() => {})} circle />;
}

export default function RegisterPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<RegisterFormValues>();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setLoading(true);

      const avatarFile = values.avatar instanceof File ? values.avatar : undefined;
      const restValues = {
        username: values.username,
        password: values.password,
        confirmPassword: values.confirmPassword,
        name: values.name,
        email: values.email,
      };

      const response = await (async () => {
        if (avatarFile) {
          const formData = new FormData();
          Object.entries(restValues).forEach(([key, value]) => {
            formData.append(key, value);
          });
          formData.append('avatar', avatarFile);

          return fetch('/api/user/register', {
            method: 'POST',
            body: formData,
          });
        }

        return fetch('/api/user/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(restValues),
        });
      })();

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        if (result?.errors && typeof result.errors === 'object') {
          const errorFields = Object.entries(result.errors)
            .filter(([name, messages]) => {
              return (
                REGISTER_FIELD_KEYS.includes(name as keyof RegisterFormValues) &&
                Array.isArray(messages) &&
                messages.length > 0
              );
            })
            .map(([name, messages]) => ({
              name: name as keyof RegisterFormValues,
              errors: (messages as unknown[]).filter((msg): msg is string => typeof msg === 'string'),
            }));

          if (errorFields.length > 0) {
            form.setFields(errorFields);
            return;
          }
        }

        throw new Error(result?.message || '註冊失敗');
      }

      message.success('註冊成功，請登入');
      router.push('/login');
    } catch (err: unknown) {
      console.error(err);
      message.error(err instanceof Error ? err.message : '伺服器發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Wrapper className="has-header">
      <section>
        <div className="container">
          <RegisterCard>
            <Title level={2} className="title">
              會員註冊
            </Title>

            <Form<RegisterFormValues> form={form} size="large" layout="vertical" onFinish={onSubmit}>
              <Form.Item
                name="username"
                label="帳號"
                rules={[
                  { required: true, message: '請輸入帳號' },
                  { min: 3, message: '帳號至少需要 3 個字元' },
                  { max: 20, message: '帳號不能超過 20 個字元' },
                  { pattern: /^[a-zA-Z0-9]+$/, message: '帳號只能包含英文和數字' },
                ]}
              >
                <Input placeholder="帳號" prefix={<CircleUser size={16} color="var(--ant-color-border)" />} />
              </Form.Item>

              <Form.Item
                name="name"
                label="名稱"
                rules={[
                  { required: true, message: '請輸入名稱' },
                  { max: 20, message: '名稱不能超過 20 個字元' },
                ]}
              >
                <Input placeholder="名稱" prefix={<Signature size={16} color="var(--ant-color-border)" />} />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: '請輸入 Email' },
                  { type: 'email', message: 'Email 格式不正確' },
                ]}
              >
                <Input placeholder="Email" prefix={<Envelope size={16} color="var(--ant-color-border)" />} />
              </Form.Item>

              <Form.Item
                name="password"
                label="密碼"
                rules={[
                  { required: true, message: '請輸入密碼' },
                  { min: 6, message: '密碼至少需要 6 個字元' },
                  { pattern: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]+$/, message: '密碼必須包含英文字母與數字' },
                ]}
              >
                <Input.Password placeholder="密碼" prefix={<Key size={16} color="var(--ant-color-border)" />} />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="確認密碼"
                dependencies={['password']}
                rules={[
                  { required: true, message: '請再次輸入密碼' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('兩次輸入的密碼不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="確認密碼" prefix={<Key size={16} color="var(--ant-color-border)" />} />
              </Form.Item>

              <Form.Item name="avatar" label="頭像 (選填)" style={{ maxWidth: 150 }}>
                <FormImageUpload />
              </Form.Item>

              <Button type="primary" htmlType="submit" block loading={loading} style={{ marginTop: 8 }}>
                註冊
              </Button>
            </Form>

            <div className="footer-tip">
              <Text type="secondary">已有帳號？</Text>
              <Link href="/login">立即登入</Link>
            </div>
          </RegisterCard>
        </div>
      </section>
    </Wrapper>
  );
}

const Wrapper = styled.main`
  & > section {
    padding: 90px 0;
  }
`;

const RegisterCard = styled.div`
  width: 100%;
  max-width: 520px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
  margin: auto;
  padding: 32px;

  & > .title {
    text-align: center;
    margin-bottom: 20px;
  }

  & .ant-input-prefix {
    margin-inline-end: 8px;
  }

  & .footer-tip {
    margin-top: 16px;
    display: flex;
    justify-content: center;
    gap: 8px;
  }
`;
