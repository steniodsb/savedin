import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTelegramLink } from '@/hooks/useTelegramLink';
import { MessageCircle, QrCode, Link2, Check, X, Loader2, ExternalLink, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Simple QR Code generator using SVG (no external dependency)
function QRCodeSVG({ value, size = 180 }: { value: string; size?: number }) {
  // We use a simple approach: render the URL as text with a visual QR placeholder
  // For production, you'd use a library like qrcode or generate server-side
  // Here we'll use the Google Charts API to generate a QR code image
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=transparent&color=currentColor`;

  return (
    <div className="rounded-xl overflow-hidden bg-white p-3 inline-block">
      <img
        src={qrUrl}
        alt="QR Code"
        width={size}
        height={size}
        className="block"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}

export function TelegramSettings() {
  const { telegramLink, isConnected, isLoading, deepLink, botUsername, generateLinkCode, disconnect } = useTelegramLink();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      await generateLinkCode();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (deepLink) {
      navigator.clipboard.writeText(deepLink);
      toast({ title: 'Link copiado!' });
    }
  };

  const handleOpenTelegram = () => {
    if (deepLink) {
      window.open(deepLink, '_blank');
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Connected state
  if (isConnected && telegramLink) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-500">Telegram conectado</p>
            <p className="text-xs text-muted-foreground">
              {telegramLink.first_name && `${telegramLink.first_name} `}
              {telegramLink.username && `@${telegramLink.username}`}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
          <p className="text-sm font-medium mb-2">O que você pode fazer no bot:</p>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>💸 Registrar despesas: <i>"gastei 50 no uber"</i></li>
            <li>💰 Registrar receitas: <i>"recebi 5000 salário"</i></li>
            <li>🏦 Ver saldo: <i>/saldo</i></li>
            <li>📊 Resumo do mês: <i>/resumo</i></li>
          </ul>
        </div>

        <Button
          variant="outline"
          onClick={() => window.open(`https://t.me/${botUsername}`, '_blank')}
          className="w-full gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          Abrir no Telegram
        </Button>

        <Button
          variant="ghost"
          onClick={handleDisconnect}
          className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <X className="h-4 w-4" />
          Desconectar
        </Button>
      </div>
    );
  }

  // Has link code but not yet connected (waiting for user to scan)
  if (deepLink && telegramLink?.link_code && !telegramLink?.chat_id) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-sm font-medium mb-4">Escaneie o QR Code ou clique no botão</p>

          <div className="flex justify-center mb-4">
            <QRCodeSVG value={deepLink} size={160} />
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            Escaneie com a câmera do celular para abrir no Telegram
          </p>
        </div>

        <Button onClick={handleOpenTelegram} className="w-full gap-2">
          <ExternalLink className="h-4 w-4" />
          Abrir no Telegram
        </Button>

        <Button variant="outline" onClick={handleCopyLink} className="w-full gap-2">
          <Copy className="h-4 w-4" />
          Copiar link
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Código: <span className="font-mono font-bold">{telegramLink.link_code}</span> · Válido por 10 minutos
        </p>
      </div>
    );
  }

  // Not connected, no code yet
  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <div className="h-14 w-14 rounded-2xl bg-[#229ED9]/10 flex items-center justify-center mx-auto mb-3">
          <MessageCircle className="h-7 w-7 text-[#229ED9]" />
        </div>
        <p className="text-sm font-semibold mb-1">Conecte seu Telegram</p>
        <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
          Registre transações rapidamente pelo Telegram, sem abrir o app.
        </p>
      </div>

      <Button
        onClick={handleGenerateCode}
        disabled={isGenerating}
        className="w-full gap-2"
      >
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
        Conectar Telegram
      </Button>
    </div>
  );
}
