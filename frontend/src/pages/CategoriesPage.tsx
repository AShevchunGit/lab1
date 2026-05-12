import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { api, Category } from '../api';
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
  max-width: 800px; margin: 0 auto; padding: ${({ theme }) => theme.spacing.xl};
  @media (max-width: ${({ theme }) => theme.breakpoint}) { padding: ${({ theme }) => theme.spacing.md}; }
`;
const Header = styled.div`display: flex; justify-content: space-between; align-items: center; margin-bottom: ${({ theme }) => theme.spacing.xl};`;
const PageTitle = styled.h1`font-size: 20px; font-weight: 700;`;
const CategoryList = styled.div`display: flex; flex-direction: column; gap: ${({ theme }) => theme.spacing.sm};`;
const CategoryRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  background: ${({ theme }) => theme.colors.surface}; border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius}; padding: ${({ theme }) => theme.spacing.md};
`;
const CategoryName = styled.span`font-weight: 500;`;
const Actions = styled.div`display: flex; gap: ${({ theme }) => theme.spacing.sm};`;
const EmptyState = styled.div`text-align: center; padding: ${({ theme }) => theme.spacing.xxl}; color: ${({ theme }) => theme.colors.textMuted};`;
const FormGroup = styled.div`margin-bottom: ${({ theme }) => theme.spacing.md};`;
const Label = styled.label`display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px;`;
const Input = styled.input`
  width: 100%; padding: 8px 12px; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: ${({ theme }) => theme.borderRadius};
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;

export default function CategoriesPage() {
  const { logout } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [renaming, setRenaming] = useState<Category | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setCategories(await api.getCategories()); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!nameInput.trim()) return;
    setSaving(true); setModalError('');
    try { await api.createCategory(nameInput.trim()); setShowCreate(false); setNameInput(''); void load(); }
    catch (e) { setModalError((e as Error).message); }
    finally { setSaving(false); }
  };

  const rename = async () => {
    if (!renaming || !nameInput.trim()) return;
    setSaving(true); setModalError('');
    try { await api.renameCategory(renaming.id, nameInput.trim()); setRenaming(null); setNameInput(''); void load(); }
    catch (e) { setModalError((e as Error).message); }
    finally { setSaving(false); }
  };

  const remove = async (cat: Category) => {
    setError('');
    try { await api.deleteCategory(cat.id); void load(); }
    catch (e) { setError((e as Error).message); }
  };

  return (
    <Page>
      <Nav>
        <NavLinks>
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/transactions">Transactions</NavLink>
          <NavLink to="/categories" style={{ color: 'inherit' }}>Categories</NavLink>
        </NavLinks>
        <NavRight><Button variant="ghost" size="sm" onClick={() => void logout()}>Logout</Button></NavRight>
      </Nav>
      <Content>
        <Header>
          <PageTitle>Categories</PageTitle>
          <Button size="sm" onClick={() => { setNameInput(''); setModalError(''); setShowCreate(true); }}>+ New Category</Button>
        </Header>
        <ErrorBanner message={error} onDismiss={() => setError('')} />
        {loading ? <Spinner center /> : categories.length === 0 ? (
          <EmptyState><p>No categories yet.</p><br /><Button size="sm" onClick={() => setShowCreate(true)}>Create your first category</Button></EmptyState>
        ) : (
          <CategoryList>
            {categories.map((cat) => (
              <CategoryRow key={cat.id}>
                <CategoryName>{cat.name}</CategoryName>
                <Actions>
                  <Button variant="secondary" size="sm" onClick={() => { setNameInput(cat.name); setModalError(''); setRenaming(cat); }}>Rename</Button>
                  <Button variant="danger" size="sm" onClick={() => void remove(cat)}>Delete</Button>
                </Actions>
              </CategoryRow>
            ))}
          </CategoryList>
        )}
      </Content>

      {showCreate && (
        <Modal title="New Category" onClose={() => setShowCreate(false)}
          footer={<><Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={() => void create()} disabled={saving}>Create</Button></>}>
          <ErrorBanner message={modalError} onDismiss={() => setModalError('')} />
          <FormGroup>
            <Label>Name</Label>
            <Input placeholder="e.g. Food & Dining" value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void create()} autoFocus />
          </FormGroup>
        </Modal>
      )}

      {renaming && (
        <Modal title="Rename Category" onClose={() => setRenaming(null)}
          footer={<><Button variant="secondary" onClick={() => setRenaming(null)}>Cancel</Button><Button onClick={() => void rename()} disabled={saving}>Save</Button></>}>
          <ErrorBanner message={modalError} onDismiss={() => setModalError('')} />
          <FormGroup>
            <Label>Name</Label>
            <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void rename()} autoFocus />
          </FormGroup>
        </Modal>
      )}
    </Page>
  );
}
