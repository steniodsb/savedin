import { useState, useCallback } from 'react';
import { useTransactionsData } from './useTransactionsData';
import { useAccountsData } from './useAccountsData';
import { useCreditCardsData } from './useCreditCardsData';
import { useSavedinCategories } from './useSavedinCategories';
import { useFinancialGoalsData } from './useFinancialGoalsData';
import { useEnvironmentsData } from './useEnvironmentsData';
import { useUIStore } from '@/store/useUIStore';
import { formatCurrency } from '@/types/savedin';

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  buttons?: { label: string; value: string }[];
  timestamp: Date;
}

interface PendingTransaction {
  type: 'expense' | 'income';
  amount: number;
  description: string;
  category_id: string | null;
  category_name: string | null;
  account_id: string | null;
  card_id: string | null;
  environment_id: string | null;
  step: 'select_environment' | 'select_account' | 'select_category' | 'confirm' | null;
}

// Category keyword matching
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'moradia': ['aluguel', 'condomínio', 'água', 'luz', 'energia', 'internet', 'gás', 'iptu'],
  'alimentação': ['mercado', 'supermercado', 'restaurante', 'lanche', 'comida', 'almoço', 'jantar', 'café', 'padaria', 'ifood', 'delivery', 'pizza'],
  'transporte': ['uber', 'taxi', 'ônibus', 'metrô', 'gasolina', 'combustível', '99', 'estacionamento', 'pedágio'],
  'saúde': ['farmácia', 'médico', 'hospital', 'dentista', 'exame', 'consulta', 'remédio', 'academia'],
  'lazer': ['cinema', 'netflix', 'spotify', 'jogo', 'bar', 'festa', 'show', 'viagem', 'hotel'],
  'educação': ['curso', 'escola', 'faculdade', 'livro', 'udemy', 'mensalidade'],
  'roupas': ['roupa', 'sapato', 'tênis', 'camisa', 'calça', 'vestido', 'loja'],
  'assinaturas': ['assinatura', 'plano', 'streaming'],
  'salário': ['salário', 'pagamento', 'holerite', 'pró-labore'],
  'freelance': ['freelance', 'freela', 'projeto', 'serviço prestado'],
};

function guessCategory(description: string): string | undefined {
  const lower = description.toLowerCase();
  for (const [name, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return name;
  }
  return undefined;
}

function parseMessage(text: string): { type: 'expense' | 'income'; amount: number; description: string } | null {
  const expensePatterns = [
    /(?:gastei|gasto|paguei|pago|comprei|despesa)\s+(?:r\$?\s*)?(\d+[.,]?\d*)\s*(?:(?:no|na|em|de|reais?)\s+)?(.+)/i,
    /(?:r\$?\s*)?(\d+[.,]?\d*)\s+(?:no|na|em|de)\s+(.+)/i,
    /^(\d+[.,]?\d*)\s+(.+)/i,
  ];
  const incomePatterns = [
    /(?:recebi|recebido|entrada|receita|ganhei)\s+(?:r\$?\s*)?(\d+[.,]?\d*)\s*(?:(?:de|do|da)\s+)?(.+)/i,
  ];

  for (const pattern of incomePatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(',', '.'));
      if (amount > 0) return { type: 'income', amount, description: match[2].trim() };
    }
  }
  for (const pattern of expensePatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(',', '.'));
      if (amount > 0) return { type: 'expense', amount, description: match[2].trim() };
    }
  }
  return null;
}

