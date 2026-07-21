import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import AnimatedButton from "./ui/animated-button";
import { auth, googleProvider, githubProvider } from "../firebase/config";
import { 
  signInWithPopup, 
  signInWithCustomToken,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification
} from "firebase/auth";
import { 
  User, 
  Mail, 
  Lock, 
  Globe, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Info, 
  X, 
  ShieldCheck, 
  ArrowRight,
  ArrowLeft
} from "lucide-react";

interface LoginPortalProps {
  lang: "en" | "hi";
  initialTab?: "client" | "admin";
  onShowToast: (type: "success" | "info" | "error", msg: string) => void;
  onClientLoginSuccess: (name: string, email: string, token: string, avatar: string) => void;
  onAdminLoginSuccess: (token: string, email: string, role?: string) => void;
  onClose?: () => void;
}

// Custom Premium Google Icon
const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2.5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

// Custom Premium GitHub Icon
const GitHubIcon = () => (
  <svg className="w-4 h-4 mr-2.5 text-black fill-current" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

// Arcadia Custom Semicircle Icon matching the style in the uploaded image
const ArcadiaLogoIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="currentColor"/>
    <path d="M6 12C6 15.3137 8.68629 18 12 18C15.3137 18 18 15.3137 18 12H6Z" fill="white"/>
  </svg>
);

