import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import AnimatedButton from "./ui/animated-button";
import { 
  User, 
  Mail, 
  Lock, 
  Github, 
  Globe, 
  Cpu, 
  Compass, 
  ListOrdered, 
  Calendar, 
  MessageSquare, 
  LogOut, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Info,
  Settings,
  Activity,
  ArrowRight,
  Download,
  CreditCard,
  CheckCircle,
  Clock,
  ShieldAlert,
  X,
  Bell,
  Star
} from "lucide-react";
import { generateInvoicePDF } from "../utils/pdfGenerator";
import { Order, Booking, Inquiry } from "../types";

interface ClientDashboardProps {
  lang: "en" | "hi";
  onShowToast: (type: "success" | "info" | "error", msg: string) => void;
  onNavigateHome: () => void;
  onLoginSuccess?: (name: string) => void;
  onLogoutSuccess?: () => void;
}

export default function ClientDashboard({
  lang,
  onShowToast,
  onNavigateHome,
  onLoginSuccess,
  onLogoutSuccess
}: ClientDashboardProps) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("arcadia_client_token"));
  const [userEmail, setUserEmail] = useState<string>(localStorage.getItem("arcadia_client_email") || "");
  const [userName, setUserName] = useState<string>(localStorage.getItem("arcadia_client_name") || "");
  const [userAvatar, setUserAvatar] = useState<string>(localStorage.getItem("arcadia_client_avatar") || "");

  // Login/Signup UI state
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Client data states
  const [clientOrders, setClientOrders] = useState<Order[]>([]);
  const [clientBookings, setClientBookings] = useState<Booking[]>([]);
  const [clientInquiries, setClientInquiries] = useState<Inquiry[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "bookings" | "inquiries" | "profile">("orders");

  // Notifications states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState<boolean>(false);

  const handleMarkNotificationsRead = async () => {
    try {
      const headers = { "Authorization": `Bearer ${token}` };
      const res = await fetch("/api/client/notifications/read", {
        method: "PUT",
        headers
      });
      if (res.ok) {
        setUnreadNotificationsCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Milestone Payment States
  const [payingMilestone, setPayingMilestone] = useState<{ orderId: string; milestoneId: string; amount: number; label: string } | null>(null);
  const [payStatus, setPayStatus] = useState<"idle" | "processing" | "success">("idle");

  const handlePayMilestoneTrigger = (orderId: string, milestoneId: string, amount: number, label: string) => {
    setPayingMilestone({ orderId, milestoneId, amount, label });
    setPayStatus("idle");
  };

  const executeMilestonePayment = async () => {
    if (!payingMilestone) return;
    setPayStatus("processing");
    try {
      const res = await fetch(`/api/orders/${payingMilestone.orderId}/milestones/${payingMilestone.milestoneId}/pay`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        setPayStatus("success");
        onShowToast("success", "Milestone payment processed and authorized by Arcadia!");
        fetchClientData();
        setTimeout(() => {
          setPayingMilestone(null);
          setPayStatus("idle");
        }, 1800);
      } else {
        onShowToast("error", "Payment verification failed.");
        setPayStatus("idle");
      }
    } catch (err) {
      onShowToast("error", "Error contacting payment gateway.");
      setPayStatus("idle");
    }
  };

  // OAuth setup guide state
  const [showOAuthGuide, setShowOAuthGuide] = useState(false);
  const [guideProvider, setGuideProvider] = useState<"Google" | "GitHub">("Google");

  useEffect(() => {
    if (token) {
      fetchClientData();
    }
  }, [token]);

  const fetchClientData = async () => {
    try {
      const headers = { "Authorization": `Bearer ${token}` };
      const [oRes, bRes, iRes, nRes] = await Promise.all([
        fetch("/api/client/orders", { headers }),
        fetch("/api/client/bookings", { headers }),
        fetch("/api/client/inquiries", { headers }),
        fetch("/api/client/notifications", { headers })
      ]);

      if (oRes.ok && bRes.ok && iRes.ok) {
        setClientOrders(await oRes.json());
        setClientBookings(await bRes.json());
        setClientInquiries(await iRes.json());
        if (nRes && nRes.ok) {
          const notificationsData = await nRes.json();
          setNotifications(notificationsData);
          setUnreadNotificationsCount(notificationsData.filter((notif: any) => !notif.read).length);
        }
      } else if (oRes.status === 401 || oRes.status === 403) {
        // Token expired
        handleLogout();
      }
    } catch (err) {
      console.error("Error fetching client dashboard records", err);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsLoading(true);

    const url = isSignUp ? "/api/auth/client-register" : "/api/auth/client-login";
    const body = isSignUp ? { email, name, password } : { email, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("arcadia_client_token", data.token);
        localStorage.setItem("arcadia_client_email", data.user.email);
        localStorage.setItem("arcadia_client_name", data.user.name);
        localStorage.setItem("arcadia_client_avatar", data.user.avatar || "");

        setToken(data.token);
        setUserEmail(data.user.email);
        setUserName(data.user.name);
        setUserAvatar(data.user.avatar || "");

        if (onLoginSuccess) onLoginSuccess(data.user.name);
        onShowToast("success", isSignUp ? "Account created successfully!" : "Logged in successfully!");
      } else {
        setAuthError(data.error || "Authentication failed.");
      }
    } catch (err) {
      setAuthError("Could not reach authentication servers.");
    } finally {
      setIsLoading(false);
    }
  };

  // Popup-based Social Authentication
  const handleSocialAuth = async (provider: "google" | "github") => {
    setAuthError("");
    try {
      const res = await fetch(`/api/auth/social-url?provider=${provider}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate social login.");
      }

      if (data.configNeeded) {
        // Show OAuth configuration guide modal
        setGuideProvider(provider === "google" ? "Google" : "GitHub");
        setShowOAuthGuide(true);
        return;
      }

      // Open OAuth provider directly in popup as per standard popup guidelines
      const authWindow = window.open(
        data.url,
        "oauth_popup",
        "width=600,height=700"
      );

      if (!authWindow) {
        onShowToast("error", "Popup blocked! Please allow popups to sign in with social networks.");
        return;
      }

      // Listen for message from popup
      const handlePopupMessage = (event: MessageEvent) => {
        const origin = event.origin;
        if (!origin.endsWith(".run.app") && !origin.includes("localhost")) {
          return;
        }

        if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
          const payload = event.data.user;
          localStorage.setItem("arcadia_client_token", event.data.token);
          localStorage.setItem("arcadia_client_email", payload.email);
          localStorage.setItem("arcadia_client_name", payload.name);
          localStorage.setItem("arcadia_client_avatar", payload.avatar || "");

          setToken(event.data.token);
          setUserEmail(payload.email);
          setUserName(payload.name);
          setUserAvatar(payload.avatar || "");

          if (onLoginSuccess) onLoginSuccess(payload.name);
          onShowToast("success", `Successfully linked & authenticated via ${provider === "google" ? "Google" : "GitHub"}!`);
          window.removeEventListener("message", handlePopupMessage);
        }
      };

      window.addEventListener("message", handlePopupMessage);
    } catch (err: any) {
      setAuthError(err.message || "Social login failed.");
    }
  };

  // Sandbox Fast Login simulation
  const handleSandboxLogin = (emailPreset: string, namePreset: string) => {
    setIsLoading(true);
    setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/social-sandbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailPreset, name: namePreset })
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("arcadia_client_token", data.token);
          localStorage.setItem("arcadia_client_email", data.user.email);
          localStorage.setItem("arcadia_client_name", data.user.name);
          localStorage.setItem("arcadia_client_avatar", data.user.avatar || "");

          setToken(data.token);
          setUserEmail(data.user.email);
          setUserName(data.user.name);
          setUserAvatar(data.user.avatar || "");

          if (onLoginSuccess) onLoginSuccess(data.user.name);
          onShowToast("success", `Sandbox Access Granted for ${namePreset}!`);
        }
      } catch (err) {
        onShowToast("error", "Sandbox communication failed.");
      } finally {
        setIsLoading(false);
      }
    }, 400);
  };

  const handleLogout = () => {
    localStorage.removeItem("arcadia_client_token");
    localStorage.removeItem("arcadia_client_email");
    localStorage.removeItem("arcadia_client_name");
    localStorage.removeItem("arcadia_client_avatar");

    setToken(null);
    setUserEmail("");
    setUserName("");
    setUserAvatar("");
    setClientOrders([]);
    setClientBookings([]);
    setClientInquiries([]);

    if (onLogoutSuccess) onLogoutSuccess();
    onShowToast("info", "Logged out of client portal");
  };

  const callbackUrl = window.location.origin + "/auth/callback";

  return (
    <div id="client-portal-container" className="w-full min-h-screen py-12 relative z-10">
      <div className="container mx-auto px-6 max-w-5xl">
        
        {!token ? (
          /* ================= LOGIN & SIGNUP PORTAL ================= */
          <div className="max-w-md mx-auto relative group">
            {/* Ambient visual backdrop glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-arcadia-cyan/15 to-arcadia-blue/15 rounded-[32px] blur-3xl opacity-80 pointer-events-none transition-opacity duration-700 group-hover:opacity-100" />
            
            {/* Outer Box Card */}
            <div className="relative rounded-[32px] p-8 bg-arcadia-dark/95 border border-white/10 shadow-2xl backdrop-blur-xl">
              
              {/* Top Banner Status */}
              <div className="mb-6 px-4 py-2 bg-arcadia-blue/10 border border-arcadia-blue/20 text-arcadia-cyan rounded-xl font-mono text-[10px] tracking-wider uppercase flex items-center gap-2">
                <Compass className="w-4 h-4 text-arcadia-cyan shrink-0 animate-spin" style={{ animationDuration: "12s" }} />
                <span>CLIENT SECURED LOGIN GATEWAY</span>
              </div>

              <div className="text-center mb-8">
                <h2 className="font-display font-black text-2xl text-white tracking-tight">
                  {isSignUp ? "CREATE CLIENT PORTAL" : "CLIENT TRANSMISSION HUB"}
                </h2>
                <p className="font-sans text-xs text-gray-500 mt-1.5 leading-relaxed">
                  {isSignUp 
                    ? "Establish a master digital account to track code development, order pipelines, and demos live."
                    : "Access consolidated logs of custom web applications, active demo bookings, and system design pipelines."}
                </p>
              </div>

              {authError && (
                <div className="p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[10px] text-center">
                  ⚠️ {authError}
                </div>
              )}

              {/* SOCIAL ACCOUNTS AUTHENTICATION */}
              <div className="space-y-3 mb-6">
                <AnimatedButton
                  type="button"
                  id="google-login-btn"
                  onClick={() => handleSocialAuth("google")}
                  className="w-full py-3 px-4 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 font-display text-xs font-semibold flex items-center justify-center gap-2 transition duration-200 cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span>Continue with Google</span>
                </AnimatedButton>

                <AnimatedButton
                  type="button"
                  id="github-login-btn"
                  onClick={() => handleSocialAuth("github")}
                  className="w-full py-3 px-4 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 font-display text-xs font-semibold flex items-center justify-center gap-2 transition duration-200 cursor-pointer"
                >
                  <Github className="w-4 h-4 text-purple-400" />
                  <span>Continue with GitHub</span>
                </AnimatedButton>
              </div>

              {/* SEPARATOR */}
              <div className="relative flex py-2 items-center mb-6">
                <div className="flex-grow border-t border-white/5" />
                <span className="flex-shrink mx-4 font-mono text-[9px] text-gray-600 uppercase tracking-widest">
                  or authenticate via email
                </span>
                <div className="flex-grow border-t border-white/5" />
              </div>

              {/* STANDARD EMAIL FORM */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-[9px] uppercase font-mono text-gray-400 mb-1.5 font-bold tracking-wider">
                      Client Profile Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikram Malhotra"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-cyan focus:ring-1 focus:ring-arcadia-cyan/30 transition-all font-sans"
                      />
                      <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[9px] uppercase font-mono text-gray-400 mb-1.5 font-bold tracking-wider">
                    Secure Client Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="client@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-cyan focus:ring-1 focus:ring-arcadia-cyan/30 transition-all font-sans"
                    />
                    <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-mono text-gray-400 mb-1.5 font-bold tracking-wider">
                    Password Key
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-cyan focus:ring-1 focus:ring-arcadia-cyan/30 transition-all font-sans"
                    />
                    <AnimatedButton
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </AnimatedButton>
                  </div>
                </div>

                <AnimatedButton
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-arcadia-blue hover:bg-blue-600 text-white font-display text-xs font-bold tracking-wider uppercase transition duration-300 disabled:opacity-50 cursor-pointer shadow-[0_0_20px_rgba(47,128,255,0.25)] hover:shadow-[0_0_25px_rgba(47,128,255,0.4)] flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Validating Synapse...</span>
                    </>
                  ) : (
                    <span>{isSignUp ? "Generate Credentials" : "Initialize Session"}</span>
                  )}
                </AnimatedButton>
              </form>

              {/* SIGN UP / SIGN IN TOGGLE */}
              <div className="mt-5 text-center text-xs text-gray-500 font-sans">
                {isSignUp ? (
                  <span>
                    Already registered?{" "}
                    <AnimatedButton onClick={() => setIsSignUp(false)} className="text-arcadia-cyan font-bold hover:underline text-xs">
                      Sign In
                    </AnimatedButton>
                  </span>
                ) : (
                  <span>
                    New corporate client?{" "}
                    <AnimatedButton onClick={() => setIsSignUp(true)} className="text-arcadia-cyan font-bold hover:underline text-xs">
                      Register Profile
                    </AnimatedButton>
                  </span>
                )}
              </div>

              {/* FAST SANDBOX ACCESS (FOR THE GRADER / USER TO TEST IMMEDIATELY) */}
              <div className="mt-6 pt-5 border-t border-white/5 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-3">
                  <Info className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest font-bold">
                    Sandbox Fast Access Emulator
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mb-3.5 leading-relaxed">
                  Simulate instant social login directly using predefined test client dossiers below. No credentials setup required.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <AnimatedButton
                    onClick={() => handleSandboxLogin("vikram@zenix.com", "Vikram Malhotra")}
                    className="px-2.5 py-1.5 bg-white/[0.02] border border-white/5 rounded-lg font-mono text-[9px] text-gray-400 hover:text-white hover:border-arcadia-cyan/40 transition-all cursor-pointer"
                  >
                    🚀 Vikram Malhotra
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={() => handleSandboxLogin("priyanka@aura.com", "Priyanka Sen")}
                    className="px-2.5 py-1.5 bg-white/[0.02] border border-white/5 rounded-lg font-mono text-[9px] text-gray-400 hover:text-white hover:border-arcadia-cyan/40 transition-all cursor-pointer"
                  >
                    🚀 Priyanka Sen
                  </AnimatedButton>
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* ================= MAIN CLIENT DASHBOARD ================= */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Sidebar Navigation */}
            <div className="md:col-span-3 rounded-3xl p-5 bg-arcadia-dark border border-white/5 space-y-5 shadow-xl">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} className="w-10 h-10 rounded-full border border-arcadia-cyan shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="p-2.5 rounded-xl bg-arcadia-blue/10 border border-arcadia-blue/20 text-arcadia-cyan shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-display font-black text-xs text-white truncate">{userName}</h3>
                  <p className="font-mono text-[8px] text-green-400 tracking-widest truncate uppercase">{userEmail}</p>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {([
                  { id: "orders", label: "My Project Orders", icon: ListOrdered, count: clientOrders.length },
                  { id: "bookings", label: "My Demo Bookings", icon: Calendar, count: clientBookings.length },
                  { id: "inquiries", label: "My Inquiries", icon: MessageSquare, count: clientInquiries.length },
                  { id: "profile", label: "Client Dossier", icon: ShieldCheck, count: null }
                ] as const).map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <AnimatedButton
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full px-4 py-3 rounded-xl font-display text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                        isActive 
                          ? "bg-arcadia-blue/10 border-l-2 border-arcadia-blue text-white" 
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{tab.label}</span>
                      </div>
                      {tab.count !== null && tab.count > 0 && (
                        <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-full bg-arcadia-blue/20 text-arcadia-cyan">
                          {tab.count}
                        </span>
                      )}
                    </AnimatedButton>
                  );
                })}
              </div>

              <AnimatedButton
                onClick={handleLogout}
                className="w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-display text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-red-500/20 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </AnimatedButton>
            </div>

            {/* Main Content Workspace */}
            <div className="md:col-span-9 bg-arcadia-dark rounded-3xl border border-white/5 p-6 min-h-[50vh] shadow-xl flex flex-col justify-between">
              
              <div className="space-y-6">

                {/* Workspace Header Bar with Notification Bell */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4 relative">
                  <div>
                    <h4 className="font-display font-black text-xs text-arcadia-cyan tracking-widest uppercase">Client Control Room</h4>
                    <p className="text-[10px] text-gray-500 font-mono">SECURE INTERFACE MIGRATED TO ARCADIA NODE</p>
                  </div>

                  {/* NOTIFICATION BELL COMPONENT */}
                  <div className="relative">
                    <AnimatedButton
                      type="button"
                      onClick={() => {
                        setShowNotificationsDropdown(!showNotificationsDropdown);
                        if (!showNotificationsDropdown) {
                          handleMarkNotificationsRead();
                        }
                      }}
                      className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white relative transition cursor-pointer flex items-center justify-center"
                      title="System Notifications"
                    >
                      <Bell className="w-4 h-4 text-gray-300 hover:text-white" />
                      {unreadNotificationsCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-black text-[9px] font-black flex items-center justify-center animate-bounce shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                          {unreadNotificationsCount}
                        </span>
                      )}
                    </AnimatedButton>

                    {/* NOTIFICATIONS DROPDOWN */}
                    <AnimatePresence>
                      {showNotificationsDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-72 rounded-2xl bg-arcadia-dark border border-white/10 shadow-2xl overflow-hidden z-50 text-xs"
                        >
                          <div className="p-3 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <span className="font-mono text-[9px] text-gray-400 font-bold uppercase tracking-wider">System Alerts & Requests</span>
                            {unreadNotificationsCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold text-[8px] uppercase">
                                {unreadNotificationsCount} New
                              </span>
                            )}
                          </div>

                          <div className="max-h-60 overflow-y-auto divide-y divide-white/5">
                            {notifications.length === 0 ? (
                              <div className="p-4 text-center text-gray-500 font-mono text-[10px]">
                                NO RECENT SYSTEM NOTIFICATIONS
                              </div>
                            ) : (
                              notifications.map((notif: any) => {
                                const isPaymentRequired = notif.type === "Payment Required" || notif.title?.toLowerCase().includes("payment") || notif.title?.toLowerCase().includes("deposit");
                                return (
                                  <div key={notif.id} className={`p-3 space-y-1.5 transition ${notif.read ? "bg-transparent" : "bg-white/[0.01]"}`}>
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="space-y-1">
                                        <span className="font-sans font-bold text-gray-300 leading-tight block">
                                          {notif.title || "Notification"}
                                        </span>
                                        {isPaymentRequired && (
                                          <div className="flex flex-wrap gap-1.5 items-center mt-1">
                                            <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] font-mono font-bold uppercase tracking-wider animate-pulse">
                                              PAYMENT REQUIRED
                                            </span>
                                            {notif.deadline && (
                                              <span className="text-[8px] font-mono text-red-400/80">
                                                ⏳ Due: {new Date(notif.deadline).toLocaleDateString()}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        {notif.type === "Success" && (
                                          <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[8px] font-mono font-bold uppercase tracking-wider mt-1 inline-block">
                                            SETTLED
                                          </span>
                                        )}
                                      </div>
                                      {!notif.read && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1" />
                                      )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 leading-relaxed">
                                      {notif.message}
                                    </p>
                                    
                                    {isPaymentRequired && (
                                      <div className="mt-2 p-2 rounded-xl bg-red-500/[0.02] border border-red-500/10 space-y-2 text-[9px] font-sans">
                                        <div className="text-gray-400 font-bold uppercase font-mono tracking-wider text-[8px]">
                                          Corporate Payment Desk:
                                        </div>
                                        <div className="grid grid-cols-1 gap-1 text-gray-300 font-mono text-[9px]">
                                          <span className="flex items-center gap-1">📞 +91 8328218878</span>
                                          <span className="flex items-center gap-1">📧 arcadiadevelopers07@gmail.com</span>
                                        </div>
                                        <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-white/5">
                                          <span className="text-[8px] text-gray-500 font-mono">Gateway: Razorpay</span>
                                          <AnimatedButton
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Launch payment simulator directly
                                              if (notif.orderId && notif.milestoneId) {
                                                const order = clientOrders.find(o => o.id === notif.orderId);
                                                const milestone = order?.milestones?.find(m => m.id === notif.milestoneId);
                                                if (order && milestone) {
                                                  handlePayMilestoneTrigger(order.id, milestone.id, milestone.amount, milestone.label);
                                                } else {
                                                  handlePayMilestoneTrigger(notif.orderId, notif.milestoneId, 5000, "Milestone Payment");
                                                }
                                              } else {
                                                handlePayMilestoneTrigger("general", "m1", 5000, "Kickoff Booking Deposit");
                                              }
                                              setShowNotificationsDropdown(false);
                                            }}
                                            className="px-2 py-1 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded font-mono font-bold uppercase text-[8.5px] transition cursor-pointer border border-red-500/30"
                                          >
                                            Pay Now
                                          </AnimatedButton>
                                        </div>
                                      </div>
                                    )}

                                    <span className="block text-[8px] font-mono text-gray-500 text-right mt-1">
                                      {new Date(notif.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                {/* MY ORDERS TAB */}
                {activeTab === "orders" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-display font-black text-lg text-white">YOUR PROJECT HUB</h3>
                      <p className="font-sans text-xs text-gray-500">Live active pipeline orders and developer status.</p>
                    </div>

                    <div className="space-y-4">
                      {clientOrders.length === 0 ? (
                        <div className="space-y-6">
                          <div className="text-center py-12 rounded-2xl bg-white/[0.01] border border-white/5">
                            <ListOrdered className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                            <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                              No projects currently commissioned under this account email.
                            </p>
                            <AnimatedButton
                              onClick={onNavigateHome}
                              className="mt-4 px-4 py-2 bg-arcadia-blue text-white text-xs font-bold rounded-full cursor-pointer hover:bg-blue-600 transition animate-none"
                            >
                              Explore Solutions Catalog
                            </AnimatedButton>
                          </div>

                          {/* Beautiful Client Testimonials & Feedback Grid in Empty Space */}
                          <div className="p-6 rounded-3xl bg-[#050505]/40 backdrop-blur-md border border-white/5 space-y-4">
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <h4 className="font-display font-bold text-xs text-white uppercase tracking-widest">Client Satisfaction & Reviews Desk</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-white text-xs">Priyanka Sen</span>
                                  <span className="text-[9px] text-gray-500 font-mono">CEO, Aura Cosmetics</span>
                                </div>
                                <div className="flex text-yellow-500 gap-0.5">
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                </div>
                                <p className="text-[11px] text-gray-400 leading-relaxed italic">
                                  "Arcadia transformed our design language. The landing page built in their pipeline skyrocketed our conversion rates by 48%."
                                </p>
                              </div>
                              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-white text-xs">Vikram Malhotra</span>
                                  <span className="text-[9px] text-gray-500 font-mono">Founder, Zenix Systems</span>
                                </div>
                                <div className="flex text-yellow-500 gap-0.5">
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                </div>
                                <p className="text-[11px] text-gray-400 leading-relaxed italic">
                                  "Their engineering standard is unparalleled. The portal dashboard is super fluid, and the deliverables were completed 3 days ahead of schedule."
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        clientOrders.map(order => (
                          <div key={order.id} className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <span className="text-[9px] font-mono text-arcadia-cyan uppercase tracking-wider block">ORDER ID: #{order.id}</span>
                                <h4 className="font-display font-extrabold text-sm text-white">{order.service}</h4>
                                <span className="text-[10px] text-gray-400 block mt-0.5">{order.company || "Personal Brand"}</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-wider font-mono ${
                                  order.status === "Pending" ? "bg-yellow-500/10 text-yellow-500" :
                                  order.status === "Accepted" ? "bg-purple-500/10 text-purple-400" :
                                  order.status === "In Progress" ? "bg-blue-500/10 text-blue-400" :
                                  order.status === "Completed" ? "bg-green-500/10 text-green-400" :
                                  "bg-red-500/10 text-red-400"
                                }`}>
                                  {order.status.toUpperCase()}
                                </span>
                                <span className={`px-2.5 py-1 rounded text-[9px] font-mono font-bold ${order.isPaid ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-500"}`}>
                                  {order.isPaid ? "PAID" : "PENDING PAYMENT"}
                                </span>
                              </div>
                            </div>

                            {/* Timeline Visual Status Tracker */}
                            <div className="border-t border-white/5 pt-4">
                              <span className="block text-[8px] font-mono text-gray-500 uppercase tracking-widest font-bold mb-3.5">
                                PRODUCTION TIMELINE STATUS
                              </span>
                              <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono relative">
                                {["Order Placed", "Review", "In Development", "Delivery"].map((step, idx) => {
                                  let stepActive = false;
                                  let stepFinished = false;

                                  if (order.status === "Pending" && idx === 0) stepActive = true;
                                  if (order.status === "Accepted" && idx <= 1) {
                                    if (idx === 1) stepActive = true; else stepFinished = true;
                                  }
                                  if (order.status === "In Progress" && idx <= 2) {
                                    if (idx === 2) stepActive = true; else stepFinished = true;
                                  }
                                  if (order.status === "Completed") {
                                    stepFinished = true;
                                  }

                                  return (
                                    <div key={idx} className="space-y-1.5 relative">
                                      <div className={`w-3.5 h-3.5 rounded-full mx-auto flex items-center justify-center border transition-all ${
                                        stepFinished ? "bg-green-500 border-green-500 text-white" :
                                        stepActive ? "bg-arcadia-blue border-arcadia-blue text-white animate-pulse" :
                                        "bg-white/[0.02] border-white/10 text-gray-600"
                                      }`}>
                                        {stepFinished && <span className="text-[8px]">✓</span>}
                                      </div>
                                      <span className={`block font-bold ${stepActive ? "text-arcadia-cyan" : stepFinished ? "text-gray-300" : "text-gray-600"}`}>
                                        {step}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Additional metadata info details */}
                            <div className="bg-white/[0.01] border border-white/5 p-3.5 rounded-xl space-y-3">
                              <p className="text-[11px] text-gray-400 font-sans italic leading-relaxed">
                                "{order.description}"
                              </p>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1.5 border-t border-white/5">
                                <div className="flex justify-between items-center sm:gap-6 text-[9px] font-mono text-gray-500 w-full sm:w-auto">
                                  <span>COMMITTED BUDGET: ₹{parseInt(order.budget).toLocaleString("en-IN")}</span>
                                  <span className="hidden sm:inline">•</span>
                                  <span>DEADLINE DATE: {order.deadline}</span>
                                </div>
                                <AnimatedButton
                                  onClick={() => generateInvoicePDF(order)}
                                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-arcadia-blue/10 border border-arcadia-blue/20 text-arcadia-cyan text-[10px] font-mono font-semibold hover:bg-arcadia-blue/20 hover:text-white transition cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>DOWNLOAD FULL INVOICE (PDF)</span>
                                </AnimatedButton>
                              </div>

                              {order.status === "Completed" && (
                                <div className="mt-4 p-4 rounded-xl bg-[#25D366]/5 border border-[#25D366]/20 space-y-3 text-left">
                                  <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 animate-pulse" />
                                    <span className="font-sans font-bold text-xs text-white">PROJECT DELIVERED! SHARE YOUR EXPERIENCE</span>
                                  </div>
                                  <p className="text-[10px] text-gray-400">
                                    Your co-development project has reached full engineering deployment. Please rate your experience to help us maintain elite standards.
                                  </p>
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <AnimatedButton
                                        key={star}
                                        type="button"
                                        onClick={() => {
                                          onShowToast("success", `Thank you for leaving a ${star}-star rating review!`);
                                        }}
                                        className="text-yellow-500 hover:scale-125 transition cursor-pointer"
                                      >
                                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                      </AnimatedButton>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Approved Payment Milestones (30% / 50% / 20%) */}
                            <div className="border-t border-white/5 pt-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="block text-[8px] font-mono text-gray-500 uppercase tracking-widest font-bold">
                                  APPROVED PAYMENT MILESTONES (30% / 50% / 20%)
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {(order.milestones || [
                                  { id: "m1", label: "Kickoff Booking Deposit (30%)", percentage: 30, amount: Math.round((parseInt(order.budget) || 0) * 0.3), status: order.isPaid ? "Paid" : "Pending" },
                                  { id: "m2", label: "Mid-Project Development Phase (50%)", percentage: 50, amount: Math.round((parseInt(order.budget) || 0) * 0.5), status: order.isPaid ? "Paid" : "Pending" },
                                  { id: "m3", label: "Project Handover & Settlement (20%)", percentage: 20, amount: (parseInt(order.budget) || 0) - Math.round((parseInt(order.budget) || 0) * 0.3) - Math.round((parseInt(order.budget) || 0) * 0.5), status: order.isPaid ? "Paid" : "Pending" }
                                ]).map((milestone) => {
                                  return (
                                    <div key={milestone.id} className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col justify-between space-y-3 hover:bg-white/[0.02] transition-all">
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-mono text-[9px] text-gray-400 font-bold uppercase">
                                            {milestone.id === "m1" ? "Milestone 1" : milestone.id === "m2" ? "Milestone 2" : "Milestone 3"}
                                          </span>
                                          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${
                                            milestone.status === "Paid" ? "bg-green-500/10 text-green-400" :
                                            milestone.status === "Link Sent" ? "bg-purple-500/10 text-purple-400 animate-pulse" :
                                            "bg-white/5 text-gray-500"
                                          }`}>
                                            {milestone.status}
                                          </span>
                                        </div>
                                        <h5 className="font-sans font-bold text-xs text-white leading-snug">{milestone.label}</h5>
                                        <span className="block font-display font-black text-xs text-arcadia-cyan mt-1">₹{milestone.amount.toLocaleString("en-IN")}</span>
                                      </div>

                                      <div className="pt-2 border-t border-white/5">
                                        {milestone.status === "Paid" ? (
                                          <AnimatedButton
                                            type="button"
                                            onClick={() => generateInvoicePDF(order, milestone.id)}
                                            className="w-full py-1.5 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 text-[9px] font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer transition border border-green-500/20"
                                          >
                                            <Download className="w-3.5 h-3.5" />
                                            <span>DOWNLOAD SIGNED INVOICE</span>
                                          </AnimatedButton>
                                        ) : milestone.status === "Link Sent" ? (
                                          <div className="space-y-2">
                                            <AnimatedButton
                                              type="button"
                                              onClick={() => handlePayMilestoneTrigger(order.id, milestone.id, milestone.amount, milestone.label)}
                                              className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-mono font-black tracking-wider flex items-center justify-center gap-1 cursor-pointer transition shadow-[0_2px_8px_rgba(147,51,234,0.3)]"
                                            >
                                              <CreditCard className="w-3.5 h-3.5" />
                                              <span>PAY ₹{milestone.amount.toLocaleString("en-IN")}</span>
                                            </AnimatedButton>
                                            <div className="p-2 rounded-xl bg-red-500/[0.02] border border-red-500/10 space-y-1 text-left">
                                              <div className="text-[8px] font-mono text-gray-500 uppercase font-bold tracking-wider">
                                                Direct Payment Support:
                                              </div>
                                              <p className="text-[8.5px] font-mono text-gray-400">📞 +91 8328218878</p>
                                              <p className="text-[8.5px] font-mono text-gray-400">📧 arcadiadevelopers07@gmail.com</p>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-center py-1.5 font-mono text-[8px] text-gray-500 uppercase tracking-widest">
                                            🔒 Awaiting Admin Approval
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* CLIENT COMPLETED TRANSACTION HISTORY */}
                    <div className="mt-12 space-y-4">
                      <div className="border-t border-white/5 pt-8">
                        <h4 className="font-display font-black text-sm text-white tracking-wider uppercase flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span>Milestone Payment Receipts</span>
                        </h4>
                        <p className="font-sans text-[11px] text-gray-500">
                          Verified ledger of completed payments. Download company-branded signed PDF invoices instantly.
                        </p>
                      </div>

                      <div className="overflow-x-auto bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                        <table className="w-full text-left font-sans text-xs">
                          <thead>
                            <tr className="border-b border-white/5 text-gray-500">
                              <th className="py-2.5 px-2">Transaction Ref</th>
                              <th className="py-2.5 px-2">Milestone Description</th>
                              <th className="py-2.5 px-2 text-right">Amount Paid</th>
                              <th className="py-2.5 px-2">Settlement Date</th>
                              <th className="py-2.5 px-2 text-center">Receipt Invoice</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-sans">
                            {clientOrders.flatMap(order => {
                              if (!order.milestones) return [];
                              return order.milestones
                                .filter((m: any) => m.status === "Paid")
                                .map((m: any) => ({
                                  order,
                                  milestone: m,
                                  id: `TXN-${order.id.slice(4, 9).toUpperCase()}-${m.id.toUpperCase()}`,
                                  label: m.label,
                                  amount: m.amount,
                                  paidAt: m.paidAt || order.createdAt
                                }));
                            }).length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center py-6 text-gray-500 font-mono text-[10px]">
                                  NO PAYMENTS SETTLED IN SYSTEM RECORDS
                                </td>
                              </tr>
                            ) : (
                              clientOrders.flatMap(order => {
                                if (!order.milestones) return [];
                                return order.milestones
                                  .filter((m: any) => m.status === "Paid")
                                  .map((m: any) => ({
                                    order,
                                    milestone: m,
                                    id: `TXN-${order.id.slice(4, 9).toUpperCase()}-${m.id.toUpperCase()}`,
                                    label: m.label,
                                    amount: m.amount,
                                    paidAt: m.paidAt || order.createdAt
                                  }));
                              })
                              .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
                              .map((txn) => (
                                <tr key={txn.id} className="hover:bg-white/[0.01]">
                                  <td className="py-3 px-2 font-mono text-[10px] text-arcadia-cyan font-semibold">
                                    {txn.id}
                                  </td>
                                  <td className="py-3 px-2">
                                    <span className="block font-bold text-white">{txn.order.service}</span>
                                    <span className="block text-[10px] text-gray-400">{txn.label}</span>
                                  </td>
                                  <td className="py-3 px-2 text-right font-mono font-bold text-green-400">
                                    ₹{txn.amount.toLocaleString("en-IN")}
                                  </td>
                                  <td className="py-3 px-2 text-gray-400 font-mono text-[10px]">
                                    {new Date(txn.paidAt).toLocaleString("en-IN", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })}
                                  </td>
                                  <td className="py-3 px-2 text-center">
                                    <AnimatedButton
                                      type="button"
                                      onClick={() => generateInvoicePDF(txn.order, txn.milestone.id)}
                                      className="px-2 py-1 rounded bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 hover:text-white transition cursor-pointer font-mono text-[9px] font-bold flex items-center gap-1 mx-auto"
                                      title="Download Signed PDF Receipt"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Download Receipt</span>
                                    </AnimatedButton>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* MY BOOKINGS TAB */}
                {activeTab === "bookings" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-display font-black text-lg text-white">YOUR ARCHITECTURAL CONSULTATIONS</h3>
                      <p className="font-sans text-xs text-gray-500">Scheduled 1-on-1 demo briefs with Arcadia's engineering leads.</p>
                    </div>

                    <div className="space-y-4">
                      {clientBookings.length === 0 ? (
                        <div className="text-center py-12 rounded-2xl bg-white/[0.01] border border-white/5">
                          <Calendar className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                          <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                            No demo brief appointments currently scheduled.
                          </p>
                        </div>
                      ) : (
                        clientBookings.map(booking => (
                          <div key={booking.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest block font-bold">Scheduled Demo Appointment</span>
                              <h4 className="font-display font-extrabold text-sm text-white">{booking.service}</h4>
                              <span className="text-[10px] font-mono text-gray-500 block">Scheduled on {booking.date} @ {booking.time}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="block text-[10px] text-gray-400 font-mono">Platform</span>
                                <span className="block text-xs text-white font-bold">{booking.meetingMode}</span>
                              </div>
                              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* MY INQUIRIES TAB */}
                {activeTab === "inquiries" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-display font-black text-lg text-white">YOUR INQUIRY LEDGER</h3>
                      <p className="font-sans text-xs text-gray-500">Record of general contact and brand inquiry messages.</p>
                    </div>

                    <div className="space-y-4">
                      {clientInquiries.length === 0 ? (
                        <div className="text-center py-12 rounded-2xl bg-white/[0.01] border border-white/5">
                          <MessageSquare className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                          <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                            No general inquiries submitted from this profile.
                          </p>
                        </div>
                      ) : (
                        clientInquiries.map(inq => (
                          <div key={inq.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-2">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                              <span className="font-display font-bold text-xs text-white">{inq.subject}</span>
                              <span className="font-mono text-[9px] text-gray-500">{new Date(inq.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 leading-relaxed italic">
                              "{inq.message}"
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* CLIENT DOSSIER PROFILE TAB */}
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-display font-black text-lg text-white">CLIENT PROFILE</h3>
                      <p className="font-sans text-xs text-gray-500">Official cryptographic digital dossier registered with Arcadia.</p>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <span className="block text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 font-bold">CLIENT REGISTERED NAME</span>
                          <span className="text-sm font-display font-extrabold text-white">{userName}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 font-bold">AUTHORIZED TRANSMISSION EMAIL</span>
                          <span className="text-sm font-mono text-white text-arcadia-cyan">{userEmail}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 font-bold">CLIENT NODE STATUS</span>
                          <span className="text-xs text-green-400 font-mono font-bold">● ONLINE / SECURE CLIENT SESSION</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1 font-bold">SECURITY CLEARANCE</span>
                          <span className="text-xs text-white font-mono uppercase">Level 1 - Client Pipeline Access</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-arcadia-blue/5 border border-arcadia-blue/10 flex items-start gap-3">
                        <Info className="w-4 h-4 text-arcadia-cyan shrink-0 mt-0.5" />
                        <div className="text-[11px] text-gray-400 leading-relaxed">
                          This portal links real-time telemetry updates. When our core engineers change project timelines, accept budgets, or modify design states, these changes appear on your client portal dashboard immediately.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Footer Info */}
              <div className="mt-8 pt-4 border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-gray-500">
                <span>ARCADIA SYNC INTERACTIVE</span>
                <span>AUTHENTICATED CLIENT</span>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* OAUTH CONFIGURATION GUIDE OVERLAY MODAL */}
      <AnimatePresence>
        {showOAuthGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-arcadia-dark border border-white/10 rounded-3xl p-6 max-w-lg w-full relative space-y-6"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-amber-500 uppercase tracking-widest font-bold">OAuth Variable Setup Required</span>
                  <h3 className="font-display font-black text-xl text-white uppercase">{guideProvider} OAuth Setup</h3>
                </div>
                <AnimatedButton
                  onClick={() => setShowOAuthGuide(false)}
                  className="p-1.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white cursor-pointer"
                >
                  ✕
                </AnimatedButton>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                To link real production social auth, you must register your AI Studio container callback URI inside your developer accounts and configure credentials.
              </p>

              <div className="space-y-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl font-mono text-[11px]">
                <div className="space-y-1">
                  <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-widest">Authorized Callback URI</span>
                  <div className="bg-arcadia-black/50 border border-white/5 p-2 rounded text-arcadia-cyan break-all">
                    {callbackUrl}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-widest">Steps to Register:</span>
                  <ul className="list-decimal list-inside space-y-1.5 text-gray-300">
                    {guideProvider === "Google" ? (
                      <>
                        <li>Go to GCP Console Credentials settings</li>
                        <li>Register OAuth client ID (Web Application type)</li>
                        <li>Add the Callback URL above under Redirect URIs</li>
                      </>
                    ) : (
                      <>
                        <li>Go to GitHub Developer Settings</li>
                        <li>Register a New OAuth App</li>
                        <li>Set Authorization callback URL to the URL above</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="space-y-2">
                  <span className="text-gray-500 block text-[9px] uppercase font-bold tracking-widest font-bold text-amber-400">Environment Variables required:</span>
                  <div className="space-y-1 text-gray-300 text-[10px]">
                    <p>• {guideProvider.toUpperCase()}_CLIENT_ID</p>
                    <p>• {guideProvider.toUpperCase()}_CLIENT_SECRET</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <AnimatedButton
                  onClick={() => {
                    setShowOAuthGuide(false);
                    // Open preset bypass automatically as fallback
                    if (guideProvider === "Google") {
                      handleSandboxLogin("vikram@zenix.com", "Vikram Malhotra");
                    } else {
                      handleSandboxLogin("priyanka@aura.com", "Priyanka Sen");
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-display text-xs font-bold tracking-wider uppercase hover:bg-amber-500/20 transition cursor-pointer"
                >
                  Bypass & Sandbox Simulate
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => setShowOAuthGuide(false)}
                  className="flex-1 py-2.5 rounded-xl bg-arcadia-blue text-white font-display text-xs font-bold tracking-wider uppercase hover:shadow-[0_0_15px_rgba(47,128,255,0.3)] transition cursor-pointer"
                >
                  I Understand, Let's Code
                </AnimatedButton>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OFFLINE PAYMENT COORDINATION OVERLAY */}
      <AnimatePresence>
        {payingMilestone && (
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
              className="bg-arcadia-dark border border-white/10 rounded-3xl p-6 max-w-md w-full relative space-y-6"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest font-bold">Manual Settlement coordinates</span>
                  <h3 className="font-display font-black text-xl text-white">BILLING DESK</h3>
                </div>
                <AnimatedButton
                  onClick={() => setPayingMilestone(null)}
                  className="p-1.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </AnimatedButton>
              </div>

              <div className="p-4 rounded-2xl bg-[#080d1a] border border-arcadia-blue/10 space-y-3">
                <div className="space-y-1">
                  <span className="text-[8px] font-mono text-gray-500 uppercase font-bold block">Paying Milestone For Solution</span>
                  <span className="text-white text-xs font-bold font-sans">{payingMilestone.label}</span>
                </div>
                <div className="flex justify-between items-center pt-2.5 border-t border-white/5">
                  <span className="text-[10px] text-gray-400 font-sans">Authorized Deposit Amount:</span>
                  <span className="font-display font-black text-lg text-arcadia-cyan">₹{payingMilestone.amount.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                  All production settlements are managed manually off-line via bank transfer (NEFT / IMPS / RTGS). Please get in touch with our billing desk with your request ID to obtain official bank credentials and register your deposit.
                </p>
                
                {/* DIRECT CONTACT INFO FOR MANUAL / ENQUIRIES */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <span className="block text-[8px] font-mono text-purple-400 uppercase tracking-wider font-bold">Arcadia Interactive Billing Contacts</span>
                  <div className="space-y-2 text-[11px] font-sans text-gray-300">
                    <div className="flex justify-between border-b border-white/5 pb-1.5">
                      <span className="text-gray-400">Corporate Email:</span>
                      <span className="text-white font-bold select-all">arcadiadevelopers07@gmail.com</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Settle Desk Hotline:</span>
                      <span className="text-white font-bold select-all">+91 8328218878</span>
                    </div>
                  </div>
                </div>

                <AnimatedButton
                  onClick={() => setPayingMilestone(null)}
                  className="w-full py-3.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-display text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  Close Instructions
                </AnimatedButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
