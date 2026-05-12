import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { api, BudgetSummary } from '../api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket, WsMessage } from '../hooks/useWebSocket';
import { useToast } from '../components/ToastProvider';
import { Modal } from '../components/Modal';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';

const Page = styled.div`min-height: 100vh; background: ${({ theme }) => theme.colors.background};`;

const Nav = styled.nav`
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding: 0 ${({ theme }) => theme.spacing.xl};
  display: flex; align-items: center; justify-content: space-between; height: 56px;
  @media (max-width: ${({ theme }) => theme.breakpoint}) { padding: 0 ${({ theme }) => theme.spacing.md}; }
`;

const NavLinks = styled.div`display: flex; gap: ${({ theme }) => theme.spacing.lg};
  @media (max-width: ${({ theme }) => theme.breakpoint}) { gap: ${({ theme }) => theme.spacing.md}; }
`;

const NavLink = styled(Link)`color: ${({ theme }) => theme.colors.textMuted}; font-weight: 500; &:hover { color: ${({ theme }) => theme.colors.text}; }`;
const NavRight = styled.div`display: flex; align-items: center; gap: ${({ theme }) => theme.spacing.md};`;
const UserName = styled.span`color: ${({ theme }) => theme.colors.textMuted}; font-size: 13px;
  @media (max-width: ${({ theme }) => theme.breakpoint}) { display: none; }`;

const Content = styled.main`
  max-width: 800px; margin: 0 auto; padding: ${({ theme }) => theme.spacing.xl};
  @media (max-width: ${({ theme }) => theme.breakpoint}) { padding: ${({ theme }) => theme.spacing.md}; }
`;

const MonthNav = styled.div`display: flex; align-items: center; gap: ${({ theme }) => theme.spacing.md}; margin-bottom: ${({ theme }) => theme.spacing.xl};`;
const MonthLabel = styled.h2`font-size: 20px; font-weight: 600; min-width: 160px; text-align: center;`;

const SummaryCard = styled.div`
  background: ${({ theme }) => theme.colors.surface}; border-radius: 12px;
  box-shadow: ${({ theme }) => theme.shadow}; padding: ${({ theme }) => theme.spacing.xl};
`;

const CardTitle = styled.h3`font-size: 16px; font-weight: 600; margin-bottom: ${({ theme }) => theme.spacing.lg};`;

const StatsGrid = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  @media (max-width: ${({ theme }) => theme.breakpoint}) { grid-template-columns: 1fr; }
`;

const Stat = styled.div`
  text-align: center; padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background}; border-radius: ${({ theme }) => theme.borderRadius};
`;
const StatLabel = styled.div`color: ${({ theme }) => theme.colors.textMuted}; font-size: 12px; margin-bottom: 4px;`;
const StatValue = styled.div<{ color?: string }>`font-size: 22px; font-weight: 700; color: ${({ color }) => color || 'inherit'};`;

const ProgressBar = styled.div`height: 8px; background: ${({ theme }) => theme.colors.border}; border-radius: 99px; overflow: hidden;`;
const ProgressFill = styled.div<{ pct: number }>`
  height: 100%; border-radius: 99px;
  width: ${({ pct }) => Math.min(pct, 100)}%;
  background: ${({ pct, theme }) => pct >= 100 ? theme.colors.danger : pct >= 80 ? theme.colors.warning : theme.colors.success};
  transition: width 0.3s;
