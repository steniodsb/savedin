import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'savedin' },
});

const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Telegram API Helpers ───

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
  if (replyMarkup) body.reply_markup = JSON.stringify(replyMarkup);

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function answerCallback(callbackQueryId: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function editMessage(chatId: number, messageId: number, text: string, replyMarkup?: any) {
  const body: any = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
  };
  if (replyMarkup) body.reply_markup = JSON.stringify(replyMarkup);

  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Session Management ───

async function getSession(chatId: number) {
  // Cleanup expired
  await supabase.rpc('cleanup_telegram_sessions');

  const { data } = await supabase
    .from('telegram_sessions')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data;
}

async function setSession(chatId: number, step: string, data: any) {
  // Delete old sessions
  await supabase.from('telegram_sessions').delete().eq('chat_id', chatId);

  await supabase.from('telegram_sessions').insert({
    chat_id: chatId,
    step,
    data,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
}

async function clearSession(chatId: number) {
  await supabase.from('telegram_sessions').delete().eq('chat_id', chatId);
}

// ─── User Link ───

async function getLinkedUser(chatId: number) {
  const { data } = await supabase
    .from('telegram_links')
    .select('user_id')
    .eq('chat_id', chatId)
    .eq('is_active', true)
    .single();

  return data?.user_id || null;
}

// ─── Data Fetchers ───

async function getUserDefaultEnvironment(userId: string) {
  const { data } = await supabase
    .from('environments')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .single();
  return data?.id || null;
}

async function getUserEnvironments(userId: string) {
  const { data } = await supabase
    .from('environments')
    .select('id, name, color')
    .eq('user_id', userId)
    .order('is_default', { ascending: false });
  return data || [];
}

async function getUserAccounts(userId: string) {
  const { data } = await supabase
    .from('accounts')
    .select('id, name, type, color, icon')
    .eq('user_id', userId)
    .eq('is_active', true);
  return data || [];
}

async function getUserCards(userId: string) {
  const { data } = await supabase
    .from('credit_cards')
    .select('id, name, color')
    .eq('user_id', userId)
    .eq('is_active', true);
  return data || [];
}

async function getUserCategories(userId: string, type: string) {
  const { data } = await supabase
    .from('categories')
    .select('id, name, icon, color')
    .or(`user_id.eq.${userId},is_default.eq.true`)
    .eq('type', type)
    .eq('is_active', true);
  return data || [];
}

// ─── Message Parser ───

interface ParsedTransaction {
  type: 'expense' | 'income';
  amount: number;
  description: string;
  categoryGuess?: string;
}

function parseMessage(text: string): ParsedTransaction | null {
  // Patterns: "gastei 50 no uber", "recebi 5000 salário", "50 mercado", "gasto 120.50 farmácia"
  const expensePatterns = [
    /(?:gastei|gasto|paguei|pago|comprei|despesa)\s+(?:r\$?\s*)?(\d+[.,]?\d*)\s*(?:(?:no|na|em|de|reais?)\s+)?(.+)/i,
    /(?:r\$?\s*)?(\d+[.,]?\d*)\s+(?:no|na|em|de)\s+(.+)/i,
    /^(\d+[.,]?\d*)\s+(.+)/i,
  ];

  const incomePatterns = [
    /(?:recebi|recebido|entrada|receita|ganhei)\s+(?:r\$?\s*)?(\d+[.,]?\d*)\s*(?:(?:de|do|da)\s+)?(.+)/i,
  ];

  // Try income first
  for (const pattern of incomePatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(',', '.'));
      if (amount > 0) {
        return { type: 'income', amount, description: match[2].trim() };
      }
    }
  }

  // Try expense
  for (const pattern of expensePatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(',', '.'));
      if (amount > 0) {
        return { type: 'expense', amount, description: match[2].trim() };
      }
    }
  }

  return null;
}

