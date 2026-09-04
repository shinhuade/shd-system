'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { App, Layout, Image, Menu, Button, Drawer } from 'antd';
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
      { label: '包材藥水成本', key: '/admin/packaging', icon: <Box size={16} /> },
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

/** 手機版頂端列顯示目前頁面名稱，讓使用者在收合選單時仍知道自己在哪一頁 */
function resolvePageTitle(pathname: string): string {
  const selectedKey = resolveSelectedKey(pathname);
  return flatLeaves.find((leaf) => leaf.key === selectedKey)?.label ?? '興樺德系統';
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const { message } = App.useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>(() => findOpenKeys(pathname));
  const [openKeysSyncedPathname, setOpenKeysSyncedPathname] = useState(pathname);

  // 依 React 官方建議的「渲染期間調整狀態」寫法，取代在 effect 內同步衍生狀態
  if (pathname !== openKeysSyncedPathname) {
    setOpenKeysSyncedPathname(pathname);
    setOpenKeys((prev) => Array.from(new Set([...prev, ...findOpenKeys(pathname)])));
  }

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

  const navigation = (
    <>
      <Menu
        className="menu"
        mode="inline"
        selectedKeys={resolveSelectedKey(pathname) ? [resolveSelectedKey(pathname) as string] : []}
        openKeys={openKeys}
        onOpenChange={setOpenKeys}
        items={menuItems}
        onClick={({ key }) => {
          router.push(key);
          setDrawerOpen(false);
        }}
      />
      <div className="bottom">
        <Button color="danger" variant="solid" block icon={<ArrowRightFromBracket size={16} />} onClick={onLogout}>
          登出
        </Button>
      </div>
    </>
  );

  return (
    <Layout>
      <Sider width={siderWidth}>
        <Image src="/logo.png" alt="logo" preview={false} className="top" />
        {navigation}
      </Sider>

      <ContentLayout>
        <MobileTopBar>
          <Button
            type="text"
            aria-label="開啟選單"
            className="menu-button"
            icon={<List size={20} />}
            onClick={() => setDrawerOpen(true)}
          />
          <span className="title">{resolvePageTitle(pathname)}</span>
        </MobileTopBar>

        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          size={Math.min(siderWidth, 300)}
          closable={false}
          styles={{ body: { padding: '24px 12px', display: 'flex', flexDirection: 'column' } }}
        >
          <Image src="/logo.png" alt="logo" preview={false} className="top" />
          {navigation}
        </MobileDrawer>

        <Content className="admin-content">{children}</Content>
      </ContentLayout>
    </Layout>
  );
}

/** 側邊選單與抽屜共用的樣式（選單撐滿、登出固定在底部） */
const navStyles = `
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

    &::-webkit-scrollbar {
      width: 1px;
    }
    &::-webkit-scrollbar-thumb {
      background: var(--primary-color);
      border-radius: 10px;
    }

    .ant-menu-item-selected {
      background-color: var(--accent-color);
      color: var(--primary-color);

      .ant-menu-item-icon,
      svg {
        color: var(--primary-color);
      }
    }
  }

  .bottom {
    padding-top: 16px;
  }
`;

const Sider = styled(AntdSider)`
  && {
    height: 100dvh;
    padding: 32px 16px;
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.05);
    position: fixed;
    left: 0;
    top: 0;
    z-index: 999;

    .ant-layout-sider-children {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    ${navStyles}

    /* 手機／平板改用頂端列 + 抽屜，桌機側欄整個隱藏 */
    @media (max-width: 992px) {
      display: none;
    }
  }
`;

const MobileDrawer = styled(Drawer)`
  .ant-menu {
    font-size: 16px;
  }

  .ant-menu-item,
  .ant-menu-submenu-title {
    height: 46px;
    line-height: 46px;
  }

  ${navStyles}
`;

const MobileTopBar = styled.header`
  display: none;

  @media (max-width: 992px) {
    display: flex;
    align-items: center;
    gap: 4px;
    /* html/body 有 overflow-x: hidden，sticky 會失效，改用 fixed 並在內容區留出等高的上緣間距 */
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 900;
    height: calc(56px + env(safe-area-inset-top));
    padding: env(safe-area-inset-top) 8px 0;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);

    .menu-button {
      width: 44px;
      height: 44px;
    }

    .title {
      font-size: 17px;
      font-weight: 600;
      color: var(--primary-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;

const ContentLayout = styled(Layout)`
  && {
    margin-left: ${siderWidth}px;
    background: #fafafa;
    transition: margin-left 0.2s;

    .admin-content {
      padding: 32px;
    }

    @media (max-width: 992px) {
      margin-left: 0;

      .admin-content {
        padding: calc(72px + env(safe-area-inset-top)) 12px calc(24px + env(safe-area-inset-bottom));
      }
    }
  }
`;
