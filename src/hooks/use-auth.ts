import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Singleton pour éviter les multiples instances
class AuthManager {
  private listeners: Set<(state: AuthState) => void> = new Set();
  private state: AuthState = {
    user: null,
    isLoading: true,
    isAuthenticated: false,
  };
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;


    // Vérification initiale
    await this.checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        
        await this.updateState(session);
      }
    );

    // Nettoyer la subscription quand nécessaire
    this.cleanup = () => {
      subscription.unsubscribe();
    };
  }

  private async checkSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        await this.updateState(null);
        return;
      }

      await this.updateState(session);
    } catch (error) {
      await this.updateState(null);
    }
  }

  private async updateState(session: any) {
    const user = session?.user || null;
    const isAuthenticated = !!user;
    
    this.state = {
      user,
      isLoading: false,
      isAuthenticated,
    };


    // Notifier tous les listeners
    this.listeners.forEach(listener => listener(this.state));
  }

  public subscribe(listener: (state: AuthState) => void) {
    this.listeners.add(listener);
    
    // Retourner immédiatement l'état actuel
    listener(this.state);
    
    // Fonction de désabonnement
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  private cleanup?: () => void;

  public destroy() {
    if (this.cleanup) {
      this.cleanup();
    }
    this.listeners.clear();
  }
}

// Instance globale
const authManager = new AuthManager();

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>(() => ({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  }));

  useEffect(() => {
    const unsubscribe = authManager.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  const signOut = useCallback(async () => {
    await authManager.signOut();
  }, []);

  return {
    ...authState,
    signOut,
  };
};