// Category guessing based on keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'alimentacao': ['mercado', 'supermercado', 'restaurante', 'lanche', 'comida', 'almoço', 'jantar', 'café', 'padaria', 'ifood', 'delivery', 'pizza'],
  'transporte': ['uber', 'taxi', 'ônibus', 'metrô', 'gasolina', 'combustível', '99', 'estacionamento', 'pedágio'],
  'moradia': ['aluguel', 'condomínio', 'água', 'luz', 'energia', 'internet', 'gás', 'iptu'],
  'saude': ['farmácia', 'médico', 'hospital', 'dentista', 'exame', 'consulta', 'remédio', 'academia'],
  'lazer': ['cinema', 'netflix', 'spotify', 'jogo', 'bar', 'festa', 'show', 'viagem', 'hotel'],
  'educacao': ['curso', 'escola', 'faculdade', 'livro', 'udemy', 'mensalidade'],
  'roupas': ['roupa', 'sapato', 'tênis', 'camisa', 'calça', 'vestido', 'loja'],
  'assinaturas': ['assinatura', 'plano', 'mensalidade', 'streaming'],
  'salario': ['salário', 'pagamento', 'holerite', 'pró-labore'],
  'freelance': ['freelance', 'freela', 'projeto', 'serviço'],
};

function guessCategory(description: string): string | undefined {
  const lower = description.toLowerCase();
  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return slug;
    }
  }
  return undefined;
}

