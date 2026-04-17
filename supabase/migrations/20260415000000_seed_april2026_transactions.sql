-- ============================================
-- SaveDin - Seed Transações Abril 2026
-- 81 transações totais de todos os cartões e contas
-- ============================================

-- Este script usa o auth.uid() do usuário logado.
-- Para rodar via dashboard/CLI do Supabase, substitua
-- auth.uid() pelo UUID real do usuário.

DO $$
DECLARE
  v_user_id UUID;
  v_env_id UUID;
  -- Cartões de crédito
  v_card_nu_stenio UUID;
  v_card_nu_webdesign UUID;
  v_card_nu_info UUID;
  v_card_itau UUID;
  -- Contas (boleto/pix)
  v_account_pessoal UUID;
  v_account_webdesign UUID;
  v_account_wavehost UUID;
  -- Categorias (default - sem user_id)
  v_cat_moradia UUID;
  v_cat_alimentacao UUID;
  v_cat_transporte UUID;
  v_cat_saude UUID;
  v_cat_assinaturas UUID;
  v_cat_outros UUID;
  v_cat_roupas UUID;
  -- Categorias customizadas (com user_id)
  v_cat_casa UUID;
  v_cat_farmacia UUID;
  v_cat_higiene UUID;
  v_cat_custo_op UUID;
  v_cat_automovel UUID;
  v_cat_compras_online UUID;
  v_cat_vestuario UUID;
  v_cat_servicos UUID;
  -- Subcategorias
  v_sub_reforma UUID;
  v_sub_combustivel UUID;
  v_sub_delivery UUID;
  v_sub_mercadinho UUID;
  v_sub_restaurante UUID;
  v_sub_supermercado UUID;
  v_sub_medicamentos UUID;
  v_sub_perfumaria UUID;
  v_sub_cosmeticos UUID;
  v_sub_suplementacao UUID;
  v_sub_plano_saude UUID;
  v_sub_plano_odonto UUID;
  v_sub_uber UUID;
  v_sub_marketing UUID;
  v_sub_ia UUID;
  v_sub_saas UUID;
  v_sub_contabilidade UUID;
  v_sub_impostos UUID;
  v_sub_hosting UUID;
  v_sub_luz_gas UUID;
  v_sub_condominio UUID;
  v_sub_internet UUID;
  v_sub_telefonia UUID;
  v_sub_financiamento UUID;
  v_sub_seguro UUID;
  v_sub_ml UUID;
  -- Faturas
  v_inv_nu_stenio_05 UUID;
  v_inv_nu_webdesign_05 UUID;
  v_inv_nu_info_05 UUID;
  v_inv_itau_05 UUID;
  -- Recurrence groups (para parcelas)
  v_grp_interruptores UUID := gen_random_uuid();
  v_grp_jim_stenio UUID := gen_random_uuid();
  v_grp_polimetcom UUID := gen_random_uuid();
  v_grp_install4you UUID := gen_random_uuid();
  v_grp_ddmaquin UUID := gen_random_uuid();
  v_grp_drogasil UUID := gen_random_uuid();
  v_grp_raia UUID := gen_random_uuid();
  v_grp_rd_saude UUID := gen_random_uuid();
  v_grp_renner UUID := gen_random_uuid();
  v_grp_americanas UUID := gen_random_uuid();
  v_grp_jim_itau UUID := gen_random_uuid();
  v_grp_apto UUID := gen_random_uuid();
  v_grp_mei UUID := gen_random_uuid();
