const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface User {
  id: number;
  provider: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

export interface Category {
  id: number;
  name: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  title: string;
  amount: number;
  type: 'expense' | 'income';
  date: string;
  notes: string | null;
  category_id: number | null;
  category_name: string | null;
  created_at: string;
}

export interface BudgetSummary {
  budget: number | null;
  spent: number;
  income: number;
  net: number;
  remaining: number | null;
  usagePct: number | null;
}

export interface TransactionFilters {
  search?: string;
  category_id?: string | number;
  date_from?: string;
  date_to?: string;
  amount_min?: string | number;
  amount_max?: string | number;
  type?: 'expense' | 'income' | '';
}

export interface TransactionPayload {
  title: string;
  amount: number;
  type: 'expense' | 'income';
  date: string;
  notes?: string;
  category_id?: number;
}

async function request<T>(path: string, options: Omit<RequestInit, 'body'> & { body?: unknown } = {}): Promise<T> {
  const { body, ...rest } = options;
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(rest.headers as Record<string, string>) },
    ...rest,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    const error = new Error(err.error || 'Request failed') as Error & { status: number };
    error.status = res.status;
    throw error;
  }
  return res.json() as Promise<T>;
}

export const api = {
  getMe: () => request<User>('/auth/me'),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  localAuthEnabled: () => request<{ enabled: boolean }>('/auth/local/enabled'),
  localLogin: (username: string, password: string) =>
    request<User>('/auth/local', { method: 'POST', body: { username, password } }),

  getCategories: () => request<Category[]>('/api/categories'),
  createCategory: (name: string) => request<Category>('/api/categories', { method: 'POST', body: { name } }),
  renameCategory: (id: number, name: string) => request<Category>(`/api/categories/${id}`, { method: 'PATCH', body: { name } }),
  deleteCategory: (id: number) => request<{ ok: boolean }>(`/api/categories/${id}`, { method: 'DELETE' }),

  getTransactions: (params: TransactionFilters = {}) => {
    const q = new URLSearchParams();
    (Object.entries(params) as [string, string | number | undefined][]).forEach(([k, v]) => {
      if (v !== '' && v != null) q.set(k, String(v));
    });
    return request<Transaction[]>(`/api/transactions${q.toString() ? '?' + q : ''}`);
  },
  createTransaction: (data: TransactionPayload) => request<Transaction>('/api/transactions', { method: 'POST', body: data }),
  updateTransaction: (id: number, data: Partial<TransactionPayload>) => request<Transaction>(`/api/transactions/${id}`, { method: 'PATCH', body: data }),
  deleteTransaction: (id: number) => request<{ ok: boolean }>(`/api/transactions/${id}`, { method: 'DELETE' }),

  getBudget: (year: number, month: number) => request<BudgetSummary>(`/api/budget/${year}/${month}`),
  setBudget: (year: number, month: number, budget: number) =>
    request<{ budget: number; year: number; month: number }>(`/api/budget/${year}/${month}`, { method: 'PUT', body: { budget } }),
};
