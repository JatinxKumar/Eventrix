// src/lib/AuthProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";
import type { Session, User, AuthError, Provider } from "@supabase/supabase-js";

export type UserRole = "admin" | "organizer" | "participant";

export type AuthStatus = "initializing" | "authenticated" | "unauthenticated" | "error";

export interface UserProfile {
  full_name: string | null;
  role: UserRole;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authStatus: AuthStatus;
  authError: string | null;
  profile: UserProfile | null;
  signIn: (email: string, password: string) => Promise<UserProfile>;
  signUp: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<{ needsConfirmation: boolean; profile?: UserProfile }>;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  retryAuth: () => Promise<void>;
  getDashboardPath: (role: UserRole) => string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function devLog(message: string, details?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.debug(`[EVENTRIX Auth] ${message}`, details ?? "");
  }
}

function friendlyAuthError(err: AuthError | Error): string {
  const msg = err.message.toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return "Invalid email or password. Please try again.";
  }
  if (msg.includes("email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }
  if (
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("over_email_send_rate_limit")
  ) {
    return "Too many attempts. Please wait a few minutes before trying again.";
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (msg.includes("signup is not allowed") || msg.includes("signups not allowed")) {
    return "New signups are currently disabled. Please contact an administrator.";
  }
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  return err.message;
}

async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .single();

  if (error || !data) {
    devLog("Profile fetch failed", { userId, error: error?.message });
    return null;
  }
  devLog("Profile resolved", { userId, role: data.role });
  return { full_name: data.full_name, role: data.role as UserRole };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("initializing");
  const [authError, setAuthError] = useState<string | null>(null);
  const requestIdRef = React.useRef(0);

  const loading = authStatus === "initializing";

  const resolveSessionAndProfile = useCallback(async (nextSession: Session | null) => {
    const reqId = ++requestIdRef.current;
    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user?.id) {
      setProfile(null);
      setAuthError(null);
      setAuthStatus("unauthenticated");
      devLog("Session resolved: unauthenticated");
      return;
    }

    devLog("Restoring profile for user", { userId: nextSession.user.id });
    const loadedProfile = await fetchUserProfile(nextSession.user.id);
    if (reqId !== requestIdRef.current) {
      devLog("Ignoring stale profile response", { reqId });
      return;
    }

    if (!loadedProfile) {
      setProfile(null);
      setAuthError("Account profile could not be loaded. Please try again or contact support.");
      setAuthStatus("error");
      return;
    }

    setProfile(loadedProfile);
    setAuthError(null);
    setAuthStatus("authenticated");
  }, []);

  const retryAuth = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setAuthStatus("error");
      setAuthError("Supabase is not configured.");
      return;
    }
    setAuthStatus("initializing");
    setAuthError(null);
    try {
      const { data, error } = await getSupabaseClient().auth.getSession();
      if (error) {
        setAuthError(friendlyAuthError(error));
        setAuthStatus("error");
        return;
      }
      await resolveSessionAndProfile(data.session);
    } catch (e: unknown) {
      setAuthError(e instanceof Error ? e.message : "Failed to restore session.");
      setAuthStatus("error");
    }
  }, [resolveSessionAndProfile]);

  // Initial session load + auth state listener (no awaits inside onAuthStateChange)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthStatus("unauthenticated");
      return;
    }

    let mounted = true;
    const supabase = getSupabaseClient();

    const init = async () => {
      devLog("Initializing session");
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) {
          devLog("getSession error", { error: error.message });
          setAuthError(friendlyAuthError(error));
          setAuthStatus("error");
          return;
        }
        await resolveSessionAndProfile(data.session);
      } catch (e: unknown) {
        if (!mounted) return;
        setAuthError(e instanceof Error ? e.message : "Failed to initialize authentication.");
        setAuthStatus("error");
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      devLog("onAuthStateChange", { event, hasSession: Boolean(nextSession) });
      if (!mounted) return;
      // Defer async profile fetch outside the synchronous callback
      setTimeout(() => {
        if (mounted) {
          void resolveSessionAndProfile(nextSession);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [resolveSessionAndProfile]);

  const getDashboardPath = useCallback((role: UserRole): string => {
    return `/dashboard/${role}`;
  }, []);

  const signIn = async (email: string, password: string): Promise<UserProfile> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendlyAuthError(error));
    if (!data.user) throw new Error("Authentication failed: no user returned.");

    const userProfile = await fetchUserProfile(data.user.id);
    if (!userProfile) {
      await supabase.auth.signOut();
      throw new Error("Account profile not found. Please contact an administrator.");
    }

    setSession(data.session);
    setUser(data.user);
    setProfile(userProfile);
    setAuthError(null);
    setAuthStatus("authenticated");
    return userProfile;
  };

  const signUp = async (
    fullName: string,
    email: string,
    password: string,
  ): Promise<{ needsConfirmation: boolean; profile?: UserProfile }> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) throw new Error(friendlyAuthError(error));

    if (data.session && data.user) {
      // Session created – fetch profile (may be created by DB trigger)
      const userProfile = await fetchUserProfile(data.user.id);
      if (!userProfile) {
        // Fallback: assume participant role if profile not yet present
        const fallbackProfile = { full_name: null, role: "participant" as UserRole };
        setSession(data.session);
        setUser(data.user);
        setProfile(fallbackProfile);
        setAuthError(null);
        setAuthStatus("authenticated");
        return { needsConfirmation: false, profile: fallbackProfile };
      }
      setSession(data.session);
      setUser(data.user);
      setProfile(userProfile);
      setAuthError(null);
      setAuthStatus("authenticated");
      return { needsConfirmation: false, profile: userProfile };
    }

    return { needsConfirmation: true };
  };

  const signInWithGoogle = async (redirectTo?: string): Promise<void> => {
    const supabase = getSupabaseClient();
    const callbackUrl = `${window.location.origin}/auth/callback`;
    const finalRedirectTo =
      redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
        ? `${callbackUrl}?redirect=${encodeURIComponent(redirectTo)}`
        : callbackUrl;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google" as Provider,
      options: {
        redirectTo: finalRedirectTo,
      },
    });
    if (error) throw new Error(friendlyAuthError(error));
  };

  const signOut = async () => {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw new Error(friendlyAuthError(error));
    setSession(null);
    setUser(null);
    setProfile(null);
    setAuthError(null);
    setAuthStatus("unauthenticated");
  };

  const resetPassword = async (email: string) => {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(friendlyAuthError(error));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        authStatus,
        authError,
        profile,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        retryAuth,
        getDashboardPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