BEGIN

  -- ============================================
  -- 1. Buscar o usuário (primeiro usuário ativo)
  -- ============================================
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário encontrado';
  END IF;

  -- ============================================
  -- 2. Buscar ou criar o environment padrão
  -- ============================================
  SELECT id INTO v_env_id FROM savedin.environments WHERE user_id = v_user_id AND is_default = true LIMIT 1;
  IF v_env_id IS NULL THEN
    INSERT INTO savedin.environments (user_id, name, color, icon, is_default)
    VALUES (v_user_id, 'Pessoal', '#4CAF50', 'User', true)
    RETURNING id INTO v_env_id;
  END IF;

  -- ============================================
  -- 3. Buscar categorias padrão (is_default = true)
  -- ============================================
  SELECT id INTO v_cat_moradia FROM savedin.categories WHERE slug = 'moradia' AND is_default = true LIMIT 1;
  SELECT id INTO v_cat_alimentacao FROM savedin.categories WHERE slug = 'alimentacao' AND is_default = true LIMIT 1;
  SELECT id INTO v_cat_transporte FROM savedin.categories WHERE slug = 'transporte' AND is_default = true LIMIT 1;
  SELECT id INTO v_cat_saude FROM savedin.categories WHERE slug = 'saude' AND is_default = true LIMIT 1;
  SELECT id INTO v_cat_assinaturas FROM savedin.categories WHERE slug = 'assinaturas' AND is_default = true LIMIT 1;
  SELECT id INTO v_cat_outros FROM savedin.categories WHERE slug = 'outros' AND type = 'expense' AND is_default = true LIMIT 1;
  SELECT id INTO v_cat_roupas FROM savedin.categories WHERE slug = 'roupas' AND is_default = true LIMIT 1;

  -- ============================================
  -- 4. Criar categorias customizadas (se não existirem)
  -- ============================================

  -- Casa
  SELECT id INTO v_cat_casa FROM savedin.categories WHERE slug = 'casa' AND (user_id = v_user_id OR is_default = true) LIMIT 1;
  IF v_cat_casa IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default)
    VALUES (v_user_id, v_env_id, 'Casa', 'casa', 'expense', 'Home', '#795548', '#EFEBE9', false)
    RETURNING id INTO v_cat_casa;
  END IF;

  -- Farmácia
  SELECT id INTO v_cat_farmacia FROM savedin.categories WHERE slug = 'farmacia' AND (user_id = v_user_id OR is_default = true) LIMIT 1;
  IF v_cat_farmacia IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default)
    VALUES (v_user_id, v_env_id, 'Farmácia', 'farmacia', 'expense', 'Pill', '#E91E63', '#FCE4EC', false)
    RETURNING id INTO v_cat_farmacia;
  END IF;

  -- Higiene
  SELECT id INTO v_cat_higiene FROM savedin.categories WHERE slug = 'higiene' AND (user_id = v_user_id OR is_default = true) LIMIT 1;
  IF v_cat_higiene IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default)
    VALUES (v_user_id, v_env_id, 'Higiene', 'higiene', 'expense', 'Droplets', '#00BCD4', '#E0F7FA', false)
    RETURNING id INTO v_cat_higiene;
  END IF;

  -- Custo Operacional
  SELECT id INTO v_cat_custo_op FROM savedin.categories WHERE slug = 'custo-operacional' AND (user_id = v_user_id OR is_default = true) LIMIT 1;
  IF v_cat_custo_op IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default)
    VALUES (v_user_id, v_env_id, 'Custo Operacional', 'custo-operacional', 'expense', 'Building2', '#455A64', '#ECEFF1', false)
    RETURNING id INTO v_cat_custo_op;
  END IF;

  -- Automóvel
  SELECT id INTO v_cat_automovel FROM savedin.categories WHERE slug = 'automovel' AND (user_id = v_user_id OR is_default = true) LIMIT 1;
  IF v_cat_automovel IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default)
    VALUES (v_user_id, v_env_id, 'Automóvel', 'automovel', 'expense', 'Car', '#F57C00', '#FFF3E0', false)
    RETURNING id INTO v_cat_automovel;
  END IF;

  -- Compras Online
  SELECT id INTO v_cat_compras_online FROM savedin.categories WHERE slug = 'compras-online' AND (user_id = v_user_id OR is_default = true) LIMIT 1;
  IF v_cat_compras_online IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default)
    VALUES (v_user_id, v_env_id, 'Compras Online', 'compras-online', 'expense', 'ShoppingBag', '#7B1FA2', '#F3E5F5', false)
    RETURNING id INTO v_cat_compras_online;
  END IF;

  -- Vestuário
  SELECT id INTO v_cat_vestuario FROM savedin.categories WHERE slug = 'vestuario' AND (user_id = v_user_id OR is_default = true) LIMIT 1;
  IF v_cat_vestuario IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default)
    VALUES (v_user_id, v_env_id, 'Vestuário', 'vestuario', 'expense', 'Shirt', '#9C27B0', '#F3E5F5', false)
    RETURNING id INTO v_cat_vestuario;
  END IF;

  -- Serviços
  SELECT id INTO v_cat_servicos FROM savedin.categories WHERE slug = 'servicos' AND (user_id = v_user_id OR is_default = true) LIMIT 1;
  IF v_cat_servicos IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default)
    VALUES (v_user_id, v_env_id, 'Serviços', 'servicos', 'expense', 'Wrench', '#546E7A', '#ECEFF1', false)
    RETURNING id INTO v_cat_servicos;
  END IF;

  -- ============================================
  -- 5. Criar subcategorias (se não existirem)
  -- ============================================

  -- Reforma (sub de Casa)
  SELECT id INTO v_sub_reforma FROM savedin.categories WHERE slug = 'reforma' AND parent_id = v_cat_casa LIMIT 1;
  IF v_sub_reforma IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Reforma', 'reforma', 'expense', 'Hammer', '#795548', '#EFEBE9', false, v_cat_casa)
    RETURNING id INTO v_sub_reforma;
  END IF;

  -- Combustível (sub de Transporte)
  SELECT id INTO v_sub_combustivel FROM savedin.categories WHERE slug = 'combustivel' AND parent_id = v_cat_transporte LIMIT 1;
  IF v_sub_combustivel IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Combustível', 'combustivel', 'expense', 'Fuel', '#FF9800', '#FFF3E0', false, v_cat_transporte)
    RETURNING id INTO v_sub_combustivel;
  END IF;

  -- Delivery (sub de Alimentação)
  SELECT id INTO v_sub_delivery FROM savedin.categories WHERE slug = 'delivery' AND parent_id = v_cat_alimentacao LIMIT 1;
  IF v_sub_delivery IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Delivery', 'delivery', 'expense', 'Bike', '#4CAF50', '#EAFBE7', false, v_cat_alimentacao)
    RETURNING id INTO v_sub_delivery;
  END IF;

  -- Mercadinho (sub de Alimentação)
  SELECT id INTO v_sub_mercadinho FROM savedin.categories WHERE slug = 'mercadinho' AND parent_id = v_cat_alimentacao LIMIT 1;
  IF v_sub_mercadinho IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Mercadinho', 'mercadinho', 'expense', 'Store', '#66BB6A', '#EAFBE7', false, v_cat_alimentacao)
    RETURNING id INTO v_sub_mercadinho;
  END IF;

  -- Restaurante (sub de Alimentação)
  SELECT id INTO v_sub_restaurante FROM savedin.categories WHERE slug = 'restaurante' AND parent_id = v_cat_alimentacao LIMIT 1;
  IF v_sub_restaurante IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Restaurante', 'restaurante', 'expense', 'UtensilsCrossed', '#388E3C', '#EAFBE7', false, v_cat_alimentacao)
    RETURNING id INTO v_sub_restaurante;
  END IF;

  -- Supermercado (sub de Alimentação)
  SELECT id INTO v_sub_supermercado FROM savedin.categories WHERE slug = 'supermercado' AND parent_id = v_cat_alimentacao LIMIT 1;
  IF v_sub_supermercado IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Supermercado', 'supermercado', 'expense', 'ShoppingCart', '#2E7D32', '#EAFBE7', false, v_cat_alimentacao)
    RETURNING id INTO v_sub_supermercado;
  END IF;

  -- Medicamentos (sub de Farmácia)
  SELECT id INTO v_sub_medicamentos FROM savedin.categories WHERE slug = 'medicamentos' AND parent_id = v_cat_farmacia LIMIT 1;
  IF v_sub_medicamentos IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Medicamentos', 'medicamentos', 'expense', 'Pill', '#E91E63', '#FCE4EC', false, v_cat_farmacia)
    RETURNING id INTO v_sub_medicamentos;
  END IF;

  -- Perfumaria (sub de Higiene)
  SELECT id INTO v_sub_perfumaria FROM savedin.categories WHERE slug = 'perfumaria' AND parent_id = v_cat_higiene LIMIT 1;
  IF v_sub_perfumaria IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Perfumaria', 'perfumaria', 'expense', 'Sparkles', '#00BCD4', '#E0F7FA', false, v_cat_higiene)
    RETURNING id INTO v_sub_perfumaria;
  END IF;

  -- Cosméticos (sub de Higiene)
  SELECT id INTO v_sub_cosmeticos FROM savedin.categories WHERE slug = 'cosmeticos' AND parent_id = v_cat_higiene LIMIT 1;
  IF v_sub_cosmeticos IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Cosméticos', 'cosmeticos', 'expense', 'Sparkle', '#0097A7', '#E0F7FA', false, v_cat_higiene)
    RETURNING id INTO v_sub_cosmeticos;
  END IF;

  -- Suplementação (sub de Saúde)
  SELECT id INTO v_sub_suplementacao FROM savedin.categories WHERE slug = 'suplementacao' AND parent_id = v_cat_saude LIMIT 1;
  IF v_sub_suplementacao IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Suplementação', 'suplementacao', 'expense', 'Dumbbell', '#F44336', '#FFEBEE', false, v_cat_saude)
    RETURNING id INTO v_sub_suplementacao;
  END IF;

  -- Plano de Saúde (sub de Saúde)
  SELECT id INTO v_sub_plano_saude FROM savedin.categories WHERE slug = 'plano-saude' AND parent_id = v_cat_saude LIMIT 1;
  IF v_sub_plano_saude IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Plano de Saúde', 'plano-saude', 'expense', 'HeartPulse', '#D32F2F', '#FFEBEE', false, v_cat_saude)
    RETURNING id INTO v_sub_plano_saude;
  END IF;

  -- Plano Odontológico (sub de Saúde)
  SELECT id INTO v_sub_plano_odonto FROM savedin.categories WHERE slug = 'plano-odonto' AND parent_id = v_cat_saude LIMIT 1;
  IF v_sub_plano_odonto IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Plano Odontológico', 'plano-odonto', 'expense', 'Smile', '#C62828', '#FFEBEE', false, v_cat_saude)
    RETURNING id INTO v_sub_plano_odonto;
  END IF;

  -- Uber (sub de Transporte)
  SELECT id INTO v_sub_uber FROM savedin.categories WHERE slug = 'uber' AND parent_id = v_cat_transporte LIMIT 1;
  IF v_sub_uber IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Uber', 'uber', 'expense', 'Car', '#FF9800', '#FFF3E0', false, v_cat_transporte)
    RETURNING id INTO v_sub_uber;
  END IF;

  -- Marketing (sub de Custo Operacional)
  SELECT id INTO v_sub_marketing FROM savedin.categories WHERE slug = 'marketing' AND parent_id = v_cat_custo_op LIMIT 1;
  IF v_sub_marketing IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Marketing', 'marketing', 'expense', 'Megaphone', '#455A64', '#ECEFF1', false, v_cat_custo_op)
    RETURNING id INTO v_sub_marketing;
  END IF;

  -- IA (sub de Assinaturas)
  SELECT id INTO v_sub_ia FROM savedin.categories WHERE slug = 'ia-assinatura' AND parent_id = v_cat_assinaturas LIMIT 1;
  IF v_sub_ia IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'IA', 'ia-assinatura', 'expense', 'Brain', '#2196F3', '#E3F2FD', false, v_cat_assinaturas)
    RETURNING id INTO v_sub_ia;
  END IF;

  -- SaaS (sub de Assinaturas)
  SELECT id INTO v_sub_saas FROM savedin.categories WHERE slug = 'saas' AND parent_id = v_cat_assinaturas LIMIT 1;
  IF v_sub_saas IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'SaaS', 'saas', 'expense', 'Cloud', '#1565C0', '#E3F2FD', false, v_cat_assinaturas)
    RETURNING id INTO v_sub_saas;
  END IF;

  -- Contabilidade (sub de Custo Operacional)
  SELECT id INTO v_sub_contabilidade FROM savedin.categories WHERE slug = 'contabilidade' AND parent_id = v_cat_custo_op LIMIT 1;
  IF v_sub_contabilidade IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Contabilidade', 'contabilidade', 'expense', 'Calculator', '#455A64', '#ECEFF1', false, v_cat_custo_op)
    RETURNING id INTO v_sub_contabilidade;
  END IF;

  -- Impostos (sub de Custo Operacional)
  SELECT id INTO v_sub_impostos FROM savedin.categories WHERE slug = 'impostos' AND parent_id = v_cat_custo_op LIMIT 1;
  IF v_sub_impostos IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Impostos', 'impostos', 'expense', 'FileText', '#37474F', '#ECEFF1', false, v_cat_custo_op)
    RETURNING id INTO v_sub_impostos;
  END IF;

  -- Hosting (sub de Custo Operacional)
  SELECT id INTO v_sub_hosting FROM savedin.categories WHERE slug = 'hosting' AND parent_id = v_cat_custo_op LIMIT 1;
  IF v_sub_hosting IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Hosting', 'hosting', 'expense', 'Server', '#546E7A', '#ECEFF1', false, v_cat_custo_op)
    RETURNING id INTO v_sub_hosting;
  END IF;

  -- Luz e Gás (sub de Moradia)
  SELECT id INTO v_sub_luz_gas FROM savedin.categories WHERE slug = 'luz-gas' AND parent_id = v_cat_moradia LIMIT 1;
  IF v_sub_luz_gas IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Luz e Gás', 'luz-gas', 'expense', 'Zap', '#607D8B', '#ECEFF1', false, v_cat_moradia)
    RETURNING id INTO v_sub_luz_gas;
  END IF;

  -- Condomínio (sub de Moradia)
  SELECT id INTO v_sub_condominio FROM savedin.categories WHERE slug = 'condominio' AND parent_id = v_cat_moradia LIMIT 1;
  IF v_sub_condominio IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Condomínio', 'condominio', 'expense', 'Building', '#607D8B', '#ECEFF1', false, v_cat_moradia)
    RETURNING id INTO v_sub_condominio;
  END IF;

  -- Internet (sub de Moradia)
  SELECT id INTO v_sub_internet FROM savedin.categories WHERE slug = 'internet' AND parent_id = v_cat_moradia LIMIT 1;
  IF v_sub_internet IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Internet', 'internet', 'expense', 'Wifi', '#607D8B', '#ECEFF1', false, v_cat_moradia)
    RETURNING id INTO v_sub_internet;
  END IF;

  -- Telefonia (sub de Serviços)
  SELECT id INTO v_sub_telefonia FROM savedin.categories WHERE slug = 'telefonia' AND parent_id = v_cat_servicos LIMIT 1;
  IF v_sub_telefonia IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Telefonia', 'telefonia', 'expense', 'Phone', '#546E7A', '#ECEFF1', false, v_cat_servicos)
    RETURNING id INTO v_sub_telefonia;
  END IF;

  -- Financiamento (sub de Moradia)
  SELECT id INTO v_sub_financiamento FROM savedin.categories WHERE slug = 'financiamento' AND parent_id = v_cat_moradia LIMIT 1;
  IF v_sub_financiamento IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Financiamento', 'financiamento', 'expense', 'Landmark', '#455A64', '#ECEFF1', false, v_cat_moradia)
    RETURNING id INTO v_sub_financiamento;
  END IF;

  -- Seguro (sub de Automóvel)
  SELECT id INTO v_sub_seguro FROM savedin.categories WHERE slug = 'seguro-auto' AND parent_id = v_cat_automovel LIMIT 1;
  IF v_sub_seguro IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'Seguro', 'seguro-auto', 'expense', 'Shield', '#F57C00', '#FFF3E0', false, v_cat_automovel)
    RETURNING id INTO v_sub_seguro;
  END IF;

  -- ML (sub de Compras Online)
  SELECT id INTO v_sub_ml FROM savedin.categories WHERE slug = 'ml' AND parent_id = v_cat_compras_online LIMIT 1;
  IF v_sub_ml IS NULL THEN
    INSERT INTO savedin.categories (user_id, environment_id, name, slug, type, icon, color, bg, is_default, parent_id)
    VALUES (v_user_id, v_env_id, 'ML', 'ml', 'expense', 'ShoppingBag', '#7B1FA2', '#F3E5F5', false, v_cat_compras_online)
    RETURNING id INTO v_sub_ml;
  END IF;

  -- ============================================
  -- 6. Criar cartões de crédito (se não existirem)
  -- ============================================

  -- Nubank Stenio ****3600
  SELECT id INTO v_card_nu_stenio FROM savedin.credit_cards WHERE user_id = v_user_id AND name = 'Nubank Stenio' LIMIT 1;
  IF v_card_nu_stenio IS NULL THEN
    INSERT INTO savedin.credit_cards (user_id, environment_id, name, credit_limit, closing_day, due_day, color, icon, is_active)
    VALUES (v_user_id, v_env_id, 'Nubank Stenio', 10000.00, 3, 10, '#820AD1', 'CreditCard', true)
    RETURNING id INTO v_card_nu_stenio;
  END IF;

  -- Nubank WebDesign ****2257
  SELECT id INTO v_card_nu_webdesign FROM savedin.credit_cards WHERE user_id = v_user_id AND name = 'Nubank WebDesign' LIMIT 1;
  IF v_card_nu_webdesign IS NULL THEN
    INSERT INTO savedin.credit_cards (user_id, environment_id, name, credit_limit, closing_day, due_day, color, icon, is_active)
    VALUES (v_user_id, v_env_id, 'Nubank WebDesign', 5000.00, 3, 10, '#820AD1', 'CreditCard', true)
    RETURNING id INTO v_card_nu_webdesign;
  END IF;

  -- Nubank Info ****2257
  SELECT id INTO v_card_nu_info FROM savedin.credit_cards WHERE user_id = v_user_id AND name = 'Nubank Info' LIMIT 1;
  IF v_card_nu_info IS NULL THEN
    INSERT INTO savedin.credit_cards (user_id, environment_id, name, credit_limit, closing_day, due_day, color, icon, is_active)
    VALUES (v_user_id, v_env_id, 'Nubank Info', 2000.00, 3, 10, '#820AD1', 'CreditCard', true)
    RETURNING id INTO v_card_nu_info;
  END IF;

  -- Itaú Magalu ****2591
  SELECT id INTO v_card_itau FROM savedin.credit_cards WHERE user_id = v_user_id AND name = 'Itaú Magalu' LIMIT 1;
  IF v_card_itau IS NULL THEN
    INSERT INTO savedin.credit_cards (user_id, environment_id, name, credit_limit, closing_day, due_day, color, icon, is_active)
    VALUES (v_user_id, v_env_id, 'Itaú Magalu', 5000.00, 28, 5, '#FF6600', 'CreditCard', true)
    RETURNING id INTO v_card_itau;
  END IF;

  -- ============================================
  -- 7. Criar contas (boleto/pix) se não existirem
  -- ============================================

  -- Conta Pessoal
  SELECT id INTO v_account_pessoal FROM savedin.accounts WHERE user_id = v_user_id AND name = 'Conta Pessoal' LIMIT 1;
  IF v_account_pessoal IS NULL THEN
    INSERT INTO savedin.accounts (user_id, environment_id, name, type, balance, color, icon, is_active)
    VALUES (v_user_id, v_env_id, 'Conta Pessoal', 'checking', 0, '#4CAF50', 'Wallet', true)
    RETURNING id INTO v_account_pessoal;
  END IF;

  -- Conta WebDesign
  SELECT id INTO v_account_webdesign FROM savedin.accounts WHERE user_id = v_user_id AND name = 'Conta WebDesign' LIMIT 1;
  IF v_account_webdesign IS NULL THEN
    INSERT INTO savedin.accounts (user_id, environment_id, name, type, balance, color, icon, is_active)
    VALUES (v_user_id, v_env_id, 'Conta WebDesign', 'checking', 0, '#2196F3', 'Building2', true)
    RETURNING id INTO v_account_webdesign;
  END IF;

  -- Conta Wavehost
  SELECT id INTO v_account_wavehost FROM savedin.accounts WHERE user_id = v_user_id AND name = 'Conta Wavehost' LIMIT 1;
  IF v_account_wavehost IS NULL THEN
    INSERT INTO savedin.accounts (user_id, environment_id, name, type, balance, color, icon, is_active)
    VALUES (v_user_id, v_env_id, 'Conta Wavehost', 'checking', 0, '#FF9800', 'Server', true)
    RETURNING id INTO v_account_wavehost;
  END IF;

  -- ============================================
  -- 8. Criar faturas (maio/2026) para os cartões
  -- ============================================

  -- Fatura Nubank Stenio - 05/2026
  SELECT id INTO v_inv_nu_stenio_05 FROM savedin.invoices WHERE card_id = v_card_nu_stenio AND month = 5 AND year = 2026 LIMIT 1;
  IF v_inv_nu_stenio_05 IS NULL THEN
    INSERT INTO savedin.invoices (user_id, card_id, environment_id, month, year, status, total)
    VALUES (v_user_id, v_card_nu_stenio, v_env_id, 5, 2026, 'open', 6566.25)
    RETURNING id INTO v_inv_nu_stenio_05;
  END IF;

  -- Fatura Nubank WebDesign - 05/2026
  SELECT id INTO v_inv_nu_webdesign_05 FROM savedin.invoices WHERE card_id = v_card_nu_webdesign AND month = 5 AND year = 2026 LIMIT 1;
  IF v_inv_nu_webdesign_05 IS NULL THEN
    INSERT INTO savedin.invoices (user_id, card_id, environment_id, month, year, status, total)
    VALUES (v_user_id, v_card_nu_webdesign, v_env_id, 5, 2026, 'open', 2786.47)
    RETURNING id INTO v_inv_nu_webdesign_05;
  END IF;

  -- Fatura Nubank Info - 05/2026
  SELECT id INTO v_inv_nu_info_05 FROM savedin.invoices WHERE card_id = v_card_nu_info AND month = 5 AND year = 2026 LIMIT 1;
  IF v_inv_nu_info_05 IS NULL THEN
    INSERT INTO savedin.invoices (user_id, card_id, environment_id, month, year, status, total)
    VALUES (v_user_id, v_card_nu_info, v_env_id, 5, 2026, 'open', 45.89)
    RETURNING id INTO v_inv_nu_info_05;
  END IF;

  -- Fatura Itaú Magalu - 05/2026
  SELECT id INTO v_inv_itau_05 FROM savedin.invoices WHERE card_id = v_card_itau AND month = 5 AND year = 2026 LIMIT 1;
  IF v_inv_itau_05 IS NULL THEN
    INSERT INTO savedin.invoices (user_id, card_id, environment_id, month, year, status, total)
    VALUES (v_user_id, v_card_itau, v_env_id, 5, 2026, 'open', 1987.31)
    RETURNING id INTO v_inv_itau_05;
  END IF;

  -- ============================================
  -- 9. TRANSAÇÕES - Cartão Nubank Stenio ****3600
  --    43 transações | Vencimento: 10/05/2026
  -- ============================================

  -- 1. ML Interruptores inteligentes - Parcelada 1/4 - R$ 487,17
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, installment_total, installment_current, recurrence_group_id, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 487.17, 'ML Interruptores inteligentes', '2026-04-04', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 4, 1, v_grp_interruptores, 'seed');

  -- 2. Abastece Ai - Única - R$ 264,03
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 264.03, 'Abastece Ai', '2026-04-05', v_sub_combustivel, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 3. Jim.Com Reforma apto - Parcelada 1/4 - R$ 3.000,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, installment_total, installment_current, recurrence_group_id, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 3000.00, 'Jim.Com Reforma apto', '2026-04-05', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 4, 1, v_grp_jim_stenio, 'seed');

  -- 4. ML Saofranc - Itens obra - Única - R$ 38,53
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 38.53, 'ML Saofranc - Itens obra', '2026-04-05', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 5. Peg 15-03 - Única - R$ 20,89
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 20.89, 'Peg 15-03', '2026-04-05', v_cat_outros, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 6. Gmadtaboao - Itens obra - Única - R$ 161,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 161.00, 'Gmadtaboao - Itens obra', '2026-04-06', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 7. Shopee Ebgdistribuido - Única - R$ 43,54
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 43.54, 'Shopee Ebgdistribuido', '2026-04-06', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 8. Shopee Polimetcomdist - Parcelada 1/2 - R$ 70,67
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, installment_total, installment_current, recurrence_group_id, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 70.67, 'Shopee Polimetcomdist', '2026-04-06', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 2, 1, v_grp_polimetcom, 'seed');

  -- 9. 99food Luc - Única - R$ 31,71
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 31.71, '99food Luc', '2026-04-07', v_sub_delivery, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 10. Ferramentas - Obra - Única - R$ 106,11
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 106.11, 'Ferramentas - Obra', '2026-04-07', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 11. Inovamachines - R$ 6,99
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 6.99, 'Inovamachines', '2026-04-07', v_sub_mercadinho, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 12. Inovamachines - R$ 4,99
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 4.99, 'Inovamachines', '2026-04-07', v_sub_mercadinho, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 13. Inovamachines - R$ 9,98
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 9.98, 'Inovamachines', '2026-04-07', v_sub_mercadinho, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 14. Install4youclimat - Infra AC - Parcelada 1/3 - R$ 223,33
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, installment_total, installment_current, recurrence_group_id, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 223.33, 'Install4youclimat - Infra AC', '2026-04-07', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 3, 1, v_grp_install4you, 'seed');

  -- 15. ML Ddmaquin - Ferramenta - Parcelada 1/2 - R$ 73,80
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, installment_total, installment_current, recurrence_group_id, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 73.80, 'ML Ddmaquin - Ferramenta', '2026-04-07', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 2, 1, v_grp_ddmaquin, 'seed');

  -- 16. Shopee Alphacomcomdee - Única - R$ 88,63
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 88.63, 'Shopee Alphacomcomdee', '2026-04-07', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 17. Conibase Mat Constr - Única - R$ 3,99
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 3.99, 'Conibase Mat Constr', '2026-04-08', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 18. Shopee Swiffaudio - Única - R$ 52,87
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 52.87, 'Shopee Swiffaudio', '2026-04-08', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 19. 99inapppaymentcapture - Única - R$ 31,70
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 31.70, '99inapppaymentcapture', '2026-04-09', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 20. Adrianaaparecida - Única - R$ 33,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 33.00, 'Adrianaaparecida', '2026-04-09', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 21. Gmadtaboao - Única - R$ 62,47
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 62.47, 'Gmadtaboao', '2026-04-09', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 22. Pg 99 Ride - Única - R$ 19,30
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 19.30, 'Pg 99 Ride', '2026-04-09', v_sub_uber, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 23. Taboao Madeiras Comerc - Única - R$ 135,90
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 135.90, 'Taboao Madeiras Comerc', '2026-04-09', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 24. Adrianaaparecida - Única - R$ 19,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 19.00, 'Adrianaaparecida', '2026-04-10', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 25. Drogasil 2820 - Parcelada 1/2 - R$ 47,88
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, installment_total, installment_current, recurrence_group_id, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 47.88, 'Drogasil 2820', '2026-04-10', v_sub_medicamentos, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 2, 1, v_grp_drogasil, 'seed');

  -- 26. Goya Kizaemon - Única - R$ 92,36
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 92.36, 'Goya Kizaemon', '2026-04-10', v_sub_perfumaria, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 27. Inovamachines - Única - R$ 16,98
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 16.98, 'Inovamachines', '2026-04-10', v_sub_mercadinho, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 28. Pizzaria Bolaquinho - Única - R$ 65,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 65.00, 'Pizzaria Bolaquinho', '2026-04-10', v_sub_restaurante, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 29. Raia Drogasil - Parcelada 1/2 - R$ 159,78
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, installment_total, installment_current, recurrence_group_id, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 159.78, 'Raia Drogasil', '2026-04-10', v_sub_medicamentos, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 2, 1, v_grp_raia, 'seed');

  -- 30. Supermercado Kacula - Única - R$ 81,91
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 81.91, 'Supermercado Kacula', '2026-04-10', v_sub_supermercado, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 31. Supermercado Kacula - Única - R$ 101,04
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 101.04, 'Supermercado Kacula', '2026-04-10', v_sub_supermercado, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 32. Commerce Auto P F - Obra - Única - R$ 30,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 30.00, 'Commerce Auto P F - Obra', '2026-04-11', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 33. Conibase Mat Constr - Única - R$ 40,96
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 40.96, 'Conibase Mat Constr', '2026-04-11', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 34. Mp Borracharia - Obra - Única - R$ 10,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 10.00, 'Mp Borracharia - Obra', '2026-04-11', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 35. Oficial Farma - Remédios TDH - Única - R$ 386,57
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 386.57, 'Oficial Farma - Remédios TDH', '2026-04-11', v_sub_medicamentos, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 36. Shopee Efraimdistribu - Única - R$ 114,61
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 114.61, 'Shopee Efraimdistribu', '2026-04-11', v_cat_higiene, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 37. Shopee Gmsnaturais - Única - R$ 67,99
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 67.99, 'Shopee Gmsnaturais', '2026-04-11', v_sub_suplementacao, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 38. Peg 15-03 - Única - R$ 48,53
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 48.53, 'Peg 15-03', '2026-04-12', v_cat_outros, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 39. Bilhunico - Única - R$ 21,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 21.00, 'Bilhunico', '2026-04-13', v_cat_transporte, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 40. ML Drenare - Ralo linear - Única - R$ 129,54
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 129.54, 'ML Drenare - Ralo linear', '2026-04-13', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 41. ML MercadoliCompras - Única - R$ 22,50
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 22.50, 'ML MercadoliCompras', '2026-04-13', v_sub_ml, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 42. Ferramentas - Obra - Única - R$ 100,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 100.00, 'Ferramentas - Obra', '2026-04-14', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- 43. Material construção - Obra - Única - R$ 40,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 40.00, 'Material construção - Obra', '2026-04-14', v_sub_reforma, v_card_nu_stenio, v_inv_nu_stenio_05, 'pending', false, 'seed');

  -- ============================================
  -- 10. TRANSAÇÕES - Cartão Nubank WebDesign ****2257
  --     6 transações | Vencimento: 10/05/2026
  -- ============================================

  -- 1. Facebk Eg4twlh4w2 - Única - R$ 125,50
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 125.50, 'Facebk Eg4twlh4w2', '2026-04-07', v_sub_marketing, v_card_nu_webdesign, v_inv_nu_webdesign_05, 'pending', false, 'seed');

  -- 2. Facebk Dt8pjkm4w2 - Única - R$ 251,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 251.00, 'Facebk Dt8pjkm4w2', '2026-04-08', v_sub_marketing, v_card_nu_webdesign, v_inv_nu_webdesign_05, 'pending', false, 'seed');

  -- 3. Facebk Fct9bl94w2 - Única - R$ 501,99
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 501.99, 'Facebk Fct9bl94w2', '2026-04-08', v_sub_marketing, v_card_nu_webdesign, v_inv_nu_webdesign_05, 'pending', false, 'seed');

  -- 4. Facebk Ljcpshr4w2 - Única - R$ 1.131,29
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 1131.29, 'Facebk Ljcpshr4w2', '2026-04-08', v_sub_marketing, v_card_nu_webdesign, v_inv_nu_webdesign_05, 'pending', false, 'seed');

  -- 5. Claude.Ai Subscription - Recorrente - R$ 587,52
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, recurrence_type, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 587.52, 'Claude.Ai Subscription', '2026-04-11', v_sub_ia, v_card_nu_webdesign, v_inv_nu_webdesign_05, 'pending', true, 'monthly', 'seed');

  -- 6. Facebk B9sjbkv4w2 - Única - R$ 189,17
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 189.17, 'Facebk B9sjbkv4w2', '2026-04-13', v_sub_marketing, v_card_nu_webdesign, v_inv_nu_webdesign_05, 'pending', false, 'seed');

  -- ============================================
  -- 11. TRANSAÇÕES - Cartão Nubank Info ****2257
  --     1 transação | Vencimento: 10/05/2026
  -- ============================================

  -- 1. Cakto Pay - Compra - Única - R$ 45,89
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 45.89, 'Cakto Pay - Compra', '2026-04-05', v_sub_saas, v_card_nu_info, v_inv_nu_info_05, 'pending', false, 'seed');

  -- ============================================
  -- 12. TRANSAÇÕES - Cartão Itaú Magalu ****2591
  --     16 transações | Vencimento: 05/05/2026
  -- ============================================

  -- 1. Peg 15-03 - Única - R$ 17,89
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 17.89, 'Peg 15-03', '2026-03-29', v_cat_outros, v_card_itau, v_inv_itau_05, 'pending', false, 'seed');

  -- 2. Rd Saúde Online - Parcelada 2/3 - R$ 59,45
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, installment_total, installment_current, recurrence_group_id, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 59.45, 'Rd Saúde Online', '2026-03-29', v_sub_medicamentos, v_card_itau, v_inv_itau_05, 'pending', false, 3, 2, v_grp_rd_saude, 'seed');

  -- 3. Renner - Parcelada 1/2 - R$ 84,12
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, installment_total, installment_current, recurrence_group_id, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 84.12, 'Renner', '2026-03-29', v_cat_vestuario, v_card_itau, v_inv_itau_05, 'pending', false, 2, 1, v_grp_renner, 'seed');

  -- 4. Drogasil 2540 - Única - R$ 99,71
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 99.71, 'Drogasil 2540', '2026-03-31', v_sub_medicamentos, v_card_itau, v_inv_itau_05, 'pending', false, 'seed');

  -- 5. G de J Bispo Hamburgu - Única - R$ 117,67
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 117.67, 'G de J Bispo Hamburgu', '2026-03-31', v_sub_restaurante, v_card_itau, v_inv_itau_05, 'pending', false, 'seed');

  -- 6. Adrianaaparecida - Única - R$ 47,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 47.00, 'Adrianaaparecida', '2026-04-01', v_sub_reforma, v_card_itau, v_inv_itau_05, 'pending', false, 'seed');

  -- 7. Mp melimais - Única - R$ 19,90
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 19.90, 'Mp melimais', '2026-04-01', v_cat_outros, v_card_itau, v_inv_itau_05, 'pending', false, 'seed');

  -- 8. Peg 15-03 - Única - R$ 89,25
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 89.25, 'Peg 15-03', '2026-04-01', v_cat_outros, v_card_itau, v_inv_itau_05, 'pending', false, 'seed');

  -- 9. Americanas SA - Parcelada 1/2 - R$ 118,93
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, installment_total, installment_current, recurrence_group_id, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 118.93, 'Americanas SA', '2026-04-02', v_cat_compras_online, v_card_itau, v_inv_itau_05, 'pending', false, 2, 1, v_grp_americanas, 'seed');

  -- 10. Beleza na Web - Única - R$ 57,10
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 57.10, 'Beleza na Web', '2026-04-02', v_sub_cosmeticos, v_card_itau, v_inv_itau_05, 'pending', false, 'seed');

  -- 11. Cea - Única - R$ 49,99
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 49.99, 'Cea', '2026-04-02', v_cat_vestuario, v_card_itau, v_inv_itau_05, 'pending', false, 'seed');

  -- 12. Supermercado Kacula Ltd - Única - R$ 25,94
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 25.94, 'Supermercado Kacula Ltd', '2026-04-02', v_sub_supermercado, v_card_itau, v_inv_itau_05, 'pending', false, 'seed');

  -- 13. Cartão de Todos - Única - R$ 33,40
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 33.40, 'Cartão de Todos', '2026-04-03', v_sub_plano_saude, v_card_itau, v_inv_itau_05, 'pending', false, 'seed');

  -- 14. Christianmarcelin - Única - R$ 46,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 46.00, 'Christianmarcelin', '2026-04-04', v_sub_reforma, v_card_itau, v_inv_itau_05, 'pending', false, 'seed');

  -- 15. Conibase Mat Constr - Única - R$ 60,96
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 60.96, 'Conibase Mat Constr', '2026-04-04', v_sub_reforma, v_card_itau, v_inv_itau_05, 'pending', false, 'seed');

  -- 16. Jim.Com Aeo Soluções - Parcelada 1/2 - R$ 1.060,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, card_id, invoice_id, status, is_recurring, installment_total, installment_current, recurrence_group_id, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 1060.00, 'Jim.Com Aeo Soluções', '2026-04-07', v_sub_reforma, v_card_itau, v_inv_itau_05, 'pending', false, 2, 1, v_grp_jim_itau, 'seed');

  -- ============================================
  -- 13. TRANSAÇÕES - Conta Pessoal (Boleto/Pix)
  --     9 itens | R$ 3.073,30
  -- ============================================

  -- 1. Luz e Gás - Recorrente - R$ 250,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, account_id, status, is_recurring, recurrence_type, registered_via, paid_at)
  VALUES (v_user_id, v_env_id, 'expense', 250.00, 'Luz e Gás', '2026-04-05', v_sub_luz_gas, v_account_pessoal, 'paid', true, 'monthly', 'seed', '2026-04-05T00:00:00Z');

  -- 2. Convênio Médico - Recorrente - R$ 150,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, account_id, status, is_recurring, recurrence_type, registered_via, paid_at)
  VALUES (v_user_id, v_env_id, 'expense', 150.00, 'Convênio Médico', '2026-04-05', v_sub_plano_saude, v_account_pessoal, 'paid', true, 'monthly', 'seed', '2026-04-05T00:00:00Z');

  -- 3. Plano Celular - Recorrente - R$ 89,90
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, account_id, status, is_recurring, recurrence_type, registered_via, paid_at)
  VALUES (v_user_id, v_env_id, 'expense', 89.90, 'Plano Celular', '2026-04-10', v_sub_telefonia, v_account_pessoal, 'paid', true, 'monthly', 'seed', '2026-04-10T00:00:00Z');

  -- 4. Condomínio - Recorrente - R$ 350,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, account_id, status, is_recurring, recurrence_type, registered_via, paid_at)
  VALUES (v_user_id, v_env_id, 'expense', 350.00, 'Condomínio', '2026-04-10', v_sub_condominio, v_account_pessoal, 'paid', true, 'monthly', 'seed', '2026-04-10T00:00:00Z');

  -- 5. Internet Casa - Recorrente - R$ 150,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, account_id, status, is_recurring, recurrence_type, registered_via, paid_at)
  VALUES (v_user_id, v_env_id, 'expense', 150.00, 'Internet Casa', '2026-04-11', v_sub_internet, v_account_pessoal, 'paid', true, 'monthly', 'seed', '2026-04-11T00:00:00Z');

  -- 6. Inspire Net (Apto) - Recorrente - R$ 89,90
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, account_id, status, is_recurring, recurrence_type, registered_via, paid_at)
  VALUES (v_user_id, v_env_id, 'expense', 89.90, 'Inspire Net (Apto)', '2026-04-11', v_sub_internet, v_account_pessoal, 'paid', true, 'monthly', 'seed', '2026-04-11T00:00:00Z');

  -- 7. Plano Odontológico - Recorrente - R$ 150,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, account_id, status, is_recurring, recurrence_type, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 150.00, 'Plano Odontológico', '2026-04-15', v_sub_plano_odonto, v_account_pessoal, 'pending', true, 'monthly', 'seed');

  -- 8. Apartamento (8/95) - Parcelada 8/95 - R$ 1.663,50
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, account_id, status, is_recurring, installment_total, installment_current, recurrence_group_id, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 1663.50, 'Apartamento (8/95)', '2026-04-20', v_sub_financiamento, v_account_pessoal, 'pending', false, 95, 8, v_grp_apto, 'seed');

  -- 9. Seguro HB20 - Recorrente - R$ 180,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, account_id, status, is_recurring, recurrence_type, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 180.00, 'Seguro HB20', '2026-04-28', v_sub_seguro, v_account_pessoal, 'pending', true, 'monthly', 'seed');

  -- ============================================
  -- 14. TRANSAÇÕES - Conta WebDesign (Boleto/Pix)
  --     3 itens | R$ 292,00
  -- ============================================

  -- 1. Contador - Recorrente - R$ 167,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, account_id, status, is_recurring, recurrence_type, registered_via, paid_at)
  VALUES (v_user_id, v_env_id, 'expense', 167.00, 'Contador', '2026-04-10', v_sub_contabilidade, v_account_webdesign, 'paid', true, 'monthly', 'seed', '2026-04-10T00:00:00Z');

  -- 2. Parcelamento MEI (31/60) - Parcelada 31/60 - R$ 90,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, account_id, status, is_recurring, installment_total, installment_current, recurrence_group_id, registered_via, paid_at)
  VALUES (v_user_id, v_env_id, 'expense', 90.00, 'Parcelamento MEI (31/60)', '2026-04-10', v_sub_impostos, v_account_webdesign, 'paid', false, 60, 31, v_grp_mei, 'seed', '2026-04-10T00:00:00Z');

  -- 3. Hospedagem - Recorrente - R$ 35,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, account_id, status, is_recurring, recurrence_type, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 35.00, 'Hospedagem', '2026-04-15', v_sub_hosting, v_account_webdesign, 'pending', true, 'monthly', 'seed');

  -- ============================================
  -- 15. TRANSAÇÕES - Conta Wavehost (Boleto/Pix)
  --     3 itens | R$ 937,00
  -- ============================================

  -- 1. Contador - Recorrente - R$ 167,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, account_id, status, is_recurring, recurrence_type, registered_via, paid_at)
  VALUES (v_user_id, v_env_id, 'expense', 167.00, 'Contador', '2026-04-10', v_sub_contabilidade, v_account_wavehost, 'paid', true, 'monthly', 'seed', '2026-04-10T00:00:00Z');

  -- 2. Servidor Wavehost - Recorrente - R$ 700,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, account_id, status, is_recurring, recurrence_type, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 700.00, 'Servidor Wavehost', '2026-04-15', v_sub_hosting, v_account_wavehost, 'pending', true, 'monthly', 'seed');

  -- 3. Assinaturas Wavehost - Recorrente - R$ 70,00
  INSERT INTO savedin.transactions (user_id, environment_id, type, amount, description, date, category_id, account_id, status, is_recurring, recurrence_type, registered_via)
  VALUES (v_user_id, v_env_id, 'expense', 70.00, 'Assinaturas Wavehost', '2026-04-15', v_sub_saas, v_account_wavehost, 'pending', true, 'monthly', 'seed');

  RAISE NOTICE '✅ Seed completo: 81 transações inseridas com sucesso!';
  RAISE NOTICE '   - Nubank Stenio: 43 transações (R$ 6.566,25)';
  RAISE NOTICE '   - Nubank WebDesign: 6 transações (R$ 2.786,47)';
  RAISE NOTICE '   - Nubank Info: 1 transação (R$ 45,89)';
  RAISE NOTICE '   - Itaú Magalu: 16 transações (R$ 1.987,31)';
  RAISE NOTICE '   - Conta Pessoal: 9 transações (R$ 3.073,30)';
  RAISE NOTICE '   - Conta WebDesign: 3 transações (R$ 292,00)';
  RAISE NOTICE '   - Conta Wavehost: 3 transações (R$ 937,00)';
  RAISE NOTICE '   TOTAL: R$ 15.688,22';

END $$;