export function useChatBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: '👋 Olá! Sou o assistente do SaveDin.\n\nVocê pode:\n💸 Registrar despesas: "gastei 50 no uber"\n💰 Registrar receitas: "recebi 5000 salário"\n📊 Consultar: "saldo", "resumo", "gastos por categoria"',
      timestamp: new Date(),
    },
  ]);
  const [pending, setPending] = useState<PendingTransaction | null>(null);

  const { selectedEnvironmentId } = useUIStore();
  const { environments, defaultEnvironment } = useEnvironmentsData();
  const { transactions, addTransaction, getMonthlyIncome, getMonthlyExpenses, getExpensesByCategory } = useTransactionsData();
  const { accounts, totalBalance } = useAccountsData();
  const { creditCards } = useCreditCardsData();
  const { categories, expenseCategories, incomeCategories } = useSavedinCategories();
  const { activeGoals, totalSaved, totalTarget } = useFinancialGoalsData();

  const addMessage = useCallback((role: 'user' | 'bot', text: string, buttons?: { label: string; value: string }[]) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role,
      text,
      buttons,
      timestamp: new Date(),
    }]);
  }, []);

  const handleButtonClick = useCallback(async (value: string) => {
    if (!pending) return;

    if (value === 'cancel') {
      setPending(null);
      addMessage('bot', '🚫 Operação cancelada.');
      return;
    }

    if (pending.step === 'select_environment') {
      const updated = { ...pending };
      if (value.startsWith('env_')) {
        updated.environment_id = value.replace('env_', '');
      }
      // Move to account selection
      updated.step = 'select_account';
      setPending(updated);

      const activeAccounts = accounts.filter(a => a.is_active);
      const activeCards = updated.type === 'expense' ? creditCards.filter(c => c.is_active) : [];

      if (activeAccounts.length === 0 && activeCards.length === 0) {
        if (!updated.category_id) {
          updated.step = 'select_category';
          setPending(updated);
          const cats = updated.type === 'income' ? incomeCategories : expenseCategories;
          const btns = cats.slice(0, 8).map(c => ({ label: c.name, value: `cat_${c.id}` }));
          btns.push({ label: '⏭️ Sem categoria', value: 'cat_none' });
          btns.push({ label: '❌ Cancelar', value: 'cancel' });
          addMessage('bot', 'Qual categoria?', btns);
        } else {
          await saveTransaction(updated);
        }
        return;
      }

      const emoji = updated.type === 'income' ? '💰' : '💸';
      const btns: { label: string; value: string }[] = [];
      activeAccounts.forEach(a => btns.push({ label: `🏦 ${a.name}`, value: `acc_${a.id}` }));
      activeCards.forEach(c => btns.push({ label: `💳 ${c.name}`, value: `card_${c.id}` }));
      btns.push({ label: '⏭️ Sem conta', value: 'acc_none' });
      btns.push({ label: '❌ Cancelar', value: 'cancel' });
      addMessage('bot', `${emoji} ${formatCurrency(updated.amount)} — ${updated.description}\n\nEm qual conta?`, btns);
      return;
    }

    if (pending.step === 'select_account') {
      const updated = { ...pending };

      if (value.startsWith('acc_')) {
        updated.account_id = value === 'acc_none' ? null : value.replace('acc_', '');
        updated.card_id = null;
      } else if (value.startsWith('card_')) {
        updated.card_id = value.replace('card_', '');
        updated.account_id = null;
      }

      // If no category, ask for it
      if (!updated.category_id) {
        updated.step = 'select_category';
        setPending(updated);

        const cats = updated.type === 'income' ? incomeCategories : expenseCategories;
        const buttons = cats.slice(0, 8).map(c => ({ label: c.name, value: `cat_${c.id}` }));
        buttons.push({ label: '⏭️ Sem categoria', value: 'cat_none' });
        buttons.push({ label: '❌ Cancelar', value: 'cancel' });

        addMessage('bot', 'Qual categoria?', buttons);
        return;
      }

      // Save
      await saveTransaction(updated);
      return;
    }

    if (pending.step === 'select_category') {
      const updated = { ...pending };
      if (value.startsWith('cat_') && value !== 'cat_none') {
        const catId = value.replace('cat_', '');
        updated.category_id = catId;
        const cat = categories.find(c => c.id === catId);
        if (cat) updated.category_name = cat.name;
      }
      await saveTransaction(updated);
      return;
    }
  }, [pending, categories, expenseCategories, incomeCategories]);

  const saveTransaction = async (data: PendingTransaction) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await addTransaction({
        type: data.type,
        amount: data.amount,
        description: data.description,
        date: today,
        category_id: data.category_id,
        account_id: data.account_id,
        card_id: data.card_id,
        notes: null,
        is_recurring: false,
        recurrence_type: null,
        installment_total: null,
        installment_current: null,
        registered_via: 'chatbot',
        tags: null,
        invoice_id: null,
      });

      const emoji = data.type === 'income' ? '💰' : '💸';
      addMessage('bot',
        `✅ Transação registrada!\n\n` +
        `${emoji} ${formatCurrency(data.amount)} — ${data.description}\n` +
        `📁 ${data.category_name || 'Sem categoria'}\n` +
        `📅 ${new Date().toLocaleDateString('pt-BR')}`
      );
    } catch {
      addMessage('bot', '❌ Erro ao registrar transação. Tente novamente.');
    }
    setPending(null);
  };

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    addMessage('user', trimmed);

    const lower = trimmed.toLowerCase();

    // ── Commands ──
    if (lower === 'saldo' || lower === '/saldo') {
      if (accounts.length === 0) {
        addMessage('bot', '📭 Nenhuma conta cadastrada.');
        return;
      }
      let msg = '🏦 **Saldo das Contas**\n\n';
      accounts.filter(a => a.is_active).forEach(a => {
        msg += `${a.name}: ${formatCurrency(Number(a.balance))}\n`;
      });
      msg += `\n💰 Total: ${formatCurrency(totalBalance)}`;
      addMessage('bot', msg);
      return;
    }

    if (lower === 'resumo' || lower === '/resumo') {
      const now = new Date();
      const m = now.getMonth() + 1;
      const y = now.getFullYear();
      const income = getMonthlyIncome(m, y);
      const expenses = getMonthlyExpenses(m, y);
      const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      addMessage('bot',
        `📊 Resumo de ${monthName}\n\n` +
        `📈 Receitas: ${formatCurrency(income)}\n` +
        `📉 Despesas: ${formatCurrency(expenses)}\n` +
        `💰 Saldo: ${formatCurrency(income - expenses)}`
      );
      return;
    }

    if (lower.includes('categoria') || lower.includes('gastos por')) {
      const now = new Date();
      const catExpenses = getExpensesByCategory(now.getMonth() + 1, now.getFullYear());
      if (catExpenses.length === 0) {
        addMessage('bot', '📭 Nenhuma despesa este mês.');
        return;
      }
      let msg = '📊 Gastos por Categoria\n\n';
      catExpenses.sort((a, b) => b.amount - a.amount).slice(0, 8).forEach(item => {
        msg += `${item.category?.name || 'Outros'}: ${formatCurrency(item.amount)} (${item.percentage.toFixed(0)}%)\n`;
      });
      addMessage('bot', msg);
      return;
    }

    if (lower.includes('objetivo') || lower.includes('meta')) {
      if (activeGoals.length === 0) {
        addMessage('bot', '🎯 Nenhum objetivo ativo.');
        return;
      }
      let msg = '🎯 Objetivos\n\n';
      activeGoals.forEach(g => {
        const pct = Number(g.target_amount) > 0 ? (Number(g.current_amount) / Number(g.target_amount)) * 100 : 0;
        msg += `${g.icon} ${g.name}: ${pct.toFixed(0)}% (${formatCurrency(Number(g.current_amount))} / ${formatCurrency(Number(g.target_amount))})\n`;
      });
      addMessage('bot', msg);
      return;
    }

    if (lower === 'ajuda' || lower === '/ajuda' || lower === 'help') {
      addMessage('bot',
        '📖 O que posso fazer:\n\n' +
        '💸 Registrar: "gastei 50 no uber"\n' +
        '💰 Receita: "recebi 5000 salário"\n' +
        '🏦 "saldo" — ver contas\n' +
        '📊 "resumo" — resumo do mês\n' +
        '📁 "gastos por categoria"\n' +
        '🎯 "objetivos" — ver metas\n' +
        '❓ "ajuda" — esta mensagem'
      );
      return;
    }

    // ── Parse transaction ──
    const parsed = parseMessage(trimmed);
    if (!parsed) {
      addMessage('bot',
        '🤔 Não entendi. Tente:\n\n' +
        '💸 "gastei 50 no uber"\n' +
        '💰 "recebi 5000 salário"\n' +
        '📊 "saldo", "resumo", "ajuda"'
      );
      return;
    }

    // Guess category
    const guessedName = guessCategory(parsed.description);
    const allCats = parsed.type === 'income' ? incomeCategories : expenseCategories;
    const matchedCat = guessedName
      ? allCats.find(c => c.name.toLowerCase().includes(guessedName))
      : null;

    // Determine environment
    const envId = selectedEnvironmentId || (environments.length === 1 ? environments[0]?.id : null);

    const txData: PendingTransaction = {
      type: parsed.type,
      amount: parsed.amount,
      description: parsed.description,
      category_id: matchedCat?.id || null,
      category_name: matchedCat?.name || null,
      account_id: null,
      card_id: null,
      environment_id: envId || null,
      step: envId ? 'select_account' : 'select_environment',
    };

    // If no environment selected and multiple environments, ask first
    if (!envId && environments.length > 1) {
      setPending(txData);
      const emoji = parsed.type === 'income' ? '💰' : '💸';
      const envButtons = environments.map(e => ({ label: `${e.name}`, value: `env_${e.id}` }));
      envButtons.push({ label: '❌ Cancelar', value: 'cancel' });
      addMessage('bot', `${emoji} ${formatCurrency(parsed.amount)} — ${parsed.description}\n\nEm qual ambiente?`, envButtons);
      return;
    }

    const activeAccounts = accounts.filter(a => a.is_active);
    const activeCards = parsed.type === 'expense' ? creditCards.filter(c => c.is_active) : [];

    // If no accounts/cards, save directly
    if (activeAccounts.length === 0 && activeCards.length === 0) {
      setPending(null);
      if (!txData.category_id) {
        txData.step = 'select_category';
        setPending(txData);
        const buttons = allCats.slice(0, 8).map(c => ({ label: c.name, value: `cat_${c.id}` }));
        buttons.push({ label: '⏭️ Sem categoria', value: 'cat_none' });
        buttons.push({ label: '❌ Cancelar', value: 'cancel' });

        const emoji = parsed.type === 'income' ? '💰' : '💸';
        addMessage('bot', `${emoji} ${formatCurrency(parsed.amount)} — ${parsed.description}\n\nQual categoria?`, buttons);
      } else {
        await saveTransaction(txData);
      }
      return;
    }

    setPending(txData);

    const emoji = parsed.type === 'income' ? '💰' : '💸';
    const catLabel = matchedCat ? `📁 ${matchedCat.name}` : '';

    const buttons: { label: string; value: string }[] = [];
    activeAccounts.forEach(a => buttons.push({ label: `🏦 ${a.name}`, value: `acc_${a.id}` }));
    activeCards.forEach(c => buttons.push({ label: `💳 ${c.name}`, value: `card_${c.id}` }));
    buttons.push({ label: '⏭️ Sem conta', value: 'acc_none' });
    buttons.push({ label: '❌ Cancelar', value: 'cancel' });

    addMessage('bot',
      `${emoji} ${formatCurrency(parsed.amount)} — ${parsed.description}\n${catLabel}\n\nEm qual conta?`,
      buttons
    );
  }, [accounts, creditCards, categories, expenseCategories, incomeCategories, transactions, activeGoals, totalBalance]);

  return {
    messages,
    sendMessage,
    handleButtonClick,
    hasPending: !!pending,
  };
}
