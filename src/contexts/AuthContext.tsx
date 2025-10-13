import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export type UserRole = 'user' | 'photographer' | 'admin' | 'organizer';
export type OrganizationRole = 'admin' | 'organization' | 'photographer' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      return {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role as UserRole,
        avatar_url: data.avatar_url
      };
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        // Ignorar eventos durante logout
        if (localStorage.getItem('logout_in_progress') === 'true') {
          return;
        }
        
        
        // Handle token refresh errors
        if (event === 'TOKEN_REFRESHED' && !session) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        // Handle invalid refresh tokens
        if (event === 'SIGNED_OUT' && session === null) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetching to avoid blocking
        if (session?.user) {
          setTimeout(async () => {
            if (!mounted) return;
            try {
              const profileData = await fetchProfile(session.user.id);
              if (mounted) {
                setProfile(profileData);
                setLoading(false);
              }
            } catch (error) {
              console.error('Error fetching profile:', error);
              if (mounted) {
                setProfile(null);
                setLoading(false);
              }
            }
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error('Error getting session:', error);
        // If there's an error getting session, clear everything
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then(profileData => {
          if (mounted) {
            setProfile(profileData);
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      console.error('Erro no cadastro:', error);
      let errorMessage = "Não foi possível criar sua conta. ";
      
      if (error.message.includes('already registered')) {
        errorMessage = "Este email já está cadastrado. Tente fazer login.";
      } else if (error.message.includes('password')) {
        errorMessage = "A senha deve conter pelo menos 6 caracteres, incluindo letras, números e símbolos.";
      } else if (error.message.includes('email')) {
        errorMessage = "Por favor, digite um email válido.";
      } else {
        errorMessage += "Entre em contato: contato@stafotos.com";
      }
      
      toast({
        title: "Erro no cadastro",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      
      toast({
        title: "Cadastro realizado com sucesso! ✅",
        description: "Verifique seu email para confirmar a conta. Se não receber em alguns minutos, verifique a pasta de spam ou entre em contato.",
      });

      // Enviar email de boas-vindas em background (não bloqueia o cadastro)
      setTimeout(async () => {
        
        try {
          const { data: emailData, error: emailError } = await supabase.functions.invoke('send-welcome-email', {
            body: { email, fullName: fullName || 'Usuário' }
          });
          
          if (emailError) {
            console.error('❌ Erro ao enviar email de boas-vindas:', emailError);
          } else {
          }
        } catch (emailError) {
          console.error('❌ Exceção ao enviar email de boas-vindas:', emailError);
        }
      }, 0);
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      console.error('Erro no login:', error);
      let errorMessage = "Não foi possível fazer login. ";
      
      if (error.message.includes('Invalid login')) {
        errorMessage = "Email ou senha incorretos. Verifique suas credenciais.";
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = "Confirme seu email antes de fazer login. Verifique sua caixa de entrada.";
      } else if (error.message.includes('Too many requests')) {
        errorMessage = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
      } else {
        errorMessage += "Entre em contato: contato@stafotos.com";
      }
      
      toast({
        title: "Erro no login",
        description: errorMessage,
        variant: "destructive",
      });
    }
    
    return { error };
  };

  const signOut = async () => {
    try {
      // Marcar flag para evitar reautenticação automática
      localStorage.setItem('logout_in_progress', 'true');
      
      // Limpar dados locais primeiro
      setUser(null);
      setProfile(null);
      setSession(null);
      
      // Tentar fazer logout no servidor (scope global)
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (signOutError: any) {
        // Ignorar erro se sessão já estava expirada
        if (signOutError?.message !== 'Auth session missing!') {
          console.warn('Aviso ao fazer logout:', signOutError);
        }
      }
      
      // Limpar storage manualmente (todas as chaves do Supabase)
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
      
      // Remover flag após limpeza
      localStorage.removeItem('logout_in_progress');
      
      // Forçar reload completo para limpar qualquer cache
      window.location.replace('/');
    } catch (error) {
      console.error('Exceção durante logout:', error);
      // Forçar limpeza completa mesmo com erro
      setUser(null);
      setProfile(null);
      setSession(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/');
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro ao atualizar perfil",
        description: "Não foi possível atualizar suas informações. Tente novamente ou entre em contato: contato@stafotos.com",
        variant: "destructive",
      });
    } else {
      // Refresh profile data
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    }

    return { error };
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};