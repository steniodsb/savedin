import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, Users, CreditCard, TrendingUp, DollarSign, 
  Calendar, RefreshCw, LogOut, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminData } from '@/hooks/useAdminData';
import { AdminClientsTable } from '@/components/admin/AdminClientsTable';
import { AdminUsersTable } from '@/components/admin/AdminUsersTable';
import { AdminRevenueChart } from '@/components/admin/AdminRevenueChart';
import { AdminPlanDistribution } from '@/components/admin/AdminPlanDistribution';
import { supabase } from '@/integrations/supabase/client';
import logoDark from '@/assets/logo-dark.webp';
import logoLight from '@/assets/logo-light.webp';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading, user } = useAdminAuth();
  const { metrics, subscriptions, plans, users, isLoading: dataLoading, refetch } = useAdminData();
  const [activeTab, setActiveTab] = useState('overview');

  // Redirect if not admin
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/admin-login');
    }
  }, [isAdmin, adminLoading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin-login');
  };

  // Get theme
  const isDark = document.documentElement.classList.contains('dark') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches && 
     !document.documentElement.classList.contains('light'));

  if (adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <img 
                src={isDark ? logoDark : logoLight} 
                alt="Logo" 
                className="h-8 object-contain"
                onError={(e) => { e.currentTarget.src = isDark ? '/logo-dark.webp' : '/logo-light.webp'; }}
              />
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20">
                <Shield className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Painel Admin</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={dataLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Welcome Section */}
          <motion.div variants={item}>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
            <p className="text-muted-foreground mt-1">
              Visão geral das métricas e gestão de clientes
            </p>
          </motion.div>

          {/* Metrics Cards */}
          <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* MRR Card */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  MRR
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {metrics ? formatCurrency(metrics.mrr) : '---'}
                    </p>
                    <p className="text-xs text-muted-foreground">Receita recorrente mensal</p>
                  </div>
                  <div className="flex items-center text-green-500 text-sm">
                    <ArrowUpRight className="h-4 w-4" />
                    <span>+12%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Users */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Usuários
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {metrics?.totalUsers ?? '---'}
                    </p>
                    <p className="text-xs text-muted-foreground">Total cadastrados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Subscriptions */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Assinaturas Ativas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {metrics?.activeSubscriptions ?? '---'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      +{metrics?.trialingSubscriptions ?? 0} em trial
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Revenue */}
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Faturamento Mensal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {metrics ? formatCurrency(metrics.monthlyRevenue) : '---'}
                    </p>
                    <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Secondary Metrics */}
          <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Faturamento Semanal</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">
                  {metrics ? formatCurrency(metrics.weeklyRevenue) : '---'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Faturamento Anual</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">
                  {metrics ? formatCurrency(metrics.annualRevenue) : '---'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Taxa de Conversão</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold">
                  {metrics && metrics.totalUsers > 0 
                    ? `${((metrics.activeSubscriptions / metrics.totalUsers) * 100).toFixed(1)}%`
                    : '---'}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tabs Section */}
          <motion.div variants={item}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="overview" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger value="clients" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Assinaturas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Evolução do Faturamento
                      </CardTitle>
                      <CardDescription>Receita mensal nos últimos 12 meses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AdminRevenueChart data={metrics?.revenueByMonth || []} />
                    </CardContent>
                  </Card>

                  {/* Plan Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5" />
                        Distribuição por Plano
                      </CardTitle>
                      <CardDescription>Assinaturas por tipo de plano</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AdminPlanDistribution data={metrics?.subscriptionsByPlan || {}} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="users">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Usuários Cadastrados
                    </CardTitle>
                    <CardDescription>
                      Lista completa de todos os usuários registrados na plataforma
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AdminUsersTable 
                      users={users}
                      plans={plans}
                      isLoading={dataLoading}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="clients">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Gestão de Assinaturas
                    </CardTitle>
                    <CardDescription>
                      Visualize e gerencie as assinaturas dos clientes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AdminClientsTable 
                      subscriptions={subscriptions} 
                      plans={plans}
                      isLoading={dataLoading}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
