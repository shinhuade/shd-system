'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import styled from 'styled-components';
import Link from 'next/link';
import { Button, App } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';

interface AccountShellProps {
  children: ReactNode;
}

const navItems = [
  { href: '/account', label: '會員中心' },
  { href: '/account/profile', label: '個人資料' },
  { href: '/account/security', label: '帳號安全' },
];

export default function AccountShell({ children }: AccountShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { message } = App.useApp();
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 992px)');

    const syncLayout = () => {
      const mobile = mediaQuery.matches;
      setIsMobile(mobile);
      setMenuOpen(!mobile);
    };

    syncLayout();
    mediaQuery.addEventListener('change', syncLayout);

    return () => {
      mediaQuery.removeEventListener('change', syncLayout);
    };
  }, []);

  const onLogout = async () => {
    try {
      await fetch('/api/user/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      message.success('已登出');
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error(err);
      message.error('登出失敗');
    }
  };

  return (
    <Wrapper>
      <aside className="sidebar">
        <div className="title-row">
          <h2 className="title">會員中心</h2>
          {isMobile && (
            <Button
              type="text"
              icon={menuOpen ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              {menuOpen ? '收合導覽' : '展開導覽'}
            </Button>
          )}
        </div>

        <nav className={`nav-list ${menuOpen ? 'is-open' : 'is-closed'}`}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'is-active' : ''}`}
                onClick={() => {
                  if (isMobile) setMenuOpen(false);
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Button danger block onClick={onLogout}>
          登出
        </Button>
      </aside>

      <section className="content">{children}</section>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 20px;
  padding: 24px 0 40px;

  .sidebar {
    background: #fff;
    border-radius: 12px;
    border: 1px solid #f0f0f0;
    padding: 18px;
    height: fit-content;
    position: sticky;
    top: calc(var(--navbar-height) + 16px);
  }

  .title {
    font-size: 20px;
    margin-bottom: 14px;
  }

  .title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 14px;

    .title {
      margin-bottom: 0;
    }
  }

  .nav-list {
    display: grid;
    gap: 8px;
    margin-bottom: 18px;
  }

  .nav-item {
    padding: 10px 12px;
    border-radius: 8px;
    transition: background 0.2s ease;
    border: 1px solid transparent;
  }

  .nav-item:hover {
    background: #fafafa;
  }

  .nav-item.is-active {
    background: #f6ffed;
    border-color: #b7eb8f;
    color: #389e0d;
    font-weight: 600;
  }

  .content {
    min-width: 0;
  }

  @media (max-width: 992px) {
    grid-template-columns: 1fr;

    .sidebar {
      position: static;
      top: auto;
    }

    .nav-list {
      display: none;
      margin-bottom: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .nav-list.is-open {
      display: grid;
    }

    .nav-list.is-closed {
      display: none;
    }
  }

  @media (max-width: 576px) {
    .nav-list {
      grid-template-columns: 1fr;
    }
  }
`;
