import styled, { css } from 'styled-components';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

const variants: Record<Variant, ReturnType<typeof css>> = {
  primary: css`
    background: ${({ theme }) => theme.colors.primary};
    color: #fff;
    &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.primaryHover}; }
  `,
  secondary: css`
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.border};
    &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.background}; }
  `,
  danger: css`
    background: ${({ theme }) => theme.colors.danger};
    color: #fff;
    &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.dangerHover}; }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.textMuted};
    &:hover:not(:disabled) { color: ${({ theme }) => theme.colors.text}; background: ${({ theme }) => theme.colors.background}; }
  `,
};

const sizes: Record<Size, ReturnType<typeof css>> = {
  sm: css`padding: 5px 10px; font-size: 13px;`,
  md: css`padding: 8px 16px; font-size: 14px;`,
};

const Button = styled.button<{ variant?: Variant; size?: Size }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.borderRadius};
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  ${({ variant = 'primary' }) => variants[variant]}
  ${({ size = 'md' }) => sizes[size]}
`;

export default Button;
