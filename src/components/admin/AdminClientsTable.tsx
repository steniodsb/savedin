import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Search, ChevronDown, MoreHorizontal, Edit2, 
  CheckCircle2, Clock, AlertCircle, XCircle,
  User, Crown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminData } from '@/hooks/useAdminData';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SubscriptionMetric {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  plan_name: string | null;
  plan_price: number | null;
  plan_interval: string | null;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  type: string;
  billing_cycle: string;
  price_cents: number;
  price_display: string;
  is_active: boolean;
}

interface AdminClientsTableProps {
  subscriptions: SubscriptionMetric[];
  plans: Plan[];
  isLoading: boolean;
}

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  active: { label: 'Ativo', icon: CheckCircle2, className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  trialing: { label: 'Trial', icon: Clock, className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  past_due: { label: 'Pendente', icon: AlertCircle, className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  canceled: { label: 'Cancelado', icon: XCircle, className: 'bg-red-500/10 text-red-500 border-red-500/20' },
  expired: { label: 'Expirado', icon: XCircle, className: 'bg-muted text-muted-foreground border-muted' },
};

export function AdminClientsTable({ subscriptions, plans, isLoading }: AdminClientsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionMetric | null>(null);
  const [newPlanId, setNewPlanId] = useState<string>('');
  const [newStatus, setNewStatus] = useState<string>('');
  
  const { updateSubscriptionPlan, updateSubscriptionStatus } = useAdminData();

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      sub.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      sub.username?.toLowerCase().includes(search.toLowerCase()) ||
      sub.user_id.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleEditClick = (subscription: SubscriptionMetric) => {
    setEditingSubscription(subscription);
    setNewPlanId(subscription.plan_id);
    setNewStatus(subscription.status);
  };

  const handleSaveChanges = async () => {
    if (!editingSubscription) return;

    if (newPlanId !== editingSubscription.plan_id) {
      await updateSubscriptionPlan.mutateAsync({
        subscriptionId: editingSubscription.id,
        newPlanId,
      });
    }

    if (newStatus !== editingSubscription.status) {
      await updateSubscriptionStatus.mutateAsync({
        subscriptionId: editingSubscription.id,
        newStatus,
      });
    }

    setEditingSubscription(null);
  };

  const formatPrice = (cents: number | null) => {
    if (!cents) return '---';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '---';
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.expired;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={cn("gap-1", config.className)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, username ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="trialing">Em trial</SelectItem>
            <SelectItem value="past_due">Pendentes</SelectItem>
            <SelectItem value="canceled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <ScrollArea className="h-[500px]">
            <Table className="min-w-[800px]">
            <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm">
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Período</TableHead>
                <TableHead className="w-[60px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Nenhum cliente encontrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions.map((sub) => (
                  <TableRow key={sub.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={sub.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {sub.full_name?.[0] || sub.username?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {sub.full_name || 'Sem nome'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{sub.username || 'unknown'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-primary" />
                        <span>{sub.plan_name || 'Sem plano'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(sub.plan_price)}
                      {sub.plan_interval && (
                        <span className="text-xs text-muted-foreground ml-1">
                          /{sub.plan_interval === 'monthly' ? 'mês' : sub.plan_interval === 'yearly' ? 'ano' : 'único'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(sub.current_period_start)} - {formatDate(sub.current_period_end)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEditClick(sub)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar assinatura
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredSubscriptions.length} de {subscriptions.length} assinaturas
      </p>

      {/* Edit Dialog */}
      <Dialog open={!!editingSubscription} onOpenChange={(open) => !open && setEditingSubscription(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Assinatura</DialogTitle>
            <DialogDescription>
              Modificar o plano ou status da assinatura de {editingSubscription?.full_name || 'cliente'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Plano</label>
              <Select value={newPlanId} onValueChange={setNewPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {plan.price_display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trialing">Trial</SelectItem>
                  <SelectItem value="past_due">Pendente</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSubscription(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveChanges}
              disabled={updateSubscriptionPlan.isPending || updateSubscriptionStatus.isPending}
            >
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
