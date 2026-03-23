import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Loader2, Mail, Lock, User, AtSign, Check, X, AlertCircle, Eye, EyeOff, MailCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import logoLight from '@/assets/logo-light.webp';
import logoDark from '@/assets/logo-dark.webp';
import { cn } from '@/lib/utils';
import { GlowBackground } from '@/components/ui/GlowBackground';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const signInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  username: z.string()
    .min(3, 'Nome de usuário deve ter pelo menos 3 caracteres')
    .max(20, 'Nome de usuário deve ter no máximo 20 caracteres')
    .regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e _'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [hasLoggedInBefore, setHasLoggedInBefore] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('rememberMe') === 'true';
  });
  // Password visibility states
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Forgot password states
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();

  // Check if user has logged in before
  useEffect(() => {
    const hasLogged = localStorage.getItem('hasLoggedInBefore') === 'true';
    setHasLoggedInBefore(hasLogged);
  }, []);

  // Handle OAuth callback errors from URL
  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      let message = 'Não foi possível conectar com Google. Tente novamente.';

      if (error === 'access_denied') {
        message = 'Acesso negado. Você cancelou a autenticação ou não concedeu as permissões necessárias.';
      } else if (errorDescription) {
        message = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
      }

      toast({
        title: 'Erro de autenticação',
        description: message,
        variant: 'destructive',
      });

      // Clean URL params
      window.history.replaceState({}, document.title, '/auth');
    }
  }, [searchParams]);

  // Handle OAuth callback - show loading while processing
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');

    if (accessToken && !user && !loading) {
      setIsProcessingOAuth(true);
    }
  }, [user, loading]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      let message = 'Não foi possível conectar com Google. Tente novamente.';

      if (error.message?.includes('popup_closed')) {
        message = 'A janela de login foi fechada. Tente novamente.';
      } else if (error.message?.includes('access_denied')) {
        message = 'Acesso negado. Verifique suas permissões.';
      }

      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      setIsGoogleLoading(false);
    }
    // Note: If no error, user will be redirected and page will reload
  };

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Apply system theme on mount for auth page (before user settings are loaded)
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (user && !loading) {
      // Mark that user has logged in before (also for OAuth logins)
      localStorage.setItem('hasLoggedInBefore', 'true');
      setIsProcessingOAuth(false);
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Watch username field for real-time validation
  const watchedUsername = signUpForm.watch('username');

  useEffect(() => {
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    if (!watchedUsername || watchedUsername.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(watchedUsername)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    usernameCheckTimeout.current = setTimeout(async () => {
      const { data, error } = await supabase
        .rpc('check_username_exists', { username_to_check: watchedUsername.toLowerCase() });

      if (error) {
        console.error('Error checking username:', error);
        setUsernameStatus('idle');
        return;
      }
      // data is boolean: true = exists (taken), false = available
      setUsernameStatus(data === true ? 'taken' : 'available');
    }, 500);

    return () => {
      if (usernameCheckTimeout.current) {
        clearTimeout(usernameCheckTimeout.current);
      }
    };
  }, [watchedUsername]);

  const getUsernameStatusIcon = () => {
    switch (usernameStatus) {
      case 'checking':
        return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
      case 'available':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'taken':
        return <X className="w-4 h-4 text-destructive" />;
      case 'invalid':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return null;
    }
  };

  const handleSignIn = async (data: SignInFormData) => {
    setIsLoading(true);

    // Attempt login first — Supabase returns specific errors for unconfirmed emails
    const { error } = await signIn(data.email, data.password);

    if (!error) {
      // Success
      localStorage.setItem('hasLoggedInBefore', 'true');
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso',
      });
      navigate('/');
      setIsLoading(false);
      return;
    }

    // Email not confirmed — account exists but needs confirmation
    if (error.message.includes('Email not confirmed')) {
      toast({
        title: 'Email não confirmado',
        description: 'Por favor, verifique sua caixa de entrada e confirme seu email antes de fazer login.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Too many requests
    if (error.message.includes('too many requests')) {
      toast({
        title: 'Muitas tentativas',
        description: 'Aguarde alguns minutos antes de tentar novamente.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // "Invalid login credentials" — could be wrong password OR account doesn't exist
    // Check profiles table to give a more specific message
    if (error.message.includes('Invalid login credentials')) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('email', data.email.trim())
        .maybeSingle();

      if (!profileData) {
        toast({
          title: 'Conta não encontrada',
          description: 'Nenhuma conta foi encontrada com este email.',
          variant: 'destructive',
          action: (
            <ToastAction altText="Cadastrar-se" onClick={() => setIsSignUp(true)}>
              Cadastrar-se
            </ToastAction>
          ),
        });
      } else {
        toast({
          title: 'Senha incorreta',
          description: 'Verifique sua senha e tente novamente.',
          variant: 'destructive',
        });
      }
      setIsLoading(false);
      return;
    }

    // Generic fallback
    toast({
      title: 'Erro ao fazer login',
      description: 'Ocorreu um erro inesperado. Tente novamente.',
      variant: 'destructive',
    });
    setIsLoading(false);
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsLoading(true);

    // Check if username is available using secure RPC function
    const { data: usernameExists, error: checkError } = await supabase
      .rpc('check_username_exists', { username_to_check: data.username.toLowerCase() });

    if (usernameExists === true) {
      toast({
        title: 'Erro',
        description: 'Este nome de usuário já está em uso',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(data.email, data.password, data.fullName, data.username.toLowerCase());

    if (error) {
      let message = 'Erro ao criar conta';
      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('already registered') || errorMsg.includes('already been registered') || errorMsg.includes('user already exists')) {
        message = 'Este email já está cadastrado. Faça login ou use outro email.';
        setIsSignUp(false); // Switch to login form
      } else if (errorMsg.includes('password')) {
        message = 'Senha muito fraca. Use uma combinação de letras e números';
      } else if (errorMsg.includes('email')) {
        message = 'Email inválido ou já cadastrado';
      }
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } else {
      setRegisteredEmail(data.email);
      setAwaitingEmailConfirmation(true);
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      toast({
        title: 'Erro',
        description: 'Digite seu email',
        variant: 'destructive',
      });
      return;
    }

    setForgotPasswordLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o email de recuperação. Tente novamente.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Email enviado!',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
      });
      setForgotPasswordOpen(false);
      setForgotPasswordEmail('');
    }
    setForgotPasswordLoading(false);
  };

  if (awaitingEmailConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <GlowBackground intensity="medium" />
        <Card className="w-full max-w-md border-border/10 bg-card/50 backdrop-blur-md shadow-lg relative z-10">
          <CardHeader className="space-y-4 text-center pb-6">
            <div className="mx-auto flex items-center justify-center">
              <img
                src={logoLight}
                alt="SaveDin"
                className="h-12 dark:hidden"
                onError={(e) => { e.currentTarget.src = '/logo-light.webp'; }}
              />
              <img
                src={logoDark}
                alt="SaveDin"
                className="h-12 hidden dark:block"
                onError={(e) => { e.currentTarget.src = '/logo-dark.webp'; }}
              />
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <MailCheck className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Confirme seu email</CardTitle>
              <CardDescription className="text-muted-foreground">
                Enviamos um link de confirmação para
              </CardDescription>
              <p className="font-medium text-foreground">{registeredEmail}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Clique no link enviado para ativar sua conta e fazer login.
              Verifique também sua pasta de spam.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setAwaitingEmailConfirmation(false);
                setIsSignUp(false);
              }}
            >
              Já confirmei, fazer login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || isProcessingOAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {isProcessingOAuth && (
          <p className="text-sm text-muted-foreground animate-pulse">
            Conectando com Google...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <GlowBackground intensity="medium" />
      <Card className="w-full max-w-md border-border/10 bg-card/50 backdrop-blur-md shadow-lg relative z-10">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="mx-auto flex items-center justify-center">
            <img
              src={logoLight}
              alt="SaveDin"
              className="h-12 dark:hidden"
              onError={(e) => { e.currentTarget.src = '/logo-light.webp'; }}
            />
            <img
              src={logoDark}
              alt="SaveDin"
              className="h-12 hidden dark:block"
              onError={(e) => { e.currentTarget.src = '/logo-dark.webp'; }}
            />
          </div>
          <CardDescription className="text-muted-foreground">
            {isSignUp ? 'Crie sua conta para começar' : 'Entre na sua conta'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSignUp ? (
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="Seu nome"
                    className="pl-10"
                    {...signUpForm.register('fullName')}
                  />
                </div>
                {signUpForm.formState.errors.fullName && (
                  <p className="text-sm text-destructive">
                    {signUpForm.formState.errors.fullName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Nome de usuário</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="seu_username"
                    className={cn(
                      "pl-10 pr-10",
                      usernameStatus === 'available' && "border-green-500 focus-visible:ring-green-500",
                      usernameStatus === 'taken' && "border-destructive focus-visible:ring-destructive",
                      usernameStatus === 'invalid' && "border-amber-500 focus-visible:ring-amber-500"
                    )}
                    {...signUpForm.register('username', {
                      onChange: (e) => {
                        e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                      }
                    })}
                    maxLength={20}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {getUsernameStatusIcon()}
                  </div>
                </div>
                {usernameStatus === 'available' && (
                  <p className="text-xs text-green-500">Nome de usuário disponível!</p>
                )}
                {usernameStatus === 'taken' && (
                  <p className="text-xs text-destructive">Este nome de usuário já está em uso</p>
                )}
                {usernameStatus === 'invalid' && (
                  <p className="text-xs text-amber-500">Use apenas letras minúsculas, números e _</p>
                )}
                {usernameStatus === 'idle' && (
                  <p className="text-xs text-muted-foreground">Usado para outros usuários te encontrarem</p>
                )}
                {signUpForm.formState.errors.username && usernameStatus === 'idle' && (
                  <p className="text-sm text-destructive">
                    {signUpForm.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    {...signUpForm.register('email')}
                  />
                </div>
                {signUpForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {signUpForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showSignUpPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    {...signUpForm.register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {signUpForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {signUpForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    {...signUpForm.register('confirmPassword')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {signUpForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {signUpForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  'Criar conta'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    {...signInForm.register('email')}
                  />
                </div>
                {signInForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {signInForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showSignInPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    {...signInForm.register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {signInForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {signInForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => {
                      const value = checked === true;
                      setRememberMe(value);
                      localStorage.setItem('rememberMe', value.toString());
                    }}
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Permanecer conectado
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setForgotPasswordEmail(signInForm.getValues('email') || '');
                    setForgotPasswordOpen(true);
                  }}
                  className="text-sm text-primary hover:text-primary/80 h-auto p-0"
                >
                  Esqueceu a senha?
                </Button>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/20"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card/50 backdrop-blur-sm px-2 text-muted-foreground">ou continue com</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </>
            )}
          </Button>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                signInForm.reset();
                signUpForm.reset();
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignUp
                ? 'Já tem uma conta? Faça login'
                : 'Não tem conta? Cadastre-se'}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar senha</DialogTitle>
            <DialogDescription>
              Digite seu email para receber um link de recuperação de senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="forgotEmail">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgotEmail"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setForgotPasswordOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleForgotPassword}
              disabled={forgotPasswordLoading || !forgotPasswordEmail}
            >
              {forgotPasswordLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar link'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
