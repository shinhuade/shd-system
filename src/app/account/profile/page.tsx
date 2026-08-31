'use client';

import { useEffect, useState } from 'react';
import { Typography, Form, Input, Button, Card, App } from 'antd';
import ImageUpload from '@/components/widgets/image-upload';
import { profileUpdateInput } from '@/models/schemas/user';

const { Title } = Typography;

interface FormImageUploadProps {
  value?: File | string;
  onChange?: (value: string | File) => void;
}

function FormImageUpload({ value, onChange }: FormImageUploadProps) {
  return <ImageUpload value={value} onChange={onChange ?? (() => {})} circle />;
}

export default function AccountProfilePage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<profileUpdateInput>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialData, setInitialData] = useState<profileUpdateInput | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/user/profile', { method: 'GET' });
        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(result?.message || '取得個人資料失敗');
        }

        if (!mounted) return;

        const profile = {
          name: result?.data?.name || '',
          email: result?.data?.email || '',
          avatar: result?.data?.avatar || '',
        } as profileUpdateInput;

        setInitialData(profile);
        form.setFieldsValue(profile);
      } catch (err: unknown) {
        console.error(err);
        message.error(err instanceof Error ? err.message : '伺服器發生錯誤');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [form, message]);

  const onSubmit = async (values: profileUpdateInput) => {
    try {
      if (!initialData) return;

      const changedData: Record<string, unknown> = {};
      (['name', 'email', 'avatar'] as const).forEach((key) => {
        const next = values[key];
        const prev = initialData[key];
        if ((next as unknown) instanceof File || next !== prev) {
          changedData[key] = next;
        }
      });

      if (Object.keys(changedData).length === 0) {
        message.info('沒有需要更新的欄位');
        return;
      }

      setSaving(true);

      const hasFile = Object.values(changedData).some((value) => value instanceof File);
      const response = await (async () => {
        if (hasFile) {
          const formData = new FormData();
          Object.entries(changedData).forEach(([key, value]) => {
            if (value instanceof File) {
              formData.append(key, value);
              return;
            }
            if (value !== undefined && value !== null) {
              formData.append(key, String(value));
            }
          });

          return fetch('/api/user/profile', {
            method: 'PATCH',
            body: formData,
          });
        }

        return fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changedData),
        });
      })();

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        if (result?.errors && typeof result.errors === 'object') {
          const errorFields = Object.entries(result.errors)
            .filter(([, messages]) => Array.isArray(messages) && messages.length > 0)
            .map(([name, messages]) => ({
              name: name as 'name' | 'email' | 'avatar',
              errors: (messages as unknown[]).filter((msg): msg is string => typeof msg === 'string'),
            }));

          if (errorFields.length > 0) {
            form.setFields(errorFields);
            return;
          }
        }

        throw new Error(result?.message || '更新失敗');
      }

      const latest = {
        name: result?.data?.name || values.name,
        email: result?.data?.email || values.email,
        avatar: result?.data?.avatar ?? values.avatar ?? '',
      } as profileUpdateInput;

      setInitialData(latest);
      form.setFieldsValue(latest);
      message.success('更新成功');
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
        個人資料
      </Title>

      <Card variant="borderless" loading={loading}>
        <Form<profileUpdateInput> form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item label="頭像" name="avatar" style={{ maxWidth: 150 }}>
            <FormImageUpload />
          </Form.Item>

          <Form.Item
            label="名稱"
            name="name"
            rules={[
              { required: true, message: '請輸入名稱' },
              { max: 20, message: '名稱不能超過 20 個字元' },
            ]}
          >
            <Input placeholder="名稱" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: '請輸入 Email' },
              { type: 'email', message: 'Email 格式不正確' },
            ]}
          >
            <Input placeholder="Email" />
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={saving}>
            儲存變更
          </Button>
        </Form>
      </Card>
    </section>
  );
}
