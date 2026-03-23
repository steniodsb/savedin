import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Search, User, Calendar, CheckCircle2, XCircle,
  Crown, UserCheck, Clock, MoreHorizontal, Edit2, 
  Trash2, KeyRound, Gift, Eye, EyeOff, Loader2, Mail, Info, Copy, Check
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAdminData } from '@/hooks/useAdminData';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export interface UserProfile {
  user_id: string;
  email: string | null;
  email_confirmed_at: string | null;
  phone: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  last_seen_at: string | null;
  onboarding_completed: boolean | null;
  has_subscription: boolean;
  subscription_status: string | null;
  plan_name: string | null;
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

interface AdminUsersTableProps {
  users: UserProfile[];
  plans: Plan[];
  isLoading: boolean;
}

export function AdminUsersTable({ users, plans, isLoading }: AdminUsersTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // View details dialog
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Edit profile dialog
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  
  // Assign plan dialog
  const [assigningPlanUser, setAssigningPlanUser] = useState<UserProfile | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedPlanStatus, setSelectedPlanStatus] = useState('active');
  
  // Reset password dialog
  const [resetPasswordUser, setResetPasswordUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Delete confirmation
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  
  const { updateUserProfile, assignPlanToUser, resetUserPassword, deleteUser } = useAdminData();

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.username?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase()) ||
      user.user_id.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'with_subscription') {
      matchesStatus = user.has_subscription;
    } else if (statusFilter === 'without_subscription') {
      matchesStatus = !user.has_subscription;
    } else if (statusFilter === 'onboarding_complete') {
      matchesStatus = user.onboarding_completed === true;
    } else if (statusFilter === 'onboarding_pending') {
      matchesStatus = user.onboarding_completed !== true;
    }
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '---';
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatLastSeen = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: 'Copiado!', description: `${field} copiado para a área de transferência` });
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Handlers
  const handleViewDetails = (user: UserProfile) => {
    setViewingUser(user);
  };

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    setEditFullName(user.full_name || '');
    setEditUsername(user.username || '');
  };

  const handleEditFromDetails = () => {
    if (viewingUser) {
      setViewingUser(null);
      handleEditClick(viewingUser);
    }
  };

  const handleSaveProfile = async () => {
    if (!editingUser) return;
    await updateUserProfile.mutateAsync({
      userId: editingUser.user_id,
      fullName: editFullName,
      username: editUsername,
    });
    setEditingUser(null);
  };

  const handleAssignPlanClick = (user: UserProfile) => {
    setAssigningPlanUser(user);
    setSelectedPlanId(plans[0]?.id || '');
    setSelectedPlanStatus('active');
  };

  const handleAssignPlan = async () => {
    if (!assigningPlanUser || !selectedPlanId) return;
    await assignPlanToUser.mutateAsync({
      userId: assigningPlanUser.user_id,
      planId: selectedPlanId,
      status: selectedPlanStatus,
    });
    setAssigningPlanUser(null);
  };

  const handleResetPasswordClick = (user: UserProfile) => {
    setResetPasswordUser(user);
    setNewPassword('');
    setShowPassword(false);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return;
    await resetUserPassword.mutateAsync({
      userId: resetPasswordUser.user_id,
      newPassword,
    });
    setResetPasswordUser(null);
    setNewPassword('');
  };

  const handleDeleteClick = (user: UserProfile) => {
    setDeletingUser(user);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    await deleteUser.mutateAsync({ userId: deletingUser.user_id });
    setDeletingUser(null);
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
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os usuários</SelectItem>
            <SelectItem value="with_subscription">Com assinatura</SelectItem>
            <SelectItem value="without_subscription">Sem assinatura</SelectItem>
            <SelectItem value="onboarding_complete">Onboarding completo</SelectItem>
            <SelectItem value="onboarding_pending">Onboarding pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div 
          className="overflow-auto max-h-[500px]" 
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <Table className="min-w-[900px]">
            <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
              <TableRow>
                <TableHead className="whitespace-nowrap">Usuário</TableHead>
                <TableHead className="whitespace-nowrap">Email</TableHead>
                <TableHead className="whitespace-nowrap">Último acesso</TableHead>
                <TableHead className="whitespace-nowrap">Assinatura</TableHead>
                <TableHead className="whitespace-nowrap">Plano</TableHead>
                <TableHead className="w-[60px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.user_id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3 whitespace-nowrap">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {user.full_name?.[0] || user.username?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {user.full_name || 'Sem nome'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{user.username || 'unknown'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-foreground">
                          {user.email || '---'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className={user.last_seen_at ? 'text-foreground' : 'text-muted-foreground'}>
                          {formatLastSeen(user.last_seen_at)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {user.has_subscription ? (
                        <Badge variant="outline" className={cn(
                          "gap-1",
                          user.subscription_status === 'active' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                          user.subscription_status === 'trialing' && "bg-sky-500/10 text-sky-500 border-sky-500/20",
                          user.subscription_status === 'canceled' && "bg-destructive/10 text-destructive border-destructive/20",
                          user.subscription_status === 'past_due' && "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}>
                          <UserCheck className="h-3 w-3" />
                          {user.subscription_status === 'active' && 'Ativo'}
                          {user.subscription_status === 'trialing' && 'Trial'}
                          {user.subscription_status === 'canceled' && 'Cancelado'}
                          {user.subscription_status === 'past_due' && 'Pendente'}
                          {!['active', 'trialing', 'canceled', 'past_due'].includes(user.subscription_status || '') && user.subscription_status}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-muted gap-1">
                          <XCircle className="h-3 w-3" />
                          Sem assinatura
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {user.plan_name ? (
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm">{user.plan_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">---</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                            <Info className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClick(user)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Editar perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAssignPlanClick(user)}>
                            <Gift className="h-4 w-4 mr-2" />
                            Atribuir plano
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPasswordClick(user)}>
                            <KeyRound className="h-4 w-4 mr-2" />
                            Alterar senha
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(user)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir usuário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredUsers.length} de {users.length} usuários
      </p>

      {/* Edit Profile Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualizar informações do usuário {editingUser?.full_name || editingUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="@username"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} disabled={updateUserProfile.isPending}>
              {updateUserProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Plan Dialog */}
      <Dialog open={!!assigningPlanUser} onOpenChange={(open) => !open && setAssigningPlanUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Plano</DialogTitle>
            <DialogDescription>
              Atribuir ou alterar o plano de {assigningPlanUser?.full_name || assigningPlanUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.is_active).map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {plan.price_display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status da assinatura</Label>
              <Select value={selectedPlanStatus} onValueChange={setSelectedPlanStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trialing">Trial</SelectItem>
                  <SelectItem value="past_due">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningPlanUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignPlan} disabled={assignPlanToUser.isPending}>
              {assignPlanToUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Atribuir plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Definir nova senha para {resetPasswordUser?.full_name || resetPasswordUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A senha deve ter pelo menos 6 caracteres
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordUser(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleResetPassword} 
              disabled={resetUserPassword.isPending || newPassword.length < 6}
            >
              {resetUserPassword.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Alterar senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário <strong>{deletingUser?.full_name || deletingUser?.username}</strong> será 
              permanentemente removido do sistema, incluindo todos os seus dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Details Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações completas do usuário
            </DialogDescription>
          </DialogHeader>
          
          {viewingUser && (
            <div className="space-y-6 py-4">
              {/* User Header */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={viewingUser.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {viewingUser.full_name?.[0] || viewingUser.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {viewingUser.full_name || 'Sem nome'}
                  </h3>
                  <p className="text-sm text-muted-foreground">@{viewingUser.username || 'unknown'}</p>
                </div>
                {viewingUser.has_subscription && (
                  <Badge className={cn(
                    viewingUser.subscription_status === 'active' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                    viewingUser.subscription_status === 'trialing' && "bg-sky-500/10 text-sky-500 border-sky-500/20"
                  )}>
                    <Crown className="h-3 w-3 mr-1" />
                    {viewingUser.plan_name}
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Details Grid */}
              <div className="space-y-4">
                {/* Email */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{viewingUser.email || '---'}</p>
                    </div>
                  </div>
                  {viewingUser.email && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(viewingUser.email!, 'Email')}
                    >
                      {copiedField === 'Email' ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>

                {/* User ID */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">ID do Usuário</p>
                      <p className="text-sm font-medium font-mono truncate max-w-[200px]">{viewingUser.user_id}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(viewingUser.user_id, 'ID')}
                  >
                    {copiedField === 'ID' ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Email Verified */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    {viewingUser.email_confirmed_at ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email Verificado</p>
                    <p className="text-sm font-medium">
                      {viewingUser.email_confirmed_at ? 'Sim' : 'Não'}
                      {viewingUser.email_confirmed_at && (
                        <span className="text-muted-foreground ml-1">
                          ({formatDate(viewingUser.email_confirmed_at)})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Onboarding */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    {viewingUser.onboarding_completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Onboarding</p>
                    <p className="text-sm font-medium">
                      {viewingUser.onboarding_completed ? 'Completo' : 'Pendente'}
                    </p>
                  </div>
                </div>

                {/* Created At */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cadastrado em</p>
                    <p className="text-sm font-medium">{formatDate(viewingUser.created_at)}</p>
                  </div>
                </div>

                {/* Last Sign In */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Último login</p>
                    <p className="text-sm font-medium">
                      {viewingUser.last_sign_in_at ? formatDate(viewingUser.last_sign_in_at) : 'Nunca'}
                    </p>
                  </div>
                </div>

                {/* Subscription Status */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Crown className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assinatura</p>
                    <p className="text-sm font-medium">
                      {viewingUser.has_subscription ? (
                        <>
                          {viewingUser.plan_name} ({viewingUser.subscription_status === 'active' ? 'Ativo' : 
                            viewingUser.subscription_status === 'trialing' ? 'Trial' : 
                            viewingUser.subscription_status === 'canceled' ? 'Cancelado' : 
                            viewingUser.subscription_status})
                        </>
                      ) : (
                        'Sem assinatura'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setViewingUser(null)}>
              Fechar
            </Button>
            <Button onClick={handleEditFromDetails}>
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
