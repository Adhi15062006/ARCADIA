import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import AnimatedButton from "./ui/animated-button";
import { 
  User, 
  Mail, 
  Lock, 
  Globe, 
  Github, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Info, 
  X, 
  ShieldCheck, 
  Compass,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

interface LoginPortalProps {
  lang: "en" | "hi";
  initialTab?: "client" | "admin";
  onShowToast: (type: "success" | "info" | "error", msg: string) => void;
  onClientLoginSuccess: (name: string, email: string, token: string, avatar: string) => void;
  onAdminLoginSuccess: (token: string, email: string) => void;
  onClose?: () => void;
}

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

  // OAuth Guide modal state
  const [showOAuthGuide, setShowOAuthGuide] = useState(false);
  const [guideProvider, setGuideProvider] = useState<"Google" | "GitHub">("Google");

  // Simulated Social OAuth states
  const [socialPromptProvider, setSocialPromptProvider] = useState<"google" | "github" | null>(null);
  const [socialName, setSocialName] = useState("Aura Client");
  const [socialEmail, setSocialEmail] = useState("godesportsfreefire@gmail.com");

  // Client Forgot Password states
  const [isClientForgot, setIsClientForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "verify">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotCodeReceived, setForgotCodeReceived] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientAuthError("");
    setIsForgotLoading(true);
    try {
      const res = await fetch("/api/auth/client-forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setForgotStep("verify");
        setForgotCodeReceived(data.code || "");
        onShowToast("success", "Verification code generated! Copy it below to reset.");
      } else {
        setClientAuthError(data.error || "Failed to process reset request.");
      }
    } catch (err) {
      setClientAuthError("Connection to security service failed.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientAuthError("");
    setIsForgotLoading(true);
    try {
      const res = await fetch("/api/auth/client-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          code: forgotCode,
          newPassword: forgotNewPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast("success", "Password updated! You can now log in.");
        setIsClientForgot(false);
        setForgotStep("email");
        setForgotCode("");
        setForgotNewPassword("");
        setForgotCodeReceived("");
        setClientEmail(forgotEmail);
      } else {
        setClientAuthError(data.error || "Reset validation failed.");
      }
    } catch (err) {
      setClientAuthError("Connection to security service failed.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Email validation helper
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
        onAdminLoginSuccess(data.token, data.email);
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

  // Popup-based Social Authentication
  const handleSocialAuth = (provider: "google" | "github") => {
    setSocialPromptProvider(provider);
  };

  // Sandbox login
  const handleSandboxLogin = (emailPreset: string, namePreset: string) => {
    setIsClientLoading(true);
    setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/social-sandbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailPreset, name: namePreset })
        });
        const data = await res.json();
        if (res.ok) {
          onClientLoginSuccess(
            data.user.name,
            data.user.email,
            data.token,
            data.user.avatar || ""
          );
          onShowToast("success", `Sandbox access approved for ${namePreset}!`);
        }
      } catch (err) {
        onShowToast("error", "Sandbox gateway connection failed.");
      } finally {
        setIsClientLoading(false);
      }
    }, 400);
  };

  return (
    <div id="unified-login-portal" className="w-full min-h-[85vh] py-12 flex items-center justify-center relative z-10">
      <div className="w-full max-w-md mx-auto px-4 relative group">
        
        {/* Ambient background glow matching our cyber style */}
        <div className="absolute inset-0 bg-gradient-to-tr from-arcadia-blue/10 via-purple-500/5 to-arcadia-cyan/15 rounded-[32px] blur-3xl opacity-80 pointer-events-none transition-all duration-700 group-hover:opacity-100" />
        
        <div className="relative rounded-[32px] p-8 bg-arcadia-dark/95 border border-white/10 shadow-2xl backdrop-blur-xl">
          
          {/* Header tabs select sector */}
          <div className="flex p-1.5 bg-black/40 border border-white/5 rounded-2xl mb-8">
            <AnimatedButton
              onClick={() => setActiveTab("client")}
              className={`flex-1 py-2.5 rounded-xl font-display text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                activeTab === "client" 
                  ? "bg-white/10 text-white border border-white/10 shadow" 
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Client Login
            </AnimatedButton>
            <AnimatedButton
              onClick={() => setActiveTab("admin")}
              className={`flex-1 py-2.5 rounded-xl font-display text-xs font-bold tracking-wider uppercase transition-all duration-200 cursor-pointer ${
                activeTab === "admin" 
                  ? "bg-white/10 text-white border border-white/10 shadow" 
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Admin Access
            </AnimatedButton>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "client" ? (
              isClientForgot ? (
                /* ================= CLIENT FORGOT PASSWORD ================= */
                <motion.div
                  key="client-forgot-section"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <AnimatedButton
                      type="button"
                      onClick={() => {
                        setIsClientForgot(false);
                        setForgotStep("email");
                        setForgotCode("");
                        setForgotNewPassword("");
                        setForgotCodeReceived("");
                      }}
                      className="inline-flex items-center gap-1.5 text-[10px] font-mono text-gray-500 hover:text-white mb-3 cursor-pointer uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back to Login
                    </AnimatedButton>
                    <h3 className="font-display font-black text-xl text-white tracking-tight uppercase">
                      Reset Password
                    </h3>
                    <p className="font-sans text-[11px] text-gray-500 mt-2 leading-relaxed">
                      {forgotStep === "email" 
                        ? "Enter your client business email address to generate a sandbox security reset ticket code."
                        : "Verify your sandbox security code and specify your new corporate security key pass."}
                    </p>
                  </div>

                  {clientAuthError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[10px] text-center">
                      ⚠️ {clientAuthError}
                    </div>
                  )}

                  {forgotStep === "email" ? (
                    <form onSubmit={handleForgotRequest} className="space-y-4">
                      <div>
                        <label className="block text-[8px] uppercase font-mono text-gray-400 mb-1 font-bold tracking-wider">
                          Business Email
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            required
                            placeholder="client@corporate.com"
                            value={forgotEmail}
                            onChange={e => setForgotEmail(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-cyan focus:ring-1 focus:ring-arcadia-cyan/30 transition-all font-sans"
                          />
                          <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                        </div>
                      </div>

                      <AnimatedButton
                        type="submit"
                        disabled={isForgotLoading}
                        className="w-full py-3 rounded-xl bg-arcadia-blue hover:bg-blue-600 text-white font-display text-[10px] font-bold tracking-wider uppercase transition duration-300 disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(47,128,255,0.2)] flex items-center justify-center gap-2"
                      >
                        {isForgotLoading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Requesting...</span>
                          </>
                        ) : (
                          <span>Generate Reset Code</span>
                        )}
                      </AnimatedButton>
                    </form>
                  ) : (
                    <form onSubmit={handleResetSubmit} className="space-y-4">
                      {forgotCodeReceived && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1.5 text-left">
                          <span className="block text-[8px] font-mono text-amber-500 uppercase tracking-widest font-bold">Sandbox Dispatch Simulator</span>
                          <p className="text-[10px] font-sans">
                            Since you are in developer sandbox mode, we have securely outputted your reset code below:
                          </p>
                          <div className="flex items-center justify-between pt-1 font-mono text-xs font-bold text-white bg-black/40 p-2 rounded-lg border border-amber-500/10">
                            <span>Verification Code:</span>
                            <span className="text-amber-400 select-all font-black tracking-widest">{forgotCodeReceived}</span>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-[8px] uppercase font-mono text-gray-400 mb-1 font-bold tracking-wider">
                          6-Digit Verification Code
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            maxLength={6}
                            placeholder="e.g. 582194"
                            value={forgotCode}
                            onChange={e => setForgotCode(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-cyan focus:ring-1 focus:ring-arcadia-cyan/30 transition-all font-sans"
                          />
                          <ShieldCheck className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[8px] uppercase font-mono text-gray-400 mb-1 font-bold tracking-wider">
                          New Secret Key Pass (Password)
                        </label>
                        <div className="relative">
                          <input
                            type={showClientPassword ? "text" : "password"}
                            required
                            placeholder="Min. 8 characters"
                            value={forgotNewPassword}
                            onChange={e => setForgotNewPassword(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-cyan focus:ring-1 focus:ring-arcadia-cyan/30 transition-all font-sans"
                          />
                          <AnimatedButton
                            type="button"
                            onClick={() => setShowClientPassword(!showClientPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition focus:outline-none cursor-pointer"
                          >
                            {showClientPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </AnimatedButton>
                        </div>
                      </div>

                      <AnimatedButton
                        type="submit"
                        disabled={isForgotLoading}
                        className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-display text-[10px] font-bold tracking-wider uppercase transition duration-300 disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(34,197,94,0.2)] flex items-center justify-center gap-2"
                      >
                        {isForgotLoading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <span>Update Security Key Pass</span>
                        )}
                      </AnimatedButton>
                    </form>
                  )}
                </motion.div>
              ) : (
                /* ================= CLIENT FLOW ================= */
                <motion.div
                  key="client-section"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h3 className="font-display font-black text-xl text-white tracking-tight uppercase">
                      {isClientSignUp ? "Establish Portal Account" : "Access Co-Dev Hub"}
                    </h3>
                    <p className="font-sans text-[11px] text-gray-500 mt-2 leading-relaxed">
                      {isClientSignUp 
                        ? "Create a dedicated digital workspace to co-author custom system code, track orders, and download receipts."
                        : "Login to verify milestones, request payment details, download company-signed invoices, and track logs."}
                    </p>
                  </div>

                  {clientAuthError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[10px] text-center">
                      ⚠️ {clientAuthError}
                    </div>
                  )}

                  {/* Social Login Federation */}
                  {!isClientSignUp && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <AnimatedButton
                          type="button"
                          onClick={() => handleSocialAuth("google")}
                          className="py-2.5 px-3 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 font-display text-[10px] font-semibold flex items-center justify-center gap-1.5 transition duration-200 cursor-pointer"
                        >
                          <Globe className="w-3.5 h-3.5 text-blue-400" />
                          <span>Google</span>
                        </AnimatedButton>
                        <AnimatedButton
                          type="button"
                          onClick={() => handleSocialAuth("github")}
                          className="py-2.5 px-3 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 font-display text-[10px] font-semibold flex items-center justify-center gap-1.5 transition duration-200 cursor-pointer"
                        >
                          <Github className="w-3.5 h-3.5 text-purple-400" />
                          <span>GitHub</span>
                        </AnimatedButton>
                      </div>

                      <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-white/5" />
                        <span className="flex-shrink mx-3 font-mono text-[8px] text-gray-600 uppercase tracking-widest">
                          or credentials
                        </span>
                        <div className="flex-grow border-t border-white/5" />
                      </div>
                    </>
                  )}

                  {/* Email Form */}
                  <form onSubmit={handleClientAuth} className="space-y-4">
                    {isClientSignUp && (
                      <div>
                        <label className="block text-[8px] uppercase font-mono text-gray-400 mb-1 font-bold tracking-wider">
                          Client Corporate Name
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="e.g. Vikram Malhotra"
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-cyan focus:ring-1 focus:ring-arcadia-cyan/30 transition-all font-sans"
                          />
                          <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[8px] uppercase font-mono text-gray-400 mb-1 font-bold tracking-wider">
                        Business Email
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          placeholder="client@corporate.com"
                          value={clientEmail}
                          onChange={e => setClientEmail(e.target.value)}
                          className="w-full pl-4 pr-10 py-2.5 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-cyan focus:ring-1 focus:ring-arcadia-cyan/30 transition-all font-sans"
                        />
                        <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[8px] uppercase font-mono text-gray-400 font-bold tracking-wider">
                          Secret Key Pass
                        </label>
                        {!isClientSignUp && (
                          <AnimatedButton
                            type="button"
                            onClick={() => {
                              setIsClientForgot(true);
                              setForgotEmail(clientEmail);
                              setForgotStep("email");
                              setForgotCodeReceived("");
                              setForgotCode("");
                              setForgotNewPassword("");
                              setClientAuthError("");
                            }}
                            className="text-[9px] font-sans text-arcadia-cyan hover:underline hover:text-cyan-300 cursor-pointer"
                          >
                            Forgot Password?
                          </AnimatedButton>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showClientPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={clientPassword}
                          onChange={e => setClientPassword(e.target.value)}
                          className="w-full pl-4 pr-10 py-2.5 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-cyan focus:ring-1 focus:ring-arcadia-cyan/30 transition-all font-sans"
                        />
                        <AnimatedButton
                          type="button"
                          onClick={() => setShowClientPassword(!showClientPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition focus:outline-none cursor-pointer"
                        >
                          {showClientPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </AnimatedButton>
                      </div>
                    </div>

                    <AnimatedButton
                      type="submit"
                      disabled={isClientLoading}
                      className="w-full py-3 rounded-xl bg-arcadia-blue hover:bg-blue-600 text-white font-display text-[10px] font-bold tracking-wider uppercase transition duration-300 disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(47,128,255,0.2)] flex items-center justify-center gap-2"
                    >
                      {isClientLoading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processing Session...</span>
                        </>
                      ) : (
                        <span>{isClientSignUp ? "Create Workspace account" : "Initialize Secure Client Session"}</span>
                      )}
                    </AnimatedButton>
                  </form>

                  {/* Toggle Client signin/signup */}
                  <div className="text-center text-[11px] text-gray-500">
                    {isClientSignUp ? (
                      <span>
                        Already configured?{" "}
                        <AnimatedButton onClick={() => setIsClientSignUp(false)} className="text-arcadia-cyan font-bold hover:underline cursor-pointer">
                          Sign In Here
                        </AnimatedButton>
                      </span>
                    ) : (
                      <span>
                        New corporate client?{" "}
                        <AnimatedButton onClick={() => setIsClientSignUp(true)} className="text-arcadia-cyan font-bold hover:underline cursor-pointer">
                          Register Corporate Account
                        </AnimatedButton>
                      </span>
                    )}
                  </div>

                  {/* FAST SANDBOX ACCREDITED LOGIN */}
                  <div className="pt-4 border-t border-white/5 text-center">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Info className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      <span className="text-[8px] font-mono text-amber-400 uppercase tracking-widest font-bold">
                        Corporate Sandbox Presets
                      </span>
                    </div>
                    <p className="text-[9px] text-gray-500 mb-3 leading-relaxed">
                      Simulate instant logins with predefined test client dossiers below. No register setup required.
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      <AnimatedButton
                        type="button"
                        onClick={() => handleSandboxLogin("vikram@zenix.com", "Vikram Malhotra")}
                        className="px-2 py-1.5 bg-white/[0.02] border border-white/5 rounded-lg font-mono text-[8px] text-gray-400 hover:text-white hover:border-arcadia-cyan/40 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>👤 Vikram Malhotra (Zenix)</span>
                        <ArrowRight className="w-2.5 h-2.5 text-arcadia-cyan" />
                      </AnimatedButton>
                      <AnimatedButton
                        type="button"
                        onClick={() => handleSandboxLogin("priyanka@aura.com", "Priyanka Sen")}
                        className="px-2 py-1.5 bg-white/[0.02] border border-white/5 rounded-lg font-mono text-[8px] text-gray-400 hover:text-white hover:border-arcadia-cyan/40 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>👤 Priyanka Sen (Aura)</span>
                        <ArrowRight className="w-2.5 h-2.5 text-arcadia-cyan" />
                      </AnimatedButton>
                    </div>
                  </div>
                </motion.div>
              )
            ) : (
              /* ================= ADMIN FLOW ================= */
              <motion.div
                key="admin-section"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-full w-fit mx-auto mb-3">
                    <Lock className="w-5 h-5 text-red-400 animate-pulse" />
                  </div>
                  <h3 className="font-display font-black text-xl text-white tracking-tight uppercase">
                    Secure Admin Node
                  </h3>
                  <p className="font-sans text-[11px] text-gray-500 mt-2 leading-relaxed">
                    Administrative access protected. Only authenticated system directors are authorized to check inquiries, issue payments, and update project ledgers.
                  </p>
                </div>

                {adminAuthError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[10px] text-center">
                    ⚠️ {adminAuthError}
                  </div>
                )}

                <form onSubmit={handleAdminAuth} className="space-y-4">
                  <div>
                    <label className="block text-[8px] uppercase font-mono text-gray-400 mb-1 font-bold tracking-wider">
                      Protocol Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="arcadia"
                        value={adminEmail}
                        onChange={e => setAdminEmail(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-cyan focus:ring-1 focus:ring-arcadia-cyan/30 transition-all font-mono"
                      />
                      <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] uppercase font-mono text-gray-400 mb-1 font-bold tracking-wider">
                      Secret Code Passphrase
                    </label>
                    <div className="relative">
                      <input
                        type={showAdminPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-cyan focus:ring-1 focus:ring-arcadia-cyan/30 transition-all font-mono"
                      />
                      <AnimatedButton
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition focus:outline-none cursor-pointer"
                      >
                        {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </AnimatedButton>
                    </div>
                  </div>

                  <AnimatedButton
                    type="submit"
                    disabled={isAdminLoading}
                    className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-display text-[10px] font-bold tracking-wider uppercase transition duration-300 disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.2)] flex items-center justify-center gap-2"
                  >
                    {isAdminLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Validating Cryptography...</span>
                      </>
                    ) : (
                      <span>Settle Admin Authorization</span>
                    )}
                  </AnimatedButton>
                </form>


              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Branded Social OAuth Simulator Modal */}
      <AnimatePresence>
        {socialPromptProvider && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[130] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className={`w-full max-w-md rounded-3xl p-6 relative space-y-6 border ${
                socialPromptProvider === "google" 
                  ? "bg-[#1A1A1A] border-blue-500/20 shadow-[0_0_40px_rgba(59,130,246,0.15)]" 
                  : "bg-[#0D1117] border-purple-500/20 shadow-[0_0_40px_rgba(147,51,234,0.15)]"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${
                    socialPromptProvider === "google" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"
                  }`}>
                    {socialPromptProvider === "google" ? <Globe className="w-5 h-5" /> : <Github className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-display font-black text-xs text-white uppercase tracking-wider">
                      {socialPromptProvider === "google" ? "Google" : "GitHub"} Authentication
                    </h3>
                    <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest mt-0.5">Sandboxed Federated OAuth</p>
                  </div>
                </div>
                <AnimatedButton
                  onClick={() => setSocialPromptProvider(null)}
                  className="p-1 rounded-full hover:bg-white/5 text-gray-400 hover:text-white cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </AnimatedButton>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-[10px] text-gray-400 leading-relaxed">
                <span className="text-white font-bold block mb-1">ℹ️ Browser Sandbox Bridge active</span>
                Due to standard iframe sandboxing restrictions in the workspace development panel, live social auth windows are securely simulated. Please enter your email and profile name below to initiate your secure corporate client dossier instantly.
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[8px] uppercase font-mono text-gray-500 mb-1.5 font-bold tracking-wider">Profile Username / Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={socialName}
                      onChange={e => setSocialName(e.target.value)}
                      placeholder="e.g. Priyesh Patel"
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] uppercase font-mono text-gray-500 mb-1.5 font-bold tracking-wider">Federated Account Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={socialEmail}
                      onChange={e => setSocialEmail(e.target.value)}
                      placeholder="e.g. user@gmail.com"
                      className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>

                <AnimatedButton
                  onClick={() => {
                    handleSandboxLogin(socialEmail, socialName);
                    setSocialPromptProvider(null);
                  }}
                  className={`w-full py-3 rounded-xl font-display text-[10px] font-bold uppercase tracking-wider transition duration-300 cursor-pointer flex items-center justify-center gap-2 ${
                    socialPromptProvider === "google"
                      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.25)]"
                      : "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_4px_12px_rgba(147,51,234,0.25)]"
                  }`}
                >
                  {socialPromptProvider === "google" ? <Globe className="w-3.5 h-3.5" /> : <Github className="w-3.5 h-3.5" />}
                  <span>Sign In with {socialPromptProvider === "google" ? "Google Sandbox" : "GitHub Sandbox"}</span>
                </AnimatedButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Social login popup OAuth configuration guide */}
      <AnimatePresence>
        {showOAuthGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-arcadia-dark border border-white/10 rounded-3xl p-6 max-w-md w-full relative space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-arcadia-cyan shrink-0 animate-pulse" />
                  <h3 className="font-display font-black text-sm text-white uppercase">{guideProvider} Sandbox Config Needed</h3>
                </div>
                <AnimatedButton
                  onClick={() => setShowOAuthGuide(false)}
                  className="p-1 rounded-full hover:bg-white/5 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </AnimatedButton>
              </div>

              <p className="font-sans text-[11px] text-gray-400 leading-relaxed">
                To link live production social authorization profiles on {guideProvider}, you must provision official client keys using AI Studio settings.
              </p>

              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl font-mono text-[9px] text-gray-400 space-y-1.5">
                <div className="text-amber-400 uppercase tracking-widest font-bold border-b border-white/5 pb-1 text-[8px]">
                  Environment Variables Setup:
                </div>
                <div>{guideProvider === "Google" ? "GOOGLE_CLIENT_ID" : "GITHUB_CLIENT_ID"}=...</div>
                <div>{guideProvider === "Google" ? "GOOGLE_CLIENT_SECRET" : "GITHUB_CLIENT_SECRET"}=...</div>
              </div>

              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 text-[10px] text-gray-400 leading-relaxed">
                <span className="text-white font-bold block mb-0.5">💡 Interactive Fast Bypass Sandbox available!</span>
                You don't need to configure anything. Click the 'Bypass & Simulate' button below to instantly trigger an active authenticated sandbox token.
              </div>

              <div className="flex gap-3 pt-2">
                <AnimatedButton
                  onClick={() => {
                    setShowOAuthGuide(false);
                    if (guideProvider === "Google") {
                      handleSandboxLogin("vikram@zenix.com", "Vikram Malhotra");
                    } else {
                      handleSandboxLogin("priyanka@aura.com", "Priyanka Sen");
                    }
                  }}
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-display text-[10px] font-bold uppercase transition cursor-pointer text-center"
                >
                  Bypass & Sandbox Simulate
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => setShowOAuthGuide(false)}
                  className="flex-1 py-2 rounded-xl border border-white/10 hover:border-white/20 text-gray-300 font-display text-[10px] font-bold uppercase transition cursor-pointer text-center"
                >
                  I Understand
                </AnimatedButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
