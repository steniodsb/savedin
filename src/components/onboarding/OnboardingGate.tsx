import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingGateProps {
  children: React.ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { isOnboardingComplete, isLoading: onboardingLoading } = useOnboarding();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setTimedOut(true);
    }, 8000); // 8 seconds max loading

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Don't do anything while loading
    if (authLoading || onboardingLoading) return;

    // Clear timeout when loading completes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If no user, auth will handle redirect
    if (!user) return;

    // If onboarding not complete, redirect to onboarding
    if (!isOnboardingComplete) {
      setShouldRedirect(true);
      navigate('/onboarding', { replace: true });
    }
  }, [authLoading, onboardingLoading, user, isOnboardingComplete, navigate]);

  // Show loading while checking (with improved visibility)
  if ((authLoading || onboardingLoading) && !timedOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    );
  }

  // If we're about to redirect, show loading
  if ((shouldRedirect || (!isOnboardingComplete && user)) && !timedOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-sm">Preparando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
