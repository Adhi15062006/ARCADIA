import React, { createContext, useContext, useState, useEffect } from "react";
import { User, onIdTokenChanged, signOut, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { setCrashlyticsUser } from "../firebase/crashlytics";

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdminLoggedIn: boolean;
  isClientLoggedIn: boolean;
  adminEmail: string | null;
  adminRole: string | null;
  clientEmail: string | null;
  clientName: string | null;
  clientAvatar: string | null;
  activeToken: string | null;
  logout: () => Promise<void>;
  setClientSession: (name: string, email: string, token: string, avatar: string) => void;
  setAdminSession: (token: string, email: string, role?: string) => void;
  triggerViewRedirect: (view: "admin" | "client" | "home") => void;
  onRedirectRequest?: (view: "admin" | "client" | "home") => void;
  setOnRedirectRequest: (cb: (view: "admin" | "client" | "home") => void) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Synchronous initial states from storage to avoid loading flicker
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return !!(sessionStorage.getItem("arcadia_admin_token") || localStorage.getItem("arcadia_admin_token"));
  });
  const [isClientLoggedIn, setIsClientLoggedIn] = useState<boolean>(() => {
    return !!(sessionStorage.getItem("arcadia_client_token") || localStorage.getItem("arcadia_client_token"));
  });

  const [adminEmail, setAdminEmailState] = useState<string | null>(() => {
    return sessionStorage.getItem("arcadia_admin_email") || localStorage.getItem("arcadia_admin_email");
  });
  const [adminRole, setAdminRoleState] = useState<string | null>(() => {
    return sessionStorage.getItem("arcadia_admin_role") || localStorage.getItem("arcadia_admin_role");
  });

  const [clientEmail, setClientEmailState] = useState<string | null>(() => {
    return sessionStorage.getItem("arcadia_client_email") || localStorage.getItem("arcadia_client_email");
  });
  const [clientName, setClientNameState] = useState<string | null>(() => {
    return sessionStorage.getItem("arcadia_client_name") || localStorage.getItem("arcadia_client_name");
  });
  const [clientAvatar, setClientAvatarState] = useState<string | null>(() => {
    return sessionStorage.getItem("arcadia_client_avatar") || localStorage.getItem("arcadia_client_avatar");
  });

  const [activeToken, setActiveToken] = useState<string | null>(() => {
    return sessionStorage.getItem("arcadia_admin_token") || 
           localStorage.getItem("arcadia_admin_token") ||
           sessionStorage.getItem("arcadia_client_token") ||
           localStorage.getItem("arcadia_client_token");
  });

  const redirectCallbackRef = React.useRef<((view: "admin" | "client" | "home") => void) | undefined>(undefined);

  const setOnRedirectRequest = React.useCallback((cb: (view: "admin" | "client" | "home") => void) => {
    redirectCallbackRef.current = cb;
  }, []);

  const triggerViewRedirect = React.useCallback((view: "admin" | "client" | "home") => {
    if (redirectCallbackRef.current) {
      redirectCallbackRef.current(view);
    }
  }, []);

  const setClientSession = React.useCallback((name: string, email: string, token: string, avatar: string) => {
    sessionStorage.setItem("arcadia_client_token", token);
    sessionStorage.setItem("arcadia_client_email", email);
    sessionStorage.setItem("arcadia_client_name", name);
    sessionStorage.setItem("arcadia_client_avatar", avatar);
    
    localStorage.setItem("arcadia_client_token", token);
    localStorage.setItem("arcadia_client_email", email);
    localStorage.setItem("arcadia_client_name", name);
    localStorage.setItem("arcadia_client_avatar", avatar);

    // Clean any admin state to prevent cross-contamination
    sessionStorage.removeItem("arcadia_admin_token");
    sessionStorage.removeItem("arcadia_admin_email");
    sessionStorage.removeItem("arcadia_admin_role");
    localStorage.removeItem("arcadia_admin_token");
    localStorage.removeItem("arcadia_admin_email");
    localStorage.removeItem("arcadia_admin_role");

    setClientEmailState(email);
    setClientNameState(name);
    setClientAvatarState(avatar);
    setActiveToken(token);
    setIsClientLoggedIn(true);
    setIsAdminLoggedIn(false);

    setCrashlyticsUser({ id: email, email });

    triggerViewRedirect("client");
  }, [triggerViewRedirect]);

  const setAdminSession = React.useCallback((token: string, email: string, role?: string) => {
    const resolvedRole = role || "Admin";
    sessionStorage.setItem("arcadia_admin_token", token);
    sessionStorage.setItem("arcadia_admin_email", email);
    sessionStorage.setItem("arcadia_admin_role", resolvedRole);

    localStorage.setItem("arcadia_admin_token", token);
    localStorage.setItem("arcadia_admin_email", email);
    localStorage.setItem("arcadia_admin_role", resolvedRole);

    // Clean any client state to prevent cross-contamination
    sessionStorage.removeItem("arcadia_client_token");
    sessionStorage.removeItem("arcadia_client_email");
    sessionStorage.removeItem("arcadia_client_name");
    sessionStorage.removeItem("arcadia_client_avatar");
    localStorage.removeItem("arcadia_client_token");
    localStorage.removeItem("arcadia_client_email");
    localStorage.removeItem("arcadia_client_name");
    localStorage.removeItem("arcadia_client_avatar");

    setAdminEmailState(email);
    setAdminRoleState(resolvedRole);
    setActiveToken(token);
    setIsAdminLoggedIn(true);
    setIsClientLoggedIn(false);

    setCrashlyticsUser({ id: email, email });

    triggerViewRedirect("admin");
  }, [triggerViewRedirect]);

  const logout = React.useCallback(async () => {
    sessionStorage.removeItem("arcadia_admin_token");
    sessionStorage.removeItem("arcadia_admin_email");
    sessionStorage.removeItem("arcadia_admin_role");
    sessionStorage.removeItem("arcadia_client_token");
    sessionStorage.removeItem("arcadia_client_email");
    sessionStorage.removeItem("arcadia_client_name");
    sessionStorage.removeItem("arcadia_client_avatar");
    sessionStorage.removeItem("arcadia_current_view");

    localStorage.removeItem("arcadia_admin_token");
    localStorage.removeItem("arcadia_admin_email");
    localStorage.removeItem("arcadia_admin_role");
    localStorage.removeItem("arcadia_client_token");
    localStorage.removeItem("arcadia_client_email");
    localStorage.removeItem("arcadia_client_name");
    localStorage.removeItem("arcadia_client_avatar");
    localStorage.removeItem("arcadia_current_view");

    setIsAdminLoggedIn(false);
    setIsClientLoggedIn(false);
    setAdminEmailState(null);
    setAdminRoleState(null);
    setClientEmailState(null);
    setClientNameState(null);
    setClientAvatarState(null);
    setActiveToken(null);
    setUser(null);

    setCrashlyticsUser(null);

    try {
      await signOut(auth);
    } catch (err) {
      console.error("[AuthContext] SignOut error:", err);
    }

    triggerViewRedirect("home");
  }, [triggerViewRedirect]);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      console.log("[Auth Audit] auth.currentUser:", firebaseUser);
      console.log("[Auth Audit] auth.currentUser.uid:", firebaseUser?.uid);
      console.log("[Auth Audit] auth.currentUser.email:", firebaseUser?.email);

      if (firebaseUser) {
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult();
          let role = idTokenResult.claims.role as string;
          let status = (idTokenResult.claims.status as string) || "active";

          const adminEmails = [
            (window as any).FIREBASE_CONFIG?.adminEmail || "",
            import.meta.env.VITE_ADMIN_EMAIL || "",
            "arcadiadevelopers07@gmail.com",
            "godesportsfreefire@gmail.com"
          ].filter(Boolean);

          const adminRoles = ["Super Admin", "Admin", "admin", "Manager", "Staff"];

          // Fallback 1: Check session/localStorage for existing role
          if (!role || role === "Customer") {
            const savedRole = sessionStorage.getItem("arcadia_admin_role") || localStorage.getItem("arcadia_admin_role");
            if (savedRole && savedRole !== "Customer") {
              role = savedRole;
            }
          }

          // Fallback 1.5: If active admin REST token is found, trust Admin role
          if (!role || role === "Customer") {
            const hasAdminToken = sessionStorage.getItem("arcadia_admin_token") || localStorage.getItem("arcadia_admin_token");
            if (hasAdminToken) {
              role = sessionStorage.getItem("arcadia_admin_role") || localStorage.getItem("arcadia_admin_role") || "Admin";
            }
          }

          // Fallback 2: Check Super Admin emails
          if ((!role || role === "Customer") && adminEmails.includes(firebaseUser.email || "")) {
            role = "Super Admin";
          }

          if (!role) {
            role = "Customer";
          }

          const email = firebaseUser.email || "";
          const name = firebaseUser.displayName || email.split("@")[0] || "Client";
          const avatar = firebaseUser.photoURL || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80`;
          const token = idTokenResult.token;

          // Auto-create or ensure users/{uid} document exists in Firestore for Security Rules matching
          try {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
              console.log("[Auth Audit] Auto-creating user role document for UID:", firebaseUser.uid);
              await setDoc(userDocRef, {
                uid: firebaseUser.uid,
                email,
                name,
                role,
                status,
                createdAt: new Date().toISOString()
              }, { merge: true });
            } else {
              const docData = userDoc.data();
              if (docData.role && docData.role !== role && adminRoles.includes(docData.role)) {
                role = docData.role;
              }
            }
          } catch (docErr) {
            console.warn("[Auth Audit] Automatic user role document sync deferred:", docErr);
          }

          if (status === "suspended") {
            console.warn("[AuthContext] Account is suspended, logging out.");
            await logout();
            setLoading(false);
            return;
          }

          if (adminRoles.includes(role)) {
            setAdminSession(token, email, role);
          } else {
            setClientSession(name, email, token, avatar);
          }
        } catch (err) {
          console.error("[AuthContext] Error identifying claims:", err);
        }
      } else {
        // Only clear state if no REST session tokens exist to ensure robust session fallback
        const hasAdminToken = sessionStorage.getItem("arcadia_admin_token") || localStorage.getItem("arcadia_admin_token");
        const hasClientToken = sessionStorage.getItem("arcadia_client_token") || localStorage.getItem("arcadia_client_token");
        if (!hasAdminToken && !hasClientToken) {
          setIsAdminLoggedIn(false);
          setIsClientLoggedIn(false);
          setAdminEmailState(null);
          setAdminRoleState(null);
          setClientEmailState(null);
          setClientNameState(null);
          setClientAvatarState(null);
          setActiveToken(null);

          signInAnonymously(auth).catch((anonErr) => {
            console.log("[AuthContext] Guest anonymous sign-in deferred:", anonErr.message || anonErr);
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setAdminSession, setClientSession, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdminLoggedIn,
        isClientLoggedIn,
        adminEmail,
        adminRole,
        clientEmail,
        clientName,
        clientAvatar,
        activeToken,
        logout,
        setClientSession,
        setAdminSession,
        triggerViewRedirect,
        setOnRedirectRequest
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