export default function LoginPortal({
  lang,
  initialTab = "client",
  onShowToast,
  onClientLoginSuccess,
  onAdminLoginSuccess,
  onClose
}: LoginPortalProps) {
  const [activeTab, setActiveTab] = useState<"client" | "admin">(initialTab);

  // Client states
  const [isClientSignUp, setIsClientSignUp] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [showClientPassword, setShowClientPassword] = useState(false);
  const [clientAuthError, setClientAuthError] = useState("");
  const [isClientLoading, setIsClientLoading] = useState(false);

  // Admin states
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState("");
  const [isAdminLoading, setIsAdminLoading] = useState(false);


  // Client Forgot Password states
  const [isClientForgot, setIsClientForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientAuthError("");
    setIsForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      onShowToast("success", "Password reset email dispatched via Firebase Security! Please check your inbox.");
      setIsClientForgot(false);
      setClientEmail(forgotEmail);
    } catch (err: any) {
      setClientAuthError(err.message || "Failed to dispatch password reset email.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleClientAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientAuthError("");
    setIsClientLoading(true);

    const url = isClientSignUp ? "/api/auth/client-register" : "/api/auth/client-login";
    const body = isClientSignUp 
      ? { email: clientEmail, name: clientName, password: clientPassword } 
      : { email: clientEmail, password: clientPassword };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok) {
        // Authenticate directly with Firebase Auth using email and password to set native persistence
        try {
          await signInWithEmailAndPassword(auth, clientEmail, clientPassword);
        } catch (firebaseErr: any) {
          console.warn("Direct Firebase Auth client login failed, trying custom token:", firebaseErr.message);
          if (data.firebaseToken) {
            try {
              await signInWithCustomToken(auth, data.firebaseToken);
            } catch (tokErr: any) {
              console.error("Firebase custom token registration/login failed:", tokErr.message);
            }
          }
        }

        onClientLoginSuccess(
          data.user.name,
          data.user.email,
          data.token,
          data.user.avatar || ""
        );
        onShowToast("success", isClientSignUp ? "Corporate Client Account Created!" : "Session Initialized Successfully!");
      } else {
        setClientAuthError(data.error || "Authentication failed. Double check credentials.");
      }
    } catch (err) {
      setClientAuthError("Could not connect to authentication gateway.");
    } finally {
      setIsClientLoading(false);
    }
  };

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError("");
    setIsAdminLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      const data = await res.json();

      if (res.ok) {
        // Authenticate directly with Firebase Auth using email and password to set native persistence
        try {
          await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        } catch (firebaseErr: any) {
          console.warn("Direct Firebase Auth admin login failed, trying custom token:", firebaseErr.message);
          if (data.firebaseToken) {
            try {
              await signInWithCustomToken(auth, data.firebaseToken);
            } catch (tokErr: any) {
              console.error("Firebase custom token admin login failed:", tokErr.message);
            }
          }
        }

        onAdminLoginSuccess(data.token, data.email, data.role);
        onShowToast("success", "Administrative session authorized!");
      } else {
        setAdminAuthError(data.error || "Access denied. Token verification failed.");
      }
    } catch (err) {
      setAdminAuthError("Administrative bridge handshake failed.");
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleSocialAuth = async (providerName: "google" | "github") => {
    setClientAuthError("");
    setIsClientLoading(true);
    try {
      const provider = providerName === "google" ? googleProvider : githubProvider;
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();

      const res = await fetch("/api/auth/social-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        }
      });
      const data = await res.json();

      if (res.ok) {
        onClientLoginSuccess(
          data.user.name,
          data.user.email,
          data.token,
          data.user.avatar || ""
        );
        onShowToast("success", `Authenticated successfully with ${providerName === "google" ? "Google" : "GitHub"}!`);
      } else {
        setClientAuthError(data.error || "Failed to synchronize social authentication.");
        await auth.signOut();
      }
    } catch (err: any) {
      console.error(err);
      setClientAuthError(err.message || "Social login handshake was interrupted.");
    } finally {
      setIsClientLoading(false);
    }
  };

  // Unauthenticated sandbox bypasses removed for strict production security compliance.

  return (
    <div 
      id="unified-login-portal-white" 
      className="fixed inset-0 bg-white text-gray-900 z-[9999] overflow-y-auto flex flex-col font-sans select-text"
    >
      {/* Top Header Bar */}
      <div className="w-full px-6 py-5 md:px-12 flex justify-between items-center bg-white border-b border-gray-50 shrink-0">
        <div className="flex items-center gap-2 select-none">
          <ArcadiaLogoIcon className="w-6 h-6 text-black" />
          <span className="font-display font-semibold text-lg tracking-tight text-black">
            arcadia<span className="text-gray-400">.</span>
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-black hover:bg-gray-50 rounded-lg transition duration-200 font-medium cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Back to site</span>
          </button>
        )}
      </div>

      {/* Main Centered Content */}
      <div className="w-full max-w-md mx-auto px-6 py-12 md:py-20 flex-grow flex flex-col justify-center">
        
        {/* Centered Heading exactly as in the image */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-black text-black tracking-tight font-sans">
            Welcome to Arcadia
          </h2>
          <p className="text-xs text-gray-500 mt-2 max-w-[320px] mx-auto leading-relaxed">
            {lang === "en" 
              ? "Futuristic digital legacy environment and custom SaaS co-dev platform" 
              : "भविष्य डिजिटल विरासत पर्यावरण और कस्टम SaaS सह-देव मंच"}
          </p>
        </div>

        {/* Minimalist modern tab switcher */}
        <div className="flex justify-center gap-8 mb-8 border-b border-gray-100 pb-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab("client");
              setIsClientForgot(false);
              setClientAuthError("");
            }}
            className={`pb-1.5 font-sans text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === "client" 
                ? "text-black border-b-2 border-black" 
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Client Portal
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("admin");
              setAdminAuthError("");
            }}
            className={`pb-1.5 font-sans text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === "admin" 
                ? "text-black border-b-2 border-black" 
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Admin Access
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "client" ? (
            isClientForgot ? (
              /* ================= CLIENT FORGOT PASSWORD ================= */
              <motion.div
                key="client-forgot-section-white"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsClientForgot(false);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-black hover:bg-gray-100 px-3 py-1.5 rounded-lg transition mb-2 font-medium cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </button>
                  <h3 className="font-semibold text-lg text-black">
                    Reset Client Password
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Enter your registered email to dispatch a secure Firebase password reset link.
                  </p>
                </div>

                {clientAuthError && (
                  <div className="p-3.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs text-center font-medium">
                    ⚠️ {clientAuthError}
                  </div>
                )}

                <form onSubmit={handleForgotRequest} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      Business Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="client@corporate.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    />
                  </div>

                  <AnimatedButton
                    type="submit"
                    disabled={isForgotLoading}
                    className="w-full py-2.5 rounded-lg bg-[#111] hover:bg-black text-white font-medium text-sm transition duration-200 cursor-pointer text-center select-none shadow-sm flex items-center justify-center gap-2"
                  >
                    {isForgotLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <span>Dispatch Reset Link</span>
                    )}
                  </AnimatedButton>
                </form>
              </motion.div>
            ) : (
              /* ================= CLIENT NORMAL FLOW ================= */
              <motion.div
                key="client-section-white"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="space-y-5"
              >
                {/* Header text for Sign in or Register */}
                <div className="text-center mb-1">
                  <h3 className="font-semibold text-lg text-black">
                    {isClientSignUp ? "Register Corporate Account" : "Access Co-Dev Hub"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {isClientSignUp 
                      ? "Create a dedicated workspace to manage co-author assets and milestones."
                      : "Verify design boards, settle transactions, and manage invoice assets."}
                  </p>
                </div>

                {clientAuthError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs text-center font-medium">
                    ⚠️ {clientAuthError}
                  </div>
                )}


                {/* Main Email Form */}
                <form onSubmit={handleClientAuth} className="space-y-4">
                  {isClientSignUp && (
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                        Full Name / Corporate Alias
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikram Malhotra"
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Type your email"
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-gray-700 block">
                        Secret Key Pass
                      </label>
                      {!isClientSignUp && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsClientForgot(true);
                            setForgotEmail(clientEmail);
                            setClientAuthError("");
                          }}
                          className="text-xs font-medium text-gray-500 hover:text-black transition cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showClientPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={clientPassword}
                        onChange={e => setClientPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowClientPassword(!showClientPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition cursor-pointer"
                      >
                        {showClientPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <AnimatedButton
                    type="submit"
                    disabled={isClientLoading}
                    className="w-full py-2.5 rounded-lg bg-[#111] hover:bg-black text-white font-medium text-sm transition duration-200 cursor-pointer text-center select-none shadow-sm flex items-center justify-center gap-2"
                  >
                    {isClientLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Initializing...</span>
                      </>
                    ) : (
                      <span>{isClientSignUp ? "Register Account" : "Continue with email"}</span>
                    )}
                  </AnimatedButton>
                </form>

                {/* Or Divider */}
                <div className="relative my-4 h-5 flex items-center">
                  <span className="w-full border-t border-gray-100" />
                </div>

                {/* Social Sign In Buttons */}
                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => handleSocialAuth("google")}
                    disabled={isClientLoading}
                    className="flex items-center justify-center px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 transition duration-200 cursor-pointer disabled:opacity-50 select-none shadow-sm"
                  >
                    <GoogleIcon />
                    <span>Google</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSocialAuth("github")}
                    disabled={isClientLoading}
                    className="flex items-center justify-center px-4 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 transition duration-200 cursor-pointer disabled:opacity-50 select-none shadow-sm"
                  >
                    <GitHubIcon />
                    <span>GitHub</span>
                  </button>
                </div>

                {/* Toggle client signin/signup */}
                <div className="text-center text-xs text-gray-500">
                  {isClientSignUp ? (
                    <span>
                      Already configured?{" "}
                      <button 
                        type="button"
                        onClick={() => {
                          setIsClientSignUp(false);
                          setClientAuthError("");
                        }} 
                        className="text-black font-semibold hover:underline cursor-pointer"
                      >
                        Sign In Here
                      </button>
                    </span>
                  ) : (
                    <span>
                      New corporate client?{" "}
                      <button 
                        type="button"
                        onClick={() => {
                          setIsClientSignUp(true);
                          setClientAuthError("");
                        }} 
                        className="text-black font-semibold hover:underline cursor-pointer"
                      >
                        Register Account
                      </button>
                    </span>
                  )}
                </div>


              </motion.div>
            )
          ) : (
            /* ================= ADMIN FLOW ================= */
            <motion.div
              key="admin-section-white"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="space-y-5"
            >
              <div className="text-center mb-1">
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-full w-fit mx-auto mb-2">
                  <Lock className="w-5 h-5 text-black" />
                </div>
                <h3 className="font-semibold text-lg text-black">
                  Secure Admin Node
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Access restricted to certified system directors and project administrators.
                </p>
              </div>

              {adminAuthError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs text-center font-medium">
                  ⚠️ {adminAuthError}
                </div>
              )}

              <form onSubmit={handleAdminAuth} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Protocol Username
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="admin"
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Secret Code Passphrase
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition cursor-pointer"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <AnimatedButton
                  type="submit"
                  disabled={isAdminLoading}
                  className="w-full py-2.5 rounded-lg bg-[#111] hover:bg-black text-white font-medium text-sm transition duration-200 cursor-pointer text-center select-none shadow-sm flex items-center justify-center gap-2"
                >
                  {isAdminLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying Cryptography...</span>
                    </>
                  ) : (
                    <span>Settle Admin Authorization</span>
                  )}
                </AnimatedButton>
              </form>


            </motion.div>
          )}
        </AnimatePresence>

        {/* Preconfigured Demo Accounts Helper */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <Info className="w-3.5 h-3.5 text-black" />
            <span>Interactive Demo Accounts</span>
          </div>
          {activeTab === "client" ? (
            <div className="space-y-2 text-xs">
              <div 
                className="p-2.5 bg-white rounded-lg border border-gray-200 flex justify-between items-center cursor-pointer hover:border-black hover:bg-gray-50 transition duration-150"
                onClick={() => {
                  setClientEmail("vikram@zenix.com");
                  setClientPassword("password123");
                  onShowToast("info", "Filled Client credentials: Vikram Malhotra");
                }}
              >
                <div>
                  <span className="font-semibold block text-gray-800 text-[11px]">Client: Vikram Malhotra</span>
                  <span className="font-mono text-gray-400 text-[10px]">vikram@zenix.com / password123</span>
                </div>
                <span className="text-[10px] bg-black text-white px-2 py-1 rounded font-medium select-none">Fill</span>
              </div>
              <div 
                className="p-2.5 bg-white rounded-lg border border-gray-200 flex justify-between items-center cursor-pointer hover:border-black hover:bg-gray-50 transition duration-150"
                onClick={() => {
                  setClientEmail("priyanka@aura.com");
                  setClientPassword("password123");
                  onShowToast("info", "Filled Client credentials: Priyanka Sen");
                }}
              >
                <div>
                  <span className="font-semibold block text-gray-800 text-[11px]">Client: Priyanka Sen</span>
                  <span className="font-mono text-gray-400 text-[10px]">priyanka@aura.com / password123</span>
                </div>
                <span className="text-[10px] bg-black text-white px-2 py-1 rounded font-medium select-none">Fill</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div 
                className="p-2.5 bg-white rounded-lg border border-gray-200 flex justify-between items-center cursor-pointer hover:border-black hover:bg-gray-50 transition duration-150"
                onClick={() => {
                  setAdminEmail("admin");
                  setAdminPassword("findme@arcadia1509");
                  onShowToast("info", "Filled Super Admin credentials");
                }}
              >
                <div>
                  <span className="font-semibold block text-gray-800 text-[11px]">Super Admin Profile</span>
                  <span className="font-mono text-gray-400 text-[10px]">admin / findme@arcadia1509</span>
                </div>
                <span className="text-[10px] bg-black text-white px-2 py-1 rounded font-medium select-none">Fill</span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Privacy notice matching footer styling from the uploaded image */}
        <p className="text-[11px] text-gray-400 text-center max-w-[320px] mx-auto leading-relaxed mt-6">
          By clicking &quot;Continue with email&quot; you agree to our{" "}
          <span className="underline hover:text-black cursor-pointer">Terms of Use</span> and{" "}
          <span className="underline hover:text-black cursor-pointer">Privacy policy</span>.
        </p>

      </div>

      {/* Styled Footer exact clone from the image */}
      <footer className="w-full bg-[#111111] text-gray-400 py-6 px-8 sm:px-12 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs select-none mt-auto shrink-0 border-t border-gray-900">
        <div className="flex items-center gap-2 text-white">
          <ArcadiaLogoIcon className="w-5 h-5 text-white" />
          <span className="font-display font-semibold tracking-tight">arcadia.</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gray-500">
          <span>curated by</span>
          <span className="font-semibold text-white tracking-tight">ARCADIA</span>
        </div>
      </footer>
    </div>
  );
}
