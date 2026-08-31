'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { App, Layout, Image, Menu, Button, FloatButton } from 'antd';
import { User, GaugeHigh, ArrowRightFromBracket, List, Key } from '@styled-icons/fa-solid';

const { Content, Sider: AntdSider } = Layout;

const siderWidth = 240;
const menuItems = [
  { label: '儀表板', key: '/admin', icon: <GaugeHigh size={16} /> },
  // { label: '會員管理', key: '/admin/user', icon: <User size={16} /> },
  { label: '帳號安全', key: '/admin/security', icon: <Key size={16} /> },
];

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { message } = App.useApp();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobileSiderOpen, setMobileSiderOpen] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 992px)');

    const syncLayout = () => {
      const mobile = mediaQuery.matches;
      setIsMobile(mobile);
      setMobileSiderOpen(!mobile);
    };

    syncLayout();
    mediaQuery.addEventListener('change', syncLayout);

    return () => {
      mediaQuery.removeEventListener('change', syncLayout);
    };
  }, []);

  const siderVisible = !isMobile || mobileSiderOpen;

  const onLogout = async () => {
    try {
      const res = await fetch('/api/admin/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || '登入失敗，請檢查帳號密碼');
      }

      message.success('已登出');
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      message.error(err instanceof Error ? err.message : '伺服器發生錯誤');
    }
  };

  return (
    <Layout>
      <Sider width={siderWidth} $visible={siderVisible} className={isMobile ? 'is-mobile' : ''}>
        <Image src="/logo.png" alt="logo" preview={false} className="top" />
        <Menu
          className="menu"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => {
            router.push(key);
            if (isMobile) {
              setMobileSiderOpen(false);
            }
          }}
        />
        <div className="bottom">
          <Button color="danger" variant="solid" block icon={<ArrowRightFromBracket size={16} />} onClick={onLogout}>
            登出
          </Button>
        </div>
      </Sider>
      <Layout
        style={{
          marginLeft: isMobile ? 0 : siderWidth,
          background: '#fafafa',
          transition: 'margin-left 0.2s',
        }}
      >
        <Content style={{ padding: 32 }}>{children}</Content>
      </Layout>
      {isMobile && siderVisible && <Backdrop onClick={() => setMobileSiderOpen(false)} />}
      {isMobile && (
        <FloatButton
          type="primary"
          icon={<List size={20} />}
          style={{ width: 50, height: 'auto', aspectRatio: '1/1' }}
          onClick={() => setMobileSiderOpen((prev) => !prev)}
        ></FloatButton>
      )}
    </Layout>
  );
}

const Sider = styled(AntdSider)<{ $visible: boolean }>`
  && {
    height: 100dvh;
    padding: 32px 16px;
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.05);
    position: fixed;
    left: 0;
    top: 0;
    z-index: 999;
    transform: ${({ $visible = false }) => ($visible ? 'translateX(0)' : 'translateX(-100%)')};

    /* 只有當 is-mobile 類名存在時，才啟用過渡動畫 */
    &.is-mobile {
      transition: transform 0.25s ease;
    }

    /* 手機版初始狀態強制收起，防止 SSR 渲染出展開的樣式 */
    @media (max-width: 992px) {
      &:not(.is-mobile) {
        transform: translateX(-100%);
        transition: none;
      }
    }

    .ant-layout-sider-children {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .top {
      max-width: 120px;
      display: block;
      margin: auto;
    }

    .menu {
      flex: 1;
      border: none;
      overflow-x: hidden;
      margin-top: 24px;

      /* 優化捲動條外觀 (選配) */
      &::-webkit-scrollbar {
        width: 1px;
      }
      &::-webkit-scrollbar-thumb {
        background: var(--primary-color);
        border-radius: 10px;
      }
    }
  }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.24);
  z-index: 996;
`;