// ─── Format Helpers ───

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// ─── Main Handler ───

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('OK', { status: 200 });
  }

  try {
    const update = await req.json();

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const messageId = cb.message.message_id;
      const data = cb.data;

      await answerCallback(cb.id);
      await handleCallback(chatId, messageId, data);
      return new Response('OK');
    }

    // Handle regular messages
    const message = update.message;
    if (!message?.text) return new Response('OK');

    const chatId = message.chat.id;
    const text = message.text.trim();
    const fromUser = message.from;

    // ── /start with link code ──
    if (text.startsWith('/start ')) {
      const code = text.split(' ')[1];
      if (code) {
        const { data: link, error } = await supabase
          .from('telegram_links')
          .select('*')
          .eq('link_code', code)
          .is('chat_id', null)
          .single();

        if (link) {
          await supabase
            .from('telegram_links')
            .update({
              chat_id: chatId,
              username: fromUser?.username || null,
              first_name: fromUser?.first_name || null,
              linked_at: new Date().toISOString(),
              is_active: true,
            })
            .eq('id', link.id);

          await sendMessage(chatId,
            `✅ <b>Conta vinculada com sucesso!</b>\n\n` +
            `Olá, ${fromUser?.first_name || 'usuário'}! Seu Telegram está conectado ao SaveDin.\n\n` +
            `Agora você pode registrar transações direto aqui. Exemplos:\n\n` +
            `💸 <i>gastei 50 no uber</i>\n` +
            `💰 <i>recebi 5000 salário</i>\n` +
            `🛒 <i>45.90 mercado</i>\n\n` +
            `Digite /ajuda para ver todos os comandos.`
          );
          return new Response('OK');
        } else {
          await sendMessage(chatId, '❌ Código inválido ou já utilizado. Gere um novo código no app SaveDin.');
          return new Response('OK');
        }
      }
    }

    // ── /start without code ──
    if (text === '/start') {
      const userId = await getLinkedUser(chatId);
      if (userId) {
        await sendMessage(chatId,
          `👋 Bem-vindo de volta ao <b>SaveDin</b>!\n\n` +
          `Sua conta já está vinculada. Envie uma mensagem para registrar uma transação.\n\n` +
          `Exemplos:\n💸 <i>gastei 50 no uber</i>\n💰 <i>recebi 5000 salário</i>\n\nDigite /ajuda para mais opções.`
        );
      } else {
        await sendMessage(chatId,
          `👋 Olá! Eu sou o bot do <b>SaveDin</b>.\n\n` +
          `Para começar, vincule sua conta:\n` +
          `1. Abra o SaveDin no navegador\n` +
          `2. Vá em Configurações → Telegram\n` +
          `3. Clique em "Conectar Telegram"\n\n` +
          `Após vincular, você poderá registrar transações direto aqui!`
        );
      }
      return new Response('OK');
    }

    // ── /ajuda ──
    if (text === '/ajuda' || text === '/help') {
      await sendMessage(chatId,
        `📖 <b>Comandos do SaveDin Bot</b>\n\n` +
        `<b>Registrar transações:</b>\n` +
        `💸 <i>gastei 50 no uber</i>\n` +
        `💰 <i>recebi 5000 salário</i>\n` +
        `🛒 <i>45.90 mercado</i>\n\n` +
        `<b>Consultas:</b>\n` +
        `/saldo — Ver saldo das contas\n` +
        `/resumo — Resumo do mês\n\n` +
        `<b>Outros:</b>\n` +
        `/cancelar — Cancelar operação em andamento\n` +
        `/desvincular — Desconectar conta\n` +
        `/ajuda — Esta mensagem`
      );
      return new Response('OK');
    }

    // ── /cancelar ──
    if (text === '/cancelar') {
      await clearSession(chatId);
      await sendMessage(chatId, '🚫 Operação cancelada.');
      return new Response('OK');
    }

    // ── /desvincular ──
    if (text === '/desvincular') {
      await supabase
        .from('telegram_links')
        .update({ is_active: false })
        .eq('chat_id', chatId);
      await clearSession(chatId);
      await sendMessage(chatId, '🔓 Conta desvinculada. Para vincular novamente, gere um novo código no app.');
      return new Response('OK');
    }

    // ── Check if user is linked ──
    const userId = await getLinkedUser(chatId);
    if (!userId) {
      await sendMessage(chatId,
        `⚠️ Sua conta não está vinculada.\n\nAbra o SaveDin → Configurações → Telegram para conectar.`
      );
      return new Response('OK');
    }

    // ── /saldo ──
    if (text === '/saldo') {
      const accounts = await getUserAccounts(userId);
      if (accounts.length === 0) {
        await sendMessage(chatId, '📭 Você ainda não tem contas cadastradas no SaveDin.');
      } else {
        let msg = '🏦 <b>Saldo das Contas</b>\n\n';
        let total = 0;
        for (const acc of accounts) {
          const { data: balanceData } = await supabase
            .from('accounts')
            .select('balance')
            .eq('id', acc.id)
            .single();
          const balance = balanceData?.balance || 0;
          total += Number(balance);
          msg += `${acc.name}: <b>${formatBRL(Number(balance))}</b>\n`;
        }
        msg += `\n💰 <b>Total: ${formatBRL(total)}</b>`;
        await sendMessage(chatId, msg);
      }
      return new Response('OK');
    }

    // ── /resumo ──
    if (text === '/resumo') {
      const now = new Date();
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

      const { data: txns } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', userId)
        .gte('date', firstDay)
        .lte('date', lastDay);

      let income = 0, expenses = 0;
      (txns || []).forEach((t: any) => {
        if (t.type === 'income') income += Number(t.amount);
        else if (t.type === 'expense') expenses += Number(t.amount);
      });

      const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      await sendMessage(chatId,
        `📊 <b>Resumo de ${monthName}</b>\n\n` +
        `📈 Receitas: <b>${formatBRL(income)}</b>\n` +
        `📉 Despesas: <b>${formatBRL(expenses)}</b>\n` +
        `💰 Saldo: <b>${formatBRL(income - expenses)}</b>\n` +
        `📝 Transações: <b>${(txns || []).length}</b>`
      );
      return new Response('OK');
    }

    // ── Check for active session (button flow) ──
    const session = await getSession(chatId);
    if (session && session.step !== 'idle') {
      // User is in a flow but sent text instead of clicking a button
      await sendMessage(chatId, '⚠️ Use os botões acima para continuar, ou /cancelar para desistir.');
      return new Response('OK');
    }

    // ── Parse transaction from natural language ──
    const parsed = parseMessage(text);
    if (!parsed) {
      await sendMessage(chatId,
        `🤔 Não entendi. Tente algo como:\n\n` +
        `💸 <i>gastei 50 no uber</i>\n` +
        `💰 <i>recebi 5000 salário</i>\n` +
        `🛒 <i>45.90 mercado</i>\n\n` +
        `/ajuda para ver todos os comandos`
      );
      return new Response('OK');
    }

    // Guess category
    const categorySlug = guessCategory(parsed.description);

    // Get user categories to find the ID
    const categories = await getUserCategories(userId, parsed.type);
    const matchedCategory = categorySlug
      ? categories.find((c: any) => c.name.toLowerCase().includes(categorySlug) || categorySlug.includes(c.name.toLowerCase()))
      : null;

    // Build session data
    const sessionData: any = {
      type: parsed.type,
      amount: parsed.amount,
      description: parsed.description,
      category_id: matchedCategory?.id || null,
      category_name: matchedCategory?.name || null,
      environment_id: null,
      account_id: null,
      card_id: null,
    };

    const emoji = parsed.type === 'income' ? '💰' : '💸';

    // Step 1: Check if user has multiple environments — ask which one
    const environments = await getUserEnvironments(userId);
    if (environments.length > 1) {
      await setSession(chatId, 'select_environment', sessionData);
      const envButtons: any[][] = [];
      for (const env of environments) {
        envButtons.push([{ text: `${env.name}`, callback_data: `env_${env.id}` }]);
      }
      envButtons.push([{ text: '❌ Cancelar', callback_data: 'cancel' }]);
      await sendMessage(chatId,
        `${emoji} <b>${formatBRL(parsed.amount)}</b> — ${parsed.description}\n\nEm qual ambiente?`,
        { inline_keyboard: envButtons }
      );
      return new Response('OK');
    } else if (environments.length === 1) {
      sessionData.environment_id = environments[0].id;
    } else {
      sessionData.environment_id = await getUserDefaultEnvironment(userId);
    }

    // Step 2: Ask for account/card
    const accounts = await getUserAccounts(userId);
    const cards = parsed.type === 'expense' ? await getUserCards(userId) : [];

    if (accounts.length === 0 && cards.length === 0) {
      // No accounts — save directly and confirm
      await saveTransaction(userId, chatId, sessionData);
      const catLabel = matchedCategory ? `📁 ${matchedCategory.name}` : '📁 Sem categoria';
      await sendMessage(chatId,
        `✅ <b>Transação registrada!</b>\n\n${emoji} ${formatBRL(parsed.amount)} — ${parsed.description}\n${catLabel}\n📅 ${new Date().toLocaleDateString('pt-BR')}`
      );
      return new Response('OK');
    }

    await setSession(chatId, 'select_account', sessionData);

    const catLabel = matchedCategory ? `📁 ${matchedCategory.name}` : '📁 Sem categoria';
    let confirmMsg = `${emoji} <b>${formatBRL(parsed.amount)}</b> — ${parsed.description}\n${catLabel}\n\nEm qual conta?`;

    const buttons: any[][] = [];
    const row: any[] = [];
    for (const acc of accounts) {
      row.push({ text: `🏦 ${acc.name}`, callback_data: `acc_${acc.id}` });
      if (row.length === 2) { buttons.push([...row]); row.length = 0; }
    }
    for (const card of cards) {
      row.push({ text: `💳 ${card.name}`, callback_data: `card_${card.id}` });
      if (row.length === 2) { buttons.push([...row]); row.length = 0; }
    }
    if (row.length > 0) buttons.push(row);
    buttons.push([{ text: '⏭️ Sem conta', callback_data: 'acc_none' }]);
    buttons.push([{ text: '❌ Cancelar', callback_data: 'cancel' }]);

    await sendMessage(chatId, confirmMsg, { inline_keyboard: buttons });
    return new Response('OK');

  } catch (error) {
    console.error('Telegram webhook error:', error);
    return new Response('Error', { status: 500 });
  }
});

