import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { api, Category, Transaction, TransactionFilters, TransactionPayload } from '../api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import Button from '../components/Button';
import Spinner from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';

const Page = styled.div`min-height: 100vh; background: ${({ theme }) => theme.colors.background};`;
const Nav = styled.nav`
  background: ${({ theme }) => theme.colors.surface}; border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding: 0 ${({ theme }) => theme.spacing.xl}; display: flex; align-items: center; justify-content: space-between; height: 56px;
  @media (max-width: ${({ theme }) => theme.breakpoint}) { padding: 0 ${({ theme }) => theme.spacing.md}; }
`;
const NavLinks = styled.div`display: flex; gap: ${({ theme }) => theme.spacing.lg};`;
const NavLink = styled(Link)`color: ${({ theme }) => theme.colors.textMuted}; font-weight: 500; &:hover { color: ${({ theme }) => theme.colors.text}; }`;
const NavRight = styled.div`display: flex; gap: ${({ theme }) => theme.spacing.md};`;
const Content = styled.main`
  max-width: 1100px; margin: 0 auto; padding: ${({ theme }) => theme.spacing.xl};
  @media (max-width: ${({ theme }) => theme.breakpoint}) { padding: ${({ theme }) => theme.spacing.md}; }
`;
const TopBar = styled.div`
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing.lg}; gap: ${({ theme }) => theme.spacing.md};
  @media (max-width: ${({ theme }) => theme.breakpoint}) { flex-direction: column; }
`;
const PageTitle = styled.h1`font-size: 20px; font-weight: 700;`;
const Filters = styled.div`
  display: flex; flex-wrap: wrap; gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface}; border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius}; padding: ${({ theme }) => theme.spacing.md};
`;
const FilterInput = styled.input`
  padding: 6px 10px; border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius}; font-size: 13px; min-width: 120px;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;
const FilterSelect = styled.select`
  padding: 6px 10px; border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius}; font-size: 13px; background: white;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;
const Table = styled.table`
  width: 100%; background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius}; box-shadow: ${({ theme }) => theme.shadow}; overflow: hidden;
  @media (max-width: ${({ theme }) => theme.breakpoint}) { display: none; }
`;
const Th = styled.th`
  text-align: left; padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 12px; font-weight: 600; color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase; letter-spacing: 0.05em; background: ${({ theme }) => theme.colors.background};
`;
const Td = styled.td`
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border}; font-size: 14px;
`;
const TrHover = styled.tr`&:hover td { background: #F9FAFB; } &:last-child td { border-bottom: none; }`;
const CardList = styled.div`
  display: none; flex-direction: column; gap: ${({ theme }) => theme.spacing.sm};
  @media (max-width: ${({ theme }) => theme.breakpoint}) { display: flex; }
`;
const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface}; border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius}; padding: ${({ theme }) => theme.spacing.md};
`;
const CardRow = styled.div`display: flex; justify-content: space-between; margin-bottom: 4px;`;
const CardLabel = styled.span`font-size: 12px; color: ${({ theme }) => theme.colors.textMuted};`;
const CardValue = styled.span`font-size: 14px; font-weight: 500;`;
const CardActions = styled.div`display: flex; gap: ${({ theme }) => theme.spacing.sm}; margin-top: ${({ theme }) => theme.spacing.sm};`;
const Amount = styled.span<{ txtype?: 'outcome' | 'income' }>`
  font-weight: 600;
  color: ${({ txtype }) => txtype === 'income' ? '#10B981' : txtype === 'outcome' ? '#EF4444' : 'inherit'};
`;
const TypeBadge = styled.span<{ txtype: 'outcome' | 'income' }>`
  display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600;
  background: ${({ txtype }) => txtype === 'income' ? '#D1FAE5' : '#FEE2E2'};
  color: ${({ txtype }) => txtype === 'income' ? '#065F46' : '#991B1B'};
`;
const EmptyState = styled.div`
  text-align: center; padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.textMuted}; background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius};
