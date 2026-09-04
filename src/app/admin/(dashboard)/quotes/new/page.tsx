'use client';

import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { Button } from 'antd';
import PageHeader from '@/components/page-header';

/**
 * 智慧報價首頁：只提供兩個入口，成本管理留在後台，報價畫面保持簡單。
 */
const MODES = [
  {
    key: 'quick',
    icon: '⚡',
    title: '快速報價',
    subtitle: '尺寸＋面數＋單價',
    description: '已知一才／一尺單價時，10～20 秒算出報價，適合電話、LINE 與現場詢價',
    action: '開始報價',
    href: '/admin/quotes/new/quick',
  },
  {
    key: 'precise',
    icon: '📊',
    title: '精算報價',
    subtitle: '使用最新成本模型',
    description: '自動帶入每月成本與生產資料，算出實際成本、目標毛利率與建議報價',
    action: '開始精算',
    href: '/admin/quotes/new/precise',
  },
];

export default function SmartQuoteHomePage() {
  const router = useRouter();

  return (
    <section>
      <PageHeader title="智慧報價" description="選擇報價方式" />

      <ModeGrid>
        {MODES.map((mode) => (
          <ModeCard key={mode.key} onClick={() => router.push(mode.href)}>
            <div className="icon">{mode.icon}</div>
            <h2>{mode.title}</h2>
            <p className="subtitle">{mode.subtitle}</p>
            <p className="description">{mode.description}</p>
            <Button type="primary" size="large" block>
              {mode.action}
            </Button>
          </ModeCard>
        ))}
      </ModeGrid>
    </section>
  );
}

const ModeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  max-width: 900px;
`;

const ModeCard = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 28px 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  display: flex;
  flex-direction: column;
  gap: 6px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  }

  .icon {
    font-size: 40px;
    line-height: 1;
  }

  h2 {
    font-size: 24px;
    color: var(--primary-color);
  }

  .subtitle {
    font-size: 15px;
    color: rgba(0, 0, 0, 0.65);
  }

  .description {
    font-size: 13px;
    line-height: 1.6;
    color: rgba(0, 0, 0, 0.45);
    margin-bottom: 16px;
    flex: 1;
  }

  .ant-btn {
    height: 48px;
    font-size: 16px;
  }

  @media (max-width: 768px) {
    padding: 20px 16px;

    .icon {
      font-size: 32px;
    }

    h2 {
      font-size: 20px;
    }
  }
`;
