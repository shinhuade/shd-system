'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styled from 'styled-components';
import { Button, Drawer, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { Bars } from '@styled-icons/fa-solid';

const navItems = [
  { label: '首頁', href: '/' },
  { label: '會員中心', href: '/account' },
  { label: '後台系統', href: '/admin' },
];

export default function Header() {
  const pathname = usePathname();
  const [menuVisible, setMenuVisible] = useState(false);

  const menuItems: MenuProps['items'] = navItems.map((it) => ({
    key: it.href,
    label: <Link href={it.href}>{it.label}</Link>,
  }));

  return (
    <Wrapper>
      <div className="container">
        <Link href="/" style={{ height: '80%' }}>
          <Logo src="/logo.png" alt="logo" width={200} height={50} priority />
        </Link>

        <nav>
          {navItems
            .filter((it) => it.href !== '/')
            .map((it) => (
              <Link href={it.href} key={it.href}>
                <Button type="link" size="large">
                  {it.label}
                </Button>
              </Link>
            ))}
        </nav>

        <Bars size={24} className="menu-toggle" onClick={() => setMenuVisible(true)} />
      </div>

      <Drawer open={menuVisible} onClose={() => setMenuVisible(false)}>
        <Menu
          mode="inline"
          items={menuItems}
          selectedKeys={[pathname]}
          onClick={() => setMenuVisible(false)}
          style={{ border: 'none' }}
        />
      </Drawer>
    </Wrapper>
  );
}

const Wrapper = styled.header`
  width: 100%;
  background: #fff;
  box-shadow:
    0 1px 2px 0 rgba(0, 0, 0, 0.05),
    0 4px 12px 0 rgba(0, 0, 0, 0.05);
  position: fixed;
  top: 0;
  left: 0;
  z-index: 999;

  & > .container {
    height: var(--navbar-height);
    display: flex;
    align-items: center;

    & > nav {
      display: none;
      margin-left: auto;
    }

    & > .menu-toggle {
      margin-left: auto;
      cursor: pointer;
    }
  }

  @media (min-width: 576px) {
    & > .container {
      & > nav {
        display: block;
      }

      & > .menu-toggle {
        display: none;
      }
    }
  }
`;

const Logo = styled(Image)`
  width: auto;
  max-width: 120px;
  height: 100%;
  object-fit: contain;
`;
