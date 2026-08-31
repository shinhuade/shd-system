'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AdminConfig } from '@/types/admin-config';
import styled from 'styled-components';
import { Typography, Space, Button, App } from 'antd';
import Form from '@rjsf/antd';
import validator from '@rjsf/validator-ajv8';
import { RJSFSchema, UiSchema, RJSFValidationError } from '@rjsf/utils';
import ImageUpload from './widgets/image-upload';

const { Title } = Typography;

const widgets = {
  ImageUpload: ImageUpload,
};

interface AdminGenericFormProps {
  config: AdminConfig;
  id: string;
}

type FormRecord = Record<string, unknown>;

export const getChangeValues = (current: FormRecord, initial?: FormRecord) => {
  if (!initial) return current;

  const change: FormRecord = {};
  Object.keys(current).forEach((key) => {
    const val = current[key];
    const oldVal = initial[key];

    if (val instanceof File || val !== oldVal) {
      change[key] = val;
    }
  });

  return change;
};

export function objectToFormData(
  obj: FormRecord,
  formData: FormData = new FormData(),
  parentKey: string | null = null,
) {
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    const value = obj[key];
    const formKey = parentKey ? `${parentKey}[${key}]` : key;

    if (value instanceof File) {
      formData.append(formKey, value);
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      objectToFormData(value as FormRecord, formData, formKey);
    } else if (value !== undefined && value !== null) {
      formData.append(formKey, String(value));
    }
  }

  return formData;
}

export function hasFile(obj: FormRecord | null | undefined): boolean {
  if (!obj) return false;

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    const value = obj[key];
    if (value instanceof File) return true;
    if (typeof value === 'object' && value !== null && hasFile(value as FormRecord)) return true;
  }

  return false;
}

const transformSchema = (schema: RJSFSchema = {}, uiSchema: UiSchema = {}, mode: string) => {
  const newSchema = JSON.parse(JSON.stringify(schema));
  if (!newSchema.required) return newSchema;

  // 找出所有在當前 mode 下被隱藏的欄位 Key
  const hiddenFields = Object.keys(uiSchema).filter((key) => {
    return uiSchema[key]?.['ui:hiddenOn']?.includes(mode);
  });

  // 過濾掉掉隱藏欄位
  newSchema.required = newSchema.required.filter((fieldKey: string) => !hiddenFields.includes(fieldKey));

  return newSchema;
};

const transformUiSchema = (uiSchema: UiSchema = {}, mode: string) => {
  const result = JSON.parse(JSON.stringify(uiSchema)); // 深拷貝

  Object.keys(result).forEach((key) => {
    const fieldConfig = result[key];

    // 處理禁用邏輯
    if (fieldConfig['ui:disabledOn']?.includes(mode)) {
      result[key] = { ...fieldConfig, 'ui:disabled': true };
    }

    // 處理隱藏邏輯
    if (fieldConfig['ui:hiddenOn']?.includes(mode)) {
      result[key] = { ...fieldConfig, 'ui:classNames': 'completely-hidden-field' };
    }
  });

  return result;
};