`;
const FormGroup = styled.div`margin-bottom: ${({ theme }) => theme.spacing.md};`;
const Label = styled.label`display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px;`;
const Input = styled.input`
  width: 100%; padding: 8px 12px; border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius};
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;
const Select = styled.select`
  width: 100%; padding: 8px 12px; border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius}; background: white;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;
const Textarea = styled.textarea`
  width: 100%; padding: 8px 12px; resize: vertical; min-height: 72px;
  border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: ${({ theme }) => theme.borderRadius};
  font-family: inherit;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;
const ValidationMsg = styled.p`color: ${({ theme }) => theme.colors.danger}; font-size: 12px; margin-top: 4px;`;

interface FormState { title: string; amount: string; type: 'outcome' | 'income'; date: string; notes: string; category_id: string }
interface FormErrors { title?: string; amount?: string; date?: string }

const EMPTY_FORM: FormState = { title: '', amount: '', type: 'outcome', date: '', notes: '', category_id: '' };

function validate(form: FormState): FormErrors {
  const errs: FormErrors = {};
  if (!form.title.trim()) errs.title = 'Title is required';
  if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = 'Amount must be greater than 0';
  if (!form.date) errs.date = 'Date is required';
  return errs;
}

export default function TransactionsPage() {
  const { logout } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<TransactionFilters>({ search: '', category_id: '', date_from: '', date_to: '', amount_min: '', amount_max: '', type: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txs, cats] = await Promise.all([api.getTransactions(filters), api.getCategories()]);
      setTransactions(txs); setCategories(cats);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  const setFilter = (key: keyof TransactionFilters, val: string) => setFilters(f => ({ ...f, [key]: val }));
  const clearFilters = () => setFilters({ search: '', category_id: '', date_from: '', date_to: '', amount_min: '', amount_max: '', type: '' });

  const openCreate = () => { setForm(EMPTY_FORM); setFormErrors({}); setModalError(''); setShowCreate(true); };
  const openEdit = (tx: Transaction) => {
    setForm({ title: tx.title, amount: String(tx.amount), type: tx.type, date: tx.date, notes: tx.notes || '', category_id: tx.category_id ? String(tx.category_id) : '' });
    setFormErrors({}); setModalError(''); setEditing(tx);
  };

  const submit = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setSaving(true); setModalError('');
    try {
      const payload: TransactionPayload = {
        title: form.title.trim(), amount: parseFloat(form.amount), type: form.type, date: form.date,
        ...(form.notes ? { notes: form.notes } : {}),
        ...(form.category_id ? { category_id: Number(form.category_id) } : {}),
      };
      if (editing) await api.updateTransaction(editing.id, payload);
      else await api.createTransaction(payload);
      setShowCreate(false); setEditing(null); void load();
    } catch (e) { setModalError((e as Error).message); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try { await api.deleteTransaction(deleting.id); setDeleting(null); void load(); }
    catch (e) { setError((e as Error).message); setDeleting(null); }
    finally { setSaving(false); }
  };

  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString();

  return (
    <Page>
      <Nav>
        <NavLinks>
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/transactions" style={{ color: 'inherit' }}>Transactions</NavLink>
          <NavLink to="/categories">Categories</NavLink>
        </NavLinks>
        <NavRight><Button variant="ghost" size="sm" onClick={() => void logout()}>Logout</Button></NavRight>
      </Nav>
      <Content>
        <TopBar>
          <PageTitle>Transactions</PageTitle>
          <Button size="sm" onClick={openCreate}>+ Add Transaction</Button>
        </TopBar>
        <ErrorBanner message={error} onDismiss={() => setError('')} />
        <Filters>
          <FilterInput placeholder="Search..." value={filters.search as string} onChange={e => setFilter('search', e.target.value)} />
          <FilterSelect value={filters.category_id as string} onChange={e => setFilter('category_id', e.target.value)}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FilterSelect>
          <FilterInput type="date" value={filters.date_from as string} onChange={e => setFilter('date_from', e.target.value)} />
          <FilterInput type="date" value={filters.date_to as string} onChange={e => setFilter('date_to', e.target.value)} />
          <FilterInput type="number" placeholder="Min $" value={filters.amount_min as string} onChange={e => setFilter('amount_min', e.target.value)} style={{ width: 90 }} />
          <FilterInput type="number" placeholder="Max $" value={filters.amount_max as string} onChange={e => setFilter('amount_max', e.target.value)} style={{ width: 90 }} />
          <FilterSelect value={filters.type as string} onChange={e => setFilter('type', e.target.value)}>
            <option value="">All types</option>
            <option value="outcome">Outcome</option>
            <option value="income">Income</option>
          </FilterSelect>
          <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
        </Filters>

        {loading ? <Spinner center /> : transactions.length === 0 ? <EmptyState>No transactions found.</EmptyState> : (
          <>
            <Table>
              <thead><tr><Th>Date</Th><Th>Title</Th><Th>Category</Th><Th>Type</Th><Th>Amount</Th><Th>Notes</Th><Th></Th></tr></thead>
              <tbody>
                {transactions.map(tx => (
                  <TrHover key={tx.id}>
                    <Td>{formatDate(tx.date)}</Td>
                    <Td>{tx.title}</Td>
                    <Td>{tx.category_name || '—'}</Td>
                    <Td><TypeBadge txtype={tx.type}>{tx.type}</TypeBadge></Td>
                    <Td><Amount txtype={tx.type}>{tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}</Amount></Td>
                    <Td style={{ color: '#6B7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.notes || ''}</Td>
                    <Td><div style={{ display: 'flex', gap: 8 }}><Button variant="secondary" size="sm" onClick={() => openEdit(tx)}>Edit</Button><Button variant="danger" size="sm" onClick={() => setDeleting(tx)}>Delete</Button></div></Td>
                  </TrHover>
                ))}
              </tbody>
            </Table>
            <CardList>
              {transactions.map(tx => (
                <Card key={tx.id}>
                  <CardRow><CardLabel>Date</CardLabel><CardValue>{formatDate(tx.date)}</CardValue></CardRow>
                  <CardRow><CardLabel>Title</CardLabel><CardValue>{tx.title}</CardValue></CardRow>
                  <CardRow><CardLabel>Category</CardLabel><CardValue>{tx.category_name || '—'}</CardValue></CardRow>
                  <CardRow><CardLabel>Type</CardLabel><TypeBadge txtype={tx.type}>{tx.type}</TypeBadge></CardRow>
                  <CardRow><CardLabel>Amount</CardLabel><Amount txtype={tx.type}>{tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}</Amount></CardRow>
                  {tx.notes && <CardRow><CardLabel>Notes</CardLabel><CardValue>{tx.notes}</CardValue></CardRow>}
                  <CardActions><Button variant="secondary" size="sm" onClick={() => openEdit(tx)}>Edit</Button><Button variant="danger" size="sm" onClick={() => setDeleting(tx)}>Delete</Button></CardActions>
                </Card>
              ))}
            </CardList>
          </>
        )}
      </Content>

      {(showCreate || editing) && (
        <Modal title={editing ? 'Edit Transaction' : 'New Transaction'} onClose={() => { setShowCreate(false); setEditing(null); }}
          footer={<><Button variant="secondary" onClick={() => { setShowCreate(false); setEditing(null); }}>Cancel</Button><Button onClick={() => void submit()} disabled={saving}>{editing ? 'Save' : 'Create'}</Button></>}>
          <ErrorBanner message={modalError} onDismiss={() => setModalError('')} />
          <FormGroup><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />{formErrors.title && <ValidationMsg>{formErrors.title}</ValidationMsg>}</FormGroup>
          <FormGroup><Label>Type *</Label><Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'outcome' | 'income' }))}><option value="outcome">Outcome</option><option value="income">Income</option></Select></FormGroup>
          <FormGroup><Label>Amount *</Label><Input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />{formErrors.amount && <ValidationMsg>{formErrors.amount}</ValidationMsg>}</FormGroup>
          <FormGroup><Label>Date *</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />{formErrors.date && <ValidationMsg>{formErrors.date}</ValidationMsg>}</FormGroup>
          <FormGroup><Label>Category</Label><Select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}><option value="">None</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></FormGroup>
          <FormGroup><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></FormGroup>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete Transaction" onClose={() => setDeleting(null)}
          footer={<><Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="danger" onClick={() => void confirmDelete()} disabled={saving}>Delete</Button></>}>
          <p>Are you sure you want to delete <strong>{deleting.title}</strong> (${deleting.amount.toFixed(2)})?</p>
        </Modal>
      )}
    </Page>
  );
}
