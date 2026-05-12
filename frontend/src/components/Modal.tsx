import React, { ReactNode, useEffect } from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
  padding: ${({ theme }) => theme.spacing.md};
`;

const Box = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadowMd};
  width: 100%; max-width: 480px;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h2`
  font-size: 18px; font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Footer = styled.div`
  display: flex; justify-content: flex-end; gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

interface ModalProps {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ title, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <Overlay onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Box>
        {title && <Title>{title}</Title>}
        {children}
        {footer && <Footer>{footer}</Footer>}
      </Box>
    </Overlay>
  );
}