`;
const ProgressLabel = styled.div`text-align: right; font-size: 12px; color: ${({ theme }) => theme.colors.textMuted}; margin-top: 4px;`;
const NoBudget = styled.div`text-align: center; padding: ${({ theme }) => theme.spacing.xl}; color: ${({ theme }) => theme.colors.textMuted};`;

const FormGroup = styled.div`margin-bottom: ${({ theme }) => theme.spacing.md};`;
const Label = styled.label`display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px;`;
const Input = styled.input`
  width: 100%; padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: ${({ theme }) => theme.borderRadius};
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSummary = useCallback(async () => {
    setLoading(true); setError('');
    try { setSummary(await api.getBudget(year, month)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);

  useWebSocket(useCallback((msg: WsMessage) => {
    if (msg.type === 'alert') {
      addToast(
        `Budget alert: You've used ${msg.threshold}% of your ${MONTHS[month - 1]} budget ($${msg.spent?.toFixed(2)} / $${msg.budget?.toFixed(2)})`,
        'warning'
      );
      void loadSummary();
    }
  }, [addToast, month, loadSummary]));

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  };

  const saveBudget = async () => {
    const val = parseFloat(budgetInput);
    if (!val || val <= 0) return;
    setSaving(true);
    try {
      await api.setBudget(year, month, val);
      setShowBudgetModal(false); setBudgetInput(''); void loadSummary();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <Page>
      <Nav>
        <NavLinks>
          <NavLink to="/" style={{ color: 'inherit' }}>Dashboard</NavLink>
          <NavLink to="/transactions">Transactions</NavLink>
          <NavLink to="/categories">Categories</NavLink>
        </NavLinks>
        <NavRight>
          <UserName>{user?.name}</UserName>
          <Button variant="ghost" size="sm" onClick={() => void logout()}>Logout</Button>
        </NavRight>
      </Nav>
      <Content>
        <MonthNav>
          <Button variant="secondary" size="sm" onClick={prevMonth}>←</Button>
          <MonthLabel>{MONTHS[month - 1]} {year}</MonthLabel>
          <Button variant="secondary" size="sm" onClick={nextMonth}>→</Button>
          <Button variant="primary" size="sm" onClick={() => { setBudgetInput(String(summary?.budget || '')); setShowBudgetModal(true); }}>
            {summary?.budget ? 'Edit Budget' : 'Set Budget'}
          </Button>
        </MonthNav>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {loading ? <Spinner center /> : (
          <SummaryCard>
            <CardTitle>Budget Summary</CardTitle>
            <StatsGrid>
              <Stat><StatLabel>Income</StatLabel><StatValue color="#10B981">+${(summary?.income ?? 0).toFixed(2)}</StatValue></Stat>
              <Stat><StatLabel>Expenses</StatLabel><StatValue color="#EF4444">-${(summary?.spent ?? 0).toFixed(2)}</StatValue></Stat>
              <Stat><StatLabel>Net</StatLabel><StatValue color={(summary?.net ?? 0) >= 0 ? '#10B981' : '#EF4444'}>{(summary?.net ?? 0) >= 0 ? '+' : ''}${(summary?.net ?? 0).toFixed(2)}</StatValue></Stat>
            </StatsGrid>
            {summary?.budget == null ? (
              <NoBudget>
                <p>No expense budget set for this month.</p>
                <br />
                <Button size="sm" onClick={() => setShowBudgetModal(true)}>Set a Budget</Button>
              </NoBudget>
            ) : (
              <>
                <StatsGrid>
                  <Stat><StatLabel>Budget</StatLabel><StatValue>${summary.budget.toFixed(2)}</StatValue></Stat>
                  <Stat><StatLabel>Spent</StatLabel><StatValue color={(summary.usagePct ?? 0) >= 100 ? '#EF4444' : '#111827'}>${summary.spent.toFixed(2)}</StatValue></Stat>
                  <Stat><StatLabel>Remaining</StatLabel><StatValue color={(summary.remaining ?? 0) < 0 ? '#EF4444' : '#10B981'}>${(summary.remaining ?? 0).toFixed(2)}</StatValue></Stat>
                </StatsGrid>
                <ProgressBar><ProgressFill pct={summary.usagePct ?? 0} /></ProgressBar>
                <ProgressLabel>{summary.usagePct?.toFixed(1)}% of budget used</ProgressLabel>
              </>
            )}
          </SummaryCard>
        )}
      </Content>

      {showBudgetModal && (
        <Modal
          title={summary?.budget ? 'Edit Budget' : 'Set Budget'}
          onClose={() => setShowBudgetModal(false)}
          footer={<><Button variant="secondary" onClick={() => setShowBudgetModal(false)}>Cancel</Button><Button onClick={() => void saveBudget()} disabled={saving}>Save</Button></>}
        >
          <FormGroup>
            <Label>Monthly Budget ($)</Label>
            <Input type="number" min="0.01" step="0.01" placeholder="e.g. 1500" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} autoFocus />
          </FormGroup>
        </Modal>
      )}
    </Page>
  );
}
