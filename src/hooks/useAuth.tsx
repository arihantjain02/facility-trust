import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: string[];
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  roles: [],
  signOut: async () => {},
  refreshRoles: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);

  const loadRoles = async (userId: string | undefined) => {
    if (!userId) return setRoles([]);
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setRoles((data ?? []).map((r) => r.role as string));
  };

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    try {
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        if (!active) return;
        setSession(s);
        setLoading(false);
        setTimeout(() => void loadRoles(s?.user?.id), 0);
      });
      unsubscribe = () => sub.subscription.unsubscribe();

      void supabase.auth
        .getSession()
        .then(({ data }) => {
          if (!active) return;
          setSession(data.session);
          setLoading(false);
          void loadRoles(data.session?.user?.id);
        })
        .catch(() => {
          if (!active) return;
          setSession(null);
          setRoles([]);
          setLoading(false);
        });
    } catch {
      setSession(null);
      setRoles([]);
      setLoading(false);
    }

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        roles,
        signOut: async () => {
          await supabase.auth.signOut();
        },
        refreshRoles: () => loadRoles(session?.user?.id),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
