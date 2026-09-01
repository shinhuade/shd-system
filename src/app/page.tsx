import styled, { keyframes } from 'styled-components';
import Link from 'next/link';
import { Button } from 'antd';

export default function Home() {
  return (
    <main className="has-header">
      <HeroSection>
        <div className="container">
          <p className="eyebrow">興樺德</p>
          <h1 className="title">把你的產品首頁，從樣板升級成可上線的第一印象。</h1>
          <p className="description">
            這份起始專案已經整理好骨架與元件節奏，你可以直接把重心放在功能開發， 同時保有品牌感與可維護性。
          </p>
          <div className="actions">
            <Link href="/admin">
              <Button type="primary" size="large">
                前往後台
              </Button>
            </Link>
            <Link href="/docs/api">
              <Button size="large">API Docs</Button>
            </Link>
          </div>
        </div>
      </HeroSection>
    </main>
  );
}

const riseIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(18px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const HeroSection = styled.section`
  padding: 90px 0;

  & > .container {
    max-width: 820px;
    animation: ${riseIn} 0.8s ease-out both;
  }

  & .eyebrow {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    letter-spacing: 0.22em;
    font-weight: 700;
    margin-bottom: 24px;

    &::before {
      content: '';
      width: 18px;
      height: 2px;
      background: currentColor;
    }
  }

  & .title {
    font-family: var(--font-display), 'Noto Sans TC', sans-serif;
    font-size: clamp(32px, 5.4vw, 62px);
    line-height: 1.1;
  }

  & .description {
    margin-top: 22px;
    font-size: clamp(16px, 2.1vw, 20px);
    line-height: 1.8;
  }

  & .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 34px;
    justify-content: center;

    @media (min-width: 576px) {
      justify-content: flex-start;
    }
  }
`;
