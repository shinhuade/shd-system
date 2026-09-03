import { useEffect, useMemo, useState, FC } from 'react';
import { Upload, Image as AntdImg } from 'antd';
import Image from 'next/image';
import ImgCrop from 'antd-img-crop';
import { PlusOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type { RcFile } from 'antd/es/upload';

// 1. 定義 Props 介面
interface ImageUploadProps {
  value?: string | File | null;
  onChange: (value: string | File) => void;
  readonly?: boolean;
  disabled?: boolean;
  aspectRatio?: string;
  circle?: boolean;
}

const ImageUpload: FC<ImageUploadProps> = (props) => {
  const { value, onChange, readonly, disabled, aspectRatio = '1 / 1', circle = false } = props;
  const [previewOpen, setPreviewOpen] = useState(false);

  const resolvedCropAspect = useMemo(() => {
    if (circle) return 1;

    const [w, h] = aspectRatio.replace(/\s+/g, '').split('/').map(Number);
    if (Number.isFinite(w) && Number.isFinite(h) && h > 0) {
      return w / h;
    }

    return 1;
  }, [circle, aspectRatio]);

  // 2. 處理預覽 URL，確保型別安全
  const previewUrl = useMemo(() => {
    if (value instanceof File) {
      return URL.createObjectURL(value);
    } else if (typeof value === 'string' && value) {
      return value;
    }
    return null;
  }, [value]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 3. 修正 Antd ImgCrop 的 callback 型別
  const beforeUpload = (file: File | RcFile): boolean => {
    onChange(file);
    return false; // 阻止自動上傳
  };

  const handleRemove = () => {
    onChange('');
  };

  const handlePreview = () => {
    if (previewUrl) {
      setPreviewOpen(true);
    }
  };

  const uploadButton = (
    <button
      style={{
        border: 0,
        background: 'none',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled || readonly ? 'not-allowed' : 'pointer',
      }}
      type="button"
      disabled={disabled || readonly}
    >
      <PlusOutlined style={{ color: 'var(--primary-color)' }} />
      <div style={{ marginTop: 8, color: 'var(--primary-color)' }}>上傳</div>
    </button>
  );

  return (
    <Wrapper $aspectRatio={aspectRatio} $circle={circle}>
      {/* 隱藏的 Antd Image 用於大圖預覽控制 */}
      <div style={{ display: 'none' }}>
        {previewUrl ? (
          <AntdImg
            src={previewUrl}
            preview={{
              open: previewOpen,
              onOpenChange: (visible) => setPreviewOpen(visible),
            }}
          />
        ) : null}
      </div>

      {previewUrl ? (
        <div className="img-container">
          <Image
            loading="eager"
            fill
            src={previewUrl}
            alt="preview"
            unoptimized={previewUrl.startsWith('blob:')} // 如果是本地預覽，跳過 Next.js 優化
          />
          <div className="actions">
            <EyeOutlined className="icon" style={{ color: 'white' }} onClick={handlePreview} />
            {!readonly && !disabled && (
              <DeleteOutlined className="icon" style={{ color: 'white' }} onClick={handleRemove} />
            )}
          </div>
        </div>
      ) : (
        <ImgCrop
          aspect={resolvedCropAspect}
          cropShape={circle ? 'round' : 'rect'}
          modalTitle="裁切圖片"
          onModalOk={(file) => beforeUpload(file as File)}
        >
          <Upload
            accept="image/*"
            listType="picture-card"
            showUploadList={false}
            disabled={disabled || readonly}
            style={{ borderRadius: circle ? '50%' : 8 }}
            maxCount={1}
            // 由於使用 ImgCrop 的 onModalOk，這裡不需重複定義 beforeUpload
          >
            {uploadButton}
          </Upload>
        </ImgCrop>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div<{ $aspectRatio: string; $circle: boolean }>`
  width: 100%;

  & .ant-upload-wrapper.ant-upload-picture-card-wrapper {
    width: 100%;
    display: block;
  }

  & .ant-upload-wrapper,
  & .ant-upload-wrapper .ant-upload {
    width: 100%;
    aspect-ratio: ${(props) => props.$aspectRatio};
    border-radius: ${(props) => (props.$circle ? '50%' : '8px')};
    overflow: hidden;
  }

  & .ant-upload-wrapper.ant-upload-picture-card-wrapper .ant-upload.ant-upload-select {
    width: 100%;
    height: auto;
  }

  & .ant-upload-wrapper.ant-upload-picture-card-wrapper .ant-upload.ant-upload-select > div {
    width: 100%;
    height: 100%;
  }

  & .ant-upload-wrapper .ant-upload {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .img-container {
    position: relative;
    width: 100%;
    aspect-ratio: ${(props) => props.$aspectRatio};
    border-radius: ${(props) => (props.$circle ? '50%' : '8px')};
    overflow: hidden;
    border: 1px solid #d9d9d9;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .actions {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      opacity: 0;
      transition: opacity 0.3s;

      .icon {
        font-size: 20px;
        cursor: pointer;
        transition: color 0.3s;
        &:hover {
          color: var(--primary-color) !important;
        }
      }
    }

    &:hover .actions {
      opacity: 1;
    }
  }
`;

export default ImageUpload;
