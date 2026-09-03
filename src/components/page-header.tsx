'use client';

import { ReactNode } from 'react';
import styled from 'styled-components';

/**
 * 各頁共用的標題區塊。
 * 手機版會縮小標題字級，並讓操作按鈕自動撐滿整行方便點按。
 */
export default function PageHeader({
  title,
  description,
  extra,
}: {
  title: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <Wrapper>
      <div className="text">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {extra && <div className="extra">{extra}</div>}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;

  .text {
    min-width: 0;
  }

  h1 {
    font-size: 28px;
    line-height: 1.3;
    margin-bottom: 8px;
  }

  p {
    color: rgba(0, 0, 0, 0.45);
  }

  .extra {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  @media (max-width: 768px) {
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 16px;

    h1 {
      font-size: 20px;
      margin-bottom: 4px;
    }

    p {
      font-size: 13px;
      line-height: 1.5;
    }

    .extra {
      width: 100%;

      /* 手機上操作按鈕平均分配整行寬度，避免小到點不到 */
      > * {
        flex: 1 1 0;
        min-width: 0;
      }

      .ant-btn {
        width: 100%;
        height: 40px;
      }
    }
  }
`;
