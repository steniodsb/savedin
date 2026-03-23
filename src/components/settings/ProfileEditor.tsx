import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Camera, User, Mail, Lock, Save, X, Eye, EyeOff, AtSign, Check, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      { unit: '%', width: 90 },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

// Username validation regex: only lowercase letters, numbers, and underscore
const USERNAME_REGEX = /^[a-z0-9_]+$/;

export function ProfileEditor() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [usernameUpdatedAt, setUsernameUpdatedAt] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'too_soon'>('idle');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Image crop states
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  // Calculate days until next username change
  const canChangeUsername = useCallback(() => {
    if (!usernameUpdatedAt) return true;
    const lastUpdate = new Date(usernameUpdatedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 7;
  }, [usernameUpdatedAt]);

  const daysUntilChange = useCallback(() => {
    if (!usernameUpdatedAt) return 0;
    const lastUpdate = new Date(usernameUpdatedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 7 - diffDays);
  }, [usernameUpdatedAt]);

  // Fetch current profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, full_name, username, username_updated_at')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setAvatarUrl(data.avatar_url);
        if (data.full_name) setFullName(data.full_name);
        if (data.username) {
          setUsername(data.username);
          setOriginalUsername(data.username);
        }
        setUsernameUpdatedAt(data.username_updated_at);
      }
    };
    fetchProfile();
  }, [user?.id]);

  // Check username availability with debounce
  useEffect(() => {
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    // Don't check if same as original
    if (username === originalUsername) {
      setUsernameStatus('idle');
      return;
    }

    // Validate format
    if (username.length > 0 && username.length < 3) {
      setUsernameStatus('invalid');
      return;
    }

    if (username.length > 0 && !USERNAME_REGEX.test(username)) {
      setUsernameStatus('invalid');
      return;
    }

    if (username.length >= 3) {
      // Check if can change (7 days rule)
      if (!canChangeUsername()) {
        setUsernameStatus('too_soon');
        return;
      }

      setUsernameStatus('checking');
      usernameCheckTimeout.current = setTimeout(async () => {
        // Use secure RPC function to check username availability
        const { data: exists, error } = await supabase
          .rpc('check_username_exists', { username_to_check: username.toLowerCase() });

        if (error) {
          console.error('Error checking username:', error);
          setUsernameStatus('idle');
          return;
        }
        // data is boolean: true = exists (taken), false = available
        setUsernameStatus(exists === true ? 'taken' : 'available');
      }, 500);
    } else {
      setUsernameStatus('idle');
    }

    return () => {
      if (usernameCheckTimeout.current) {
        clearTimeout(usernameCheckTimeout.current);
      }
    };
  }, [username, originalUsername, user?.id, canChangeUsername]);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setShowCropDialog(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  const getCroppedImg = async (): Promise<Blob | null> => {
    if (!imgRef.current || !completedCrop) return null;

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
    });
  };

  const handleSaveCrop = async () => {
    setIsLoading(true);
    try {
      const croppedBlob = await getCroppedImg();
      if (!croppedBlob || !user?.id) {
        throw new Error('Erro ao processar imagem');
      }

      const reader = new FileReader();
      reader.readAsDataURL(croppedBlob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: base64data })
          .eq('user_id', user.id);

        if (error) throw error;

        setAvatarUrl(base64data);
        setShowCropDialog(false);
        setImgSrc('');
        toast({
          title: 'Sucesso',
          description: 'Foto de perfil atualizada!',
        });
      };
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar foto',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!user?.id || !fullName.trim()) return;
    
    setIsLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() }
      });

      if (authError) throw authError;

      toast({
        title: 'Sucesso',
        description: 'Nome atualizado!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar nome',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!user?.id || !username.trim()) return;
    if (username === originalUsername) return;
    if (usernameStatus !== 'available') return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          username: username.toLowerCase().trim(),
          username_updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setOriginalUsername(username.toLowerCase().trim());
      setUsernameUpdatedAt(new Date().toISOString());
      setUsernameStatus('idle');
      toast({
        title: 'Sucesso',
        description: 'Nome de usuário atualizado!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar nome de usuário',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: 'Erro',
        description: 'Email inválido',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim()
      });

      if (error) throw error;

      setNewEmail('');
      toast({
        title: 'Email de confirmação enviado',
        description: 'Verifique sua caixa de entrada atual para confirmar a alteração',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos de senha',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      toast({
        title: 'Sucesso',
        description: 'Senha atualizada!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar senha',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (usernameStatus) {
      case 'checking':
        return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
      case 'available':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'taken':
        return <X className="w-4 h-4 text-destructive" />;
      case 'invalid':
      case 'too_soon':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (usernameStatus) {
      case 'checking':
        return 'Verificando disponibilidade...';
      case 'available':
        return 'Nome de usuário disponível!';
      case 'taken':
        return 'Este nome de usuário já está em uso';
      case 'invalid':
        return 'Use apenas letras minúsculas, números e _ (mín. 3 caracteres)';
      case 'too_soon':
        return `Você pode alterar novamente em ${daysUntilChange()} dia(s)`;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Avatar Section */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden border-2 border-primary/30">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full gradient-bg text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onSelectFile}
            className="hidden"
          />
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">{fullName || 'Seu nome'}</p>
          <p className="text-sm text-muted-foreground">@{originalUsername || 'username'}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Name Section */}
      <div className="p-4 bg-muted/30 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          <Label className="font-medium">Nome completo</Label>
        </div>
        <div className="flex gap-2">
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu nome completo"
            className="flex-1"
          />
          <Button onClick={handleUpdateName} disabled={isLoading} size="icon">
            <Save className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Username Section */}
      <div className="p-4 bg-muted/30 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <AtSign className="w-5 h-5 text-primary" />
          <Label className="font-medium">Nome de usuário</Label>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="seu_username"
              className={cn(
                "pr-10",
                usernameStatus === 'available' && "border-green-500 focus-visible:ring-green-500",
                usernameStatus === 'taken' && "border-destructive focus-visible:ring-destructive",
                (usernameStatus === 'invalid' || usernameStatus === 'too_soon') && "border-amber-500 focus-visible:ring-amber-500"
              )}
              maxLength={20}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {getStatusIcon()}
            </div>
          </div>
          <Button 
            onClick={handleUpdateUsername} 
            disabled={isLoading || usernameStatus !== 'available' || username === originalUsername} 
            size="icon"
          >
            <Save className="w-4 h-4" />
          </Button>
        </div>
        {getStatusMessage() && (
          <p className={cn(
            "text-xs",
            usernameStatus === 'available' && "text-green-500",
            usernameStatus === 'taken' && "text-destructive",
            (usernameStatus === 'invalid' || usernameStatus === 'too_soon') && "text-amber-500",
            usernameStatus === 'checking' && "text-muted-foreground"
          )}>
            {getStatusMessage()}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Usado para outros usuários te encontrarem. Pode ser alterado a cada 7 dias.
        </p>
      </div>

      {/* Email Section */}
      <div className="p-4 bg-muted/30 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <Label className="font-medium">Alterar email</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Email atual: <span className="font-medium text-foreground">{user?.email}</span>
        </p>
        <div className="flex gap-2">
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="novo@email.com"
            className="flex-1"
          />
          <Button onClick={handleUpdateEmail} disabled={isLoading || !newEmail.trim()}>
            Alterar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Um email de confirmação será enviado para seu email atual
        </p>
      </div>

      {/* Password Section */}
      <div className="p-4 bg-muted/30 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          <Label className="font-medium">Alterar senha</Label>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <Input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nova senha"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar nova senha"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          <Button onClick={handleUpdatePassword} disabled={isLoading} className="w-full">
            Atualizar senha
          </Button>
        </div>
      </div>

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recortar foto</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {imgSrc && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
                className="max-h-[400px]"
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop"
                  onLoad={onImageLoad}
                  className="max-h-[400px]"
                />
              </ReactCrop>
            )}
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCropDialog(false);
                  setImgSrc('');
                }}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSaveCrop} disabled={isLoading} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
