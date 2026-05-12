import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';

interface Toast { id: number; message: string; type: ToastType }
type ToastType = 'success' | 'error' | 'warning' | 'info';
interface ToastContextValue { addToast: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastContextValue | null>(null);

const slideIn = keyframes`from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; }`;

const typeColors: Record<ToastType, string> = {
  success: '#10B981', error: '#EF4444', warning: '#F59E0B', info: '#3B82F6',
};

const ToastItem = styled.div<{ type: ToastType }>`
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background: ${({ type }) => typeColors[type]};
  color: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  min-width: 280px; max-width: 360px;
  animation: ${slideIn} 0.25s ease;
  font-size: 14px; line-height: 1.4;
`;

const CloseBtn = styled.button`
  background: none; border: none; color: #fff; opacity: 0.8;
  font-size: 18px; line-height: 1; padding: 0;
  &:hover { opacity: 1; }
`;

const Container = styled.div`
  position: fixed; bottom: 24px; right: 24px;
  display: flex; flex-direction: column; gap: 10px;
  z-index: 999;
`;

let idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <Container>
        {toasts.map((t) => (
          <ToastItem key={t.id} type={t.type}>
            <span>{t.message}</span>
            <CloseBtn onClick={() => remove(t.id)}>×</CloseBtn>
          </ToastItem>
        ))}
      </Container>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
