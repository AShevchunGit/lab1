import { useMemo } from 'react';
import styled from 'styled-components';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Transaction } from '../api';

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.lg};
  @media (max-width: ${({ theme }) => theme.breakpoint}) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: 12px;
  box-shadow: ${({ theme }) => theme.shadow};
  padding: ${({ theme }) => theme.spacing.xl};
`;

const CardTitle = styled.h3`font-size: 16px; font-weight: 600; margin-bottom: ${({ theme }) => theme.spacing.lg};`;

const Empty = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  padding: ${({ theme }) => theme.spacing.xl} 0;
  font-size: 14px;
`;

const COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316','#84CC16','#06B6D4'];

interface Props {
  transactions: Transaction[];
  month: number;
  year: number;
}

export function SpendingCharts({ transactions, month, year }: Props) {
  const expenses = useMemo(
    () => transactions.filter(t => t.type === 'outcome'),
    [transactions]
  );

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of expenses) {
      const key = t.category_name ?? 'Uncategorized';
      map.set(key, (map.get(key) ?? 0) + t.amount);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const dailyData = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const map = new Map<number, number>();
    for (const t of expenses) {
      const day = new Date(t.date).getDate();
      map.set(day, (map.get(day) ?? 0) + t.amount);
    }
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: parseFloat((map.get(i + 1) ?? 0).toFixed(2)),
    }));
  }, [expenses, month, year]);

  const formatCurrency = (v: number) => `$${v.toFixed(2)}`;

  return (
    <Grid>
      <Card>
        <CardTitle>Spending by Category</CardTitle>
        {categoryData.length === 0 ? (
          <Empty>No expenses this month</Empty>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
              >
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend iconType="circle" iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card>
        <CardTitle>Daily Spending</CardTitle>
        {expenses.length === 0 ? (
          <Empty>No expenses this month</Empty>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tickFormatter={(v) => `$${v}`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(l) => `Day ${l}`} />
              <Bar dataKey="amount" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </Grid>
  );
}
