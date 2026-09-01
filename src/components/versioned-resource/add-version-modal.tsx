'use client';

import { useEffect } from 'react';
import { Modal, Form, InputNumber, DatePicker, Input } from 'antd';
import dayjs from 'dayjs';

export interface VersionField {
  name: string;
  label: string;
  type: 'number' | 'percent' | 'text';
  required?: boolean;
}

export default function AddVersionModal({
  open,
  title,
  fields,
  submitting,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  title: string;
  fields: VersionField[];
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => void;
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({ effectiveDate: dayjs() });
    }
  }, [open, form]);

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      confirmLoading={submitting}
      onOk={() => {
        form.validateFields().then((values) => {
          onSubmit({
            ...values,
            effectiveDate: (values.effectiveDate as dayjs.Dayjs).toISOString(),
          });
        });
      }}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="effectiveDate" label="生效日期" rules={[{ required: true, message: '請選擇生效日期' }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        {fields.map((field) => (
          <Form.Item
            key={field.name}
            name={field.name}
            label={field.label}
            rules={field.required ? [{ required: true, message: `請輸入${field.label}` }] : []}
          >
            {field.type === 'text' ? (
              <Input />
            ) : (
              <InputNumber style={{ width: '100%' }} min={0} max={field.type === 'percent' ? 100 : undefined} addonAfter={field.type === 'percent' ? '%' : undefined} />
            )}
          </Form.Item>
        ))}
        <Form.Item name="note" label="備註">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
