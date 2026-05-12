export const theme = {
  colors: {
    primary: '#4F46E5',
    primaryHover: '#4338CA',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    text: '#111827',
    textMuted: '#6B7280',
    danger: '#EF4444',
    dangerHover: '#DC2626',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  borderRadius: '8px',
  shadow: '0 1px 3px rgba(0,0,0,0.1)',
  shadowMd: '0 4px 6px rgba(0,0,0,0.07)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  breakpoint: '768px',
} as const;

export type Theme = typeof theme;
