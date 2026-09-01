'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { App, Layout, Image, Menu, Button, FloatButton } from 'antd';
import {
  GaugeHigh,
  ArrowRightFromBracket,
  List,
  Key,
  Calculator,
  Warehouse,
  Flask,
  Box,
  Bolt,
  Coins,
  ChartLine,
  ChartPie,
  Users,
  FileInvoiceDollar,
  Calendar,
  Gear,
} from '@styled-icons/fa-solid';

const { Content, Sider: AntdSider } = Layout;

const siderWidth = 260;
const menuItems = [
  { label: 'Dashboard', key: '/admin', icon: <GaugeHigh size={16} /> },
  { label: '智慧報價', key: '/admin/quotes/new', icon: <Calculator size={16} /> },
  {
    label: '主檔管理',
    key: 'master-data',
    icon: <Warehouse size={16} />,
    children: [
      { label: '粉料管理', key: '/admin/materials', icon: <Flask size={16} /> },
      { label: '包材管理', key: '/admin/packaging', icon: <Box size={16} /> },
      { label: '水電瓦斯', key: '/admin/utilities', icon: <Bolt size={16} /> },
      { label: '成本管理', key: '/admin/cost-management', icon: <Coins size={16} /> },
    ],
  },
  {
    label: '分析報表',
    key: 'analysis',
    icon: <ChartLine size={16} />,
    children: [
      { label: '產品分析', key: '/admin/product-analysis', icon: <ChartPie size={16} /> },
      { label: '客戶分析', key: '/admin/customer-analysis', icon: <Users size={16} /> },
      { label: '報價紀錄', key: '/admin/quotes', icon: <FileInvoiceDollar size={16} /> },
      { label: '年度報表', key: '/admin/annual-report', icon: <Calendar size={16} /> },
    ],
  },
  { label: '系統設定', key: '/admin/system-settings', icon: <Gear size={16} /> },
  { label: '帳號安全', key: '/admin/security', icon: <Key size={16} /> },
];

type MenuLeaf = { label: string; key: string; icon: React.ReactNode };
const flatLeaves: MenuLeaf[] = menuItems.flatMap((item) => item.children ?? [item]);

/** 依最長前綴比對找出目前應該高亮的選單項目（避免 /admin/quotes 與 /admin/quotes/new 互相誤判） */
function resolveSelectedKey(pathname: string): string | undefined {
  const matched = flatLeaves.filter((leaf) => pathname === leaf.key || pathname.startsWith(`${leaf.key}/`));
  if (matched.length === 0) return undefined;
  return matched.reduce((longest, leaf) => (leaf.key.length > longest.key.length ? leaf : longest)).key;
}

function findOpenKeys(pathname: string): string[] {
  const selectedKey = resolveSelectedKey(pathname);
  return menuItems.filter((item) => item.children?.some((child) => child.key === selectedKey)).map((item) => item.key);
}

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
  const [openKeys, setOpenKeys] = useState<string[]>(() => findOpenKeys(pathname));
  const [openKeysSyncedPathname, setOpenKeysSyncedPathname] = useState(pathname);

  // 依 React 官方建議的「渲染期間調整狀態」寫法，取代在 effect 內同步衍生狀態
  if (pathname !== openKeysSyncedPathname) {
    setOpenKeysSyncedPathname(pathname);
    setOpenKeys((prev) => Array.from(new Set([...prev, ...findOpenKeys(pathname)])));
  }

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
          selectedKeys={resolveSelectedKey(pathname) ? [resolveSelectedKey(pathname) as string] : []}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
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
