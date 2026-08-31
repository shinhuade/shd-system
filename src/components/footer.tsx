'use client';

import styled from 'styled-components';

export default function Footer() {
  return (
    <Wrapper>
      <div className="container">© {new Date().getFullYear()} Xuan. All rights reserved.</div>
    </Wrapper>
  );
}

const Wrapper = styled.footer`
  background: var(--primary-color);
  color: var(--background);
  font-size: 14px;
  text-align: center;
  padding: var(--base-padding) 0;
`;
