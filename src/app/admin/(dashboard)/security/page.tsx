'use client';

import { useState } from 'react';
import { Card, Form, Input, Button, Typography, App } from 'antd';
import { passwordUpdateInput } from '@/models/schemas/admin';

const { Title } = Typography;

const SECURITY_FIELD_KEYS: Array<keyof passwordUpdateInput> = ['currentPassword', 'newPassword', 'confirmPassword'];

export default function AccountSecurityPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<passwordUpdateInput>();
  const [saving, setSaving] = useState(false);

  const onSubmit = async (values: passwordUpdateInput) => {
    try {
      setSaving(true);

      const response = await fetch('/api/admin/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        if (result?.errors && typeof result.errors === 'object') {
          const errorFields = Object.entries(result.errors)
            .filter(([name, messages]) => {
              return (
                SECURITY_FIELD_KEYS.includes(name as keyof passwordUpdateInput) &&
                Array.isArray(messages) &&
                messages.length > 0
              );
            })
            .map(([name, messages]) => ({
              name: name as keyof passwordUpdateInput,
              errors: (messages as unknown[]).filter((msg): msg is string => typeof msg === 'string'),
            }));

          if (errorFields.length > 0) {
            form.setFields(errorFields);
            return;
          }
        }

        throw new Error(result?.message || '修改密碼失敗');
      }

      form.resetFields();
      message.success('密碼修改成功');
    } catch (err: unknown) {
      console.error(err);
      message.error(err instanceof Error ? err.message : '伺服器發生錯誤');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <Title level={3} style={{ marginBottom: 16 }}>
        帳號安全
      </Title>

      <Card variant="borderless" style={{ maxWidth: 600 }}>
        <Form<passwordUpdateInput> form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item label="目前密碼" name="currentPassword" rules={[{ required: true, message: '請輸入目前密碼' }]}>
            <Input.Password placeholder="請輸入目前密碼" />
          </Form.Item>

          <Form.Item
            label="新密碼"
            name="newPassword"
            rules={[
              { required: true, message: '請輸入新密碼' },
              { min: 6, message: '密碼至少需要 6 個字元' },
              { pattern: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]+$/, message: '密碼必須包含英文字母與數字' },
            ]}
          >
            <Input.Password placeholder="請輸入新密碼" />
          </Form.Item>

          <Form.Item
            label="確認新密碼"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '請再次輸入新密碼' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('兩次輸入的密碼不一致'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="請再次輸入新密碼" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={saving}>
            更新密碼
          </Button>
        </Form>
      </Card>
    </section>
  );
}