// ─── Callback Handler ───

async function handleCallback(chatId: number, messageId: number, data: string) {
  if (data === 'cancel') {
    await clearSession(chatId);
    await editMessage(chatId, messageId, '🚫 Operação cancelada.');
    return;
  }

  const session = await getSession(chatId);
  if (!session) {
    await editMessage(chatId, messageId, '⏱️ Sessão expirada. Envie a transação novamente.');
    return;
  }

  const userId = await getLinkedUser(chatId);
  if (!userId) return;

  const sessionData = session.data as any;

  // Environment selection
  if (session.step === 'select_environment') {
    if (data.startsWith('env_')) {
      sessionData.environment_id = data.replace('env_', '');
    }

    // Move to account selection
    const accounts = await getUserAccounts(userId);
    const cards = sessionData.type === 'expense' ? await getUserCards(userId) : [];

    if (accounts.length === 0 && cards.length === 0) {
      await saveTransaction(userId, chatId, sessionData);
      const emoji = sessionData.type === 'income' ? '💰' : '💸';
      await editMessage(chatId, messageId,
        `✅ <b>Transação registrada!</b>\n\n${emoji} ${formatBRL(sessionData.amount)} — ${sessionData.description}\n📁 ${sessionData.category_name || 'Sem categoria'}\n📅 ${new Date().toLocaleDateString('pt-BR')}`
      );
      await clearSession(chatId);
      return;
    }

    await setSession(chatId, 'select_account', sessionData);
    const emoji = sessionData.type === 'income' ? '💰' : '💸';
    const btns: any[][] = [];
    const row: any[] = [];
    for (const acc of accounts) {
      row.push({ text: `🏦 ${acc.name}`, callback_data: `acc_${acc.id}` });
      if (row.length === 2) { btns.push([...row]); row.length = 0; }
    }
    for (const card of cards) {
      row.push({ text: `💳 ${card.name}`, callback_data: `card_${card.id}` });
      if (row.length === 2) { btns.push([...row]); row.length = 0; }
    }
    if (row.length > 0) btns.push(row);
    btns.push([{ text: '⏭️ Sem conta', callback_data: 'acc_none' }]);
    btns.push([{ text: '❌ Cancelar', callback_data: 'cancel' }]);

    await editMessage(chatId, messageId,
      `${emoji} <b>${formatBRL(sessionData.amount)}</b> — ${sessionData.description}\n\nEm qual conta?`,
      { inline_keyboard: btns }
    );
    return;
  }

  if (session.step === 'select_account') {
    if (data.startsWith('acc_')) {
      const accountId = data === 'acc_none' ? null : data.replace('acc_', '');
      sessionData.account_id = accountId;
      sessionData.card_id = null;
    } else if (data.startsWith('card_')) {
      sessionData.card_id = data.replace('card_', '');
      sessionData.account_id = null;
    }

    // If we don't have a category, ask for it
    if (!sessionData.category_id) {
      await setSession(chatId, 'select_category', sessionData);

      const categories = await getUserCategories(userId, sessionData.type);
      const buttons: any[][] = [];
      const row: any[] = [];
      for (const cat of categories.slice(0, 10)) {
        row.push({ text: cat.name, callback_data: `cat_${cat.id}` });
        if (row.length === 2) { buttons.push([...row]); row.length = 0; }
      }
      if (row.length > 0) buttons.push(row);
      buttons.push([{ text: '⏭️ Sem categoria', callback_data: 'cat_none' }]);
      buttons.push([{ text: '❌ Cancelar', callback_data: 'cancel' }]);

      await editMessage(chatId, messageId,
        `${sessionData.type === 'income' ? '💰' : '💸'} <b>${formatBRL(sessionData.amount)}</b> — ${sessionData.description}\n\nQual categoria?`,
        { inline_keyboard: buttons }
      );
      return;
    }

    // Category already set, save directly
    await saveTransaction(userId, chatId, sessionData);
    await clearSession(chatId);

    const emoji = sessionData.type === 'income' ? '💰' : '💸';
    await editMessage(chatId, messageId,
      `✅ <b>Transação registrada!</b>\n\n` +
      `${emoji} ${formatBRL(sessionData.amount)} — ${sessionData.description}\n` +
      `📁 ${sessionData.category_name || 'Sem categoria'}\n` +
      `📅 ${new Date().toLocaleDateString('pt-BR')}`
    );
    return;
  }

  if (session.step === 'select_category') {
    if (data.startsWith('cat_')) {
      const catId = data === 'cat_none' ? null : data.replace('cat_', '');
      sessionData.category_id = catId;

      if (catId) {
        const categories = await getUserCategories(userId, sessionData.type);
        const cat = categories.find((c: any) => c.id === catId);
        if (cat) sessionData.category_name = cat.name;
      }
    }

    // Save transaction
    await saveTransaction(userId, chatId, sessionData);
    await clearSession(chatId);

    const emoji = sessionData.type === 'income' ? '💰' : '💸';
    await editMessage(chatId, messageId,
      `✅ <b>Transação registrada!</b>\n\n` +
      `${emoji} ${formatBRL(sessionData.amount)} — ${sessionData.description}\n` +
      `📁 ${sessionData.category_name || 'Sem categoria'}\n` +
      `📅 ${new Date().toLocaleDateString('pt-BR')}`
    );
    return;
  }
}

// ─── Save Transaction ───

async function saveTransaction(userId: string, chatId: number, data: any) {
  const today = new Date().toISOString().split('T')[0];

  // Get environment (from data or default)
  let envId = data.environment_id;
  if (!envId) {
    envId = await getUserDefaultEnvironment(userId);
  }

  const { error } = await supabase.from('transactions').insert({
    user_id: userId,
    environment_id: envId,
    type: data.type,
    amount: data.amount,
    description: data.description,
    date: today,
    category_id: data.category_id || null,
    account_id: data.account_id || null,
    card_id: data.card_id || null,
    status: 'paid',
    registered_via: 'telegram',
  });

  if (error) {
    console.error('Error saving transaction:', error);
    await sendMessage(chatId, '❌ Erro ao salvar transação. Tente novamente.');
  }
}
