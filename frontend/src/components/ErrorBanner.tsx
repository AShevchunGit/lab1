import React from 'react';
import styled from 'styled-components';

const Banner = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: ${({ theme }) => theme.borderRadius};
  color: ${({ theme }) => theme.colors.danger};
  font-size: 14px;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const CloseBtn = styled.button`
  background: none; border: none;
  color: ${({ theme }) => theme.colors.danger};
  font-size: 18px; line-height: 1; padding: 0;
`;

interface ErrorBannerProps { message?: string; onDismiss?: () => void }

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <Banner>
      <span>{message}</span>
      {onDismiss && <CloseBtn onClick={onDismiss}>×</CloseBtn>}
    </Banner>
  );
}