export default function AdminGenericForm({ config, id }: AdminGenericFormProps) {
  const { name, formSpec, collection, path } = config;
  const { message } = App.useApp();
  const router = useRouter();

  const [formData, setFormData] = useState<FormRecord>();
  const [initialData, setInitialData] = useState<FormRecord>();
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      if (id === 'create') return;

      const resp = await fetch(`/api/generic/${collection}/${id}`, { method: 'GET' });

      const { data } = await resp.json();

      return data;
    } catch (err) {
      console.error(err);
    }
  }, [collection, id]);

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      const data = await fetchData();

      if (mounted && data) {
        setFormData(data);
        setInitialData(data);
      }
    };

    setup();

    return () => {
      mounted = false;
    };
  }, [fetchData]);

  const onSubmit = async ({ formData: nextData }: { formData?: FormRecord }) => {
    if (!nextData) {
      message.warning('表單資料為空');
      return;
    }

    const isCreateMode = id === 'create';

    const submitData = isCreateMode
      ? Object.entries(getChangeValues(nextData)).reduce<FormRecord>((acc, [key, value]) => {
          if (value === undefined || value === null || value === '') return acc;
          acc[key] = value;
          return acc;
        }, {})
      : getChangeValues(nextData, initialData);

    if (!isCreateMode && Object.keys(submitData).length === 0) {
      message.info('沒有需要更新的欄位');
      return;
    }

    const endpoint = isCreateMode
      ? ['user', 'admin'].includes(collection)
        ? `/api/${collection}/register`
        : `/api/generic/${collection}/create`
      : `/api/generic/${collection}/${id}`;

    const method = isCreateMode ? 'POST' : 'PATCH';
    const failText = isCreateMode ? '新增失敗' : '更新失敗';
    const successText = isCreateMode ? '新增成功' : '更新成功';

    try {
      setSubmitting(true);

      if (!isCreateMode && collection === 'admin') {
        const resetPassword = typeof submitData.resetPassword === 'string' ? submitData.resetPassword : '';
        const confirmPassword = typeof submitData.confirmPassword === 'string' ? submitData.confirmPassword : '';

        if (resetPassword || confirmPassword) {
          if (!resetPassword || !confirmPassword) {
            message.error('請完整輸入重設密碼與確認密碼');
            return;
          }

          const resetResponse = await fetch(`/api/admin/${id}/reset-password`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: resetPassword, confirmPassword }),
          });

          const resetResult = await resetResponse.json().catch(() => null);
          if (!resetResponse.ok) {
            message.error(resetResult?.message || '重設密碼失敗');
            return;
          }

          delete submitData.resetPassword;
          delete submitData.confirmPassword;

          // 僅重設密碼，不需要再呼叫一般 PATCH
          if (Object.keys(submitData).length === 0) {
            message.success('密碼重設成功');
            router.push(`/admin/${path}`);
            return;
          }
        }
      }

      const response = await fetch(endpoint, {
        method,
        ...(hasFile(submitData)
          ? { body: objectToFormData(submitData) }
          : {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(submitData),
            }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        message.error(result?.message || failText);
        return;
      }

      if (!isCreateMode) {
        const latestData = (result?.data || { ...initialData, ...submitData }) as FormRecord;
        setInitialData(latestData);
        setFormData(latestData);
      }

      message.success(successText);
      router.push(`/admin/${path}`);
    } catch (err) {
      console.error(err);
      message.error(failText);
    } finally {
      setSubmitting(false);
    }
  };

  const onChange = (event: { formData?: FormRecord }) => {
    if (!event.formData) return;
    setFormData(event.formData);
  };

  const transformErrors = (errors: RJSFValidationError[]) => {
    return errors.map((error) => {
      if (error.name === 'required') {
        error.message = '此欄位為必填項目';
      }
      return error;
    });
  };

  const formUiSchema = useMemo(() => {
    return transformUiSchema(formSpec?.uiSchema, id === 'create' ? 'create' : 'edit');
  }, [id, formSpec]);

  const formSchema = useMemo(() => {
    return transformSchema(formSpec?.schema, formSpec?.uiSchema, id === 'create' ? 'create' : 'edit');
  }, [id, formSpec]);

  return (
    <Wrapper>
      <Title level={3} style={{ marginBottom: 24 }}>
        {id === 'create' ? '新增' : '編輯'}
        {name}
      </Title>
      <Form
        formData={formData}
        schema={formSchema || {}}
        uiSchema={formUiSchema || {}}
        validator={validator}
        widgets={widgets}
        transformErrors={transformErrors}
        onChange={onChange}
        onSubmit={onSubmit}
      >
        <Space style={{ marginTop: 20, width: '100%', justifyContent: 'flex-end' }}>
          <Button
            onClick={() => {
              router.back();
            }}
          >
            取消
          </Button>
          <Button type="primary" htmlType="submit">
            {submitting ? '儲存中...' : '儲存'}
          </Button>
        </Space>
      </Form>
    </Wrapper>
  );
}

const Wrapper = styled.section`
  padding: 32px;
  background: #fff;
  min-height: 100%;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  & .ant-upload-wrapper.ant-upload-picture-card-wrapper,
  & .img-container {
    width: 150px !important;
    max-width: 150px;
  }

  fieldset {
    border: none !important;
    padding: 0 !important;
    margin: 0 !important;
  }
`;
