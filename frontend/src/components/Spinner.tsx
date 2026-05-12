import styled, { keyframes } from 'styled-components';

const spin = keyframes`to { transform: rotate(360deg); }`;

const Spinner = styled.div<{ size?: string; center?: boolean }>`
  width: ${({ size }) => size || '24px'};
  height: ${({ size }) => size || '24px'};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
  margin: ${({ center }) => center ? '40px auto' : '0'};
`;

export default Spinner;
