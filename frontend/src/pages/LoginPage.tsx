import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const Page = styled.div`
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: ${({ theme }) => theme.colors.background};
  padding: ${({ theme }) => theme.spacing.md};
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.shadowMd};
  padding: ${({ theme }) => theme.spacing.xxl};
  width: 100%; max-width: 380px;
  text-align: center;
`;

const Logo = styled.div`font-size: 32px; margin-bottom: ${({ theme }) => theme.spacing.sm};`;
const Title = styled.h1`font-size: 22px; font-weight: 700; margin-bottom: ${({ theme }) => theme.spacing.xs};`;
const Subtitle = styled.p`color: ${({ theme }) => theme.colors.textMuted}; margin-bottom: ${({ theme }) => theme.spacing.xl};`;

const OAuthBtn = styled.a`
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; padding: 11px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 14px; font-weight: 500;
  cursor: pointer; text-decoration: none;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  transition: background 0.15s;
  &:hover { background: ${({ theme }) => theme.colors.background}; }
`;

const Divider = styled.div`
  display: flex; align-items: center; gap: ${({ theme }) => theme.spacing.sm};
  margin: ${({ theme }) => theme.spacing.md} 0;
  color: ${({ theme }) => theme.colors.textMuted}; font-size: 12px;
  &::before, &::after { content: ''; flex: 1; height: 1px; background: ${({ theme }) => theme.colors.border}; }
`;

const LocalSection = styled.div`
  text-align: left;
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const ToggleBtn = styled.button`
  background: none; border: none; padding: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px; cursor: pointer; width: 100%;
  text-align: center;
  &:hover { color: ${({ theme }) => theme.colors.text}; }
`;

const LocalForm = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
  display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.sm};
`;

const Input = styled.input`
  width: 100%; padding: 9px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 14px;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;

const SubmitBtn = styled.button`
  width: 100%; padding: 10px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff; border: none;
  border-radius: ${({ theme }) => theme.borderRadius};
  font-size: 14px; font-weight: 500; cursor: pointer;
  transition: background 0.15s;
  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.primaryHover}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorMsg = styled.p`
  color: ${({ theme }) => theme.colors.danger};
  font-size: 13px; text-align: center;
`;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [localEnabled, setLocalEnabled] = useState(false);
  const [showLocal, setShowLocal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.localAuthEnabled().then(({ enabled }) => {
      setLocalEnabled(enabled);
      if (enabled) setShowLocal(true);
    }).catch(() => {});
  }, []);

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setError(''); setLoading(true);
    try {
      const user = await api.localLogin(username, password);
      setUser(user);
      navigate('/');
    } catch (err) {
      setError((err as Error).message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <Card>
        <Logo>💰</Logo>
        <Title>Expense Tracker</Title>
        <Subtitle>Sign in to manage your personal finances</Subtitle>
        <OAuthBtn href={`${API}/auth/google`}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg>
          Continue with Google
        </OAuthBtn>
        <OAuthBtn href={`${API}/auth/github`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.1.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12C24 5.37 18.63 0 12 0z"/></svg>
          Continue with GitHub
        </OAuthBtn>

        {localEnabled && (
          <LocalSection>
            <Divider>or</Divider>
            <ToggleBtn type="button" onClick={() => setShowLocal((v) => !v)}>
              {showLocal ? '▲ Hide local login' : '▼ Use local credentials'}
            </ToggleBtn>
            {showLocal && (
              <LocalForm as="form" onSubmit={handleLocalLogin}>
                <Input
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                {error && <ErrorMsg>{error}</ErrorMsg>}
                <SubmitBtn type="submit" disabled={loading || !username || !password}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </SubmitBtn>
              </LocalForm>
            )}
          </LocalSection>
        )}
      </Card>
    </Page>
  );
}
