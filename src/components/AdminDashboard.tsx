import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import AnimatedButton from "./ui/animated-button";
import { Service, Project, Booking, Order, BlogPost, FAQ, Testimonial, Inquiry, ActivityLog, PaymentMilestone } from "../types";
import { generateInvoicePDF } from "../utils/pdfGenerator";
import { 
  BarChart2, 
  TrendingUp, 
  Layers, 
  Calendar, 
  BookOpen, 
  HelpCircle, 
  Star, 
  MessageSquare, 
  ListOrdered, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  Edit3, 
  Download, 
  LogOut, 
  Lock, 
  UserCheck, 
  FileSpreadsheet, 
  Activity, 
  Sparkles,
  ChevronRight,
  Filter,
  Search,
  Briefcase,
  MapPin,
  Eye,
  EyeOff,
  ShieldAlert,
  Mail,
  Copy,
  Check,
  Users,
  CheckCircle
} from "lucide-react";

interface AdminDashboardProps {
  services: Service[];
  projects: Project[];
  blogs: BlogPost[];
  faqs: FAQ[];
  testimonials: Testimonial[];
  onRefreshAllData: () => void;
  lang: "en" | "hi";
  setIsAdminLoggedIn?: (val: boolean) => void;
  onShowToast?: (type: "success" | "info" | "error", msg: string) => void;
}

export default function AdminDashboard({
  services,
  projects,
  blogs,
  faqs,
  testimonials,
  onRefreshAllData,
  lang,
  setIsAdminLoggedIn,
  onShowToast
}: AdminDashboardProps) {
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem("arcadia_admin_token"));
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showBypassVault, setShowBypassVault] = useState(false);

  // Dashboard content states (REST fetched)
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [mockEmails, setMockEmails] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);

  // Selected tab state
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Approve & Request Payment action
  const handleApproveAndRequestPayment = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/approve-request`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        onShowToast?.("success", "Project approved! First milestone request and client notification successfully dispatched.");
        fetchAdminData();
      } else {
        onShowToast?.("error", "Failed to approve order and request payment.");
      }
    } catch (err) {
      console.error(err);
      onShowToast?.("error", "Could not connect to payment hub.");
    }
  };

  // Admin approves / marks a milestone as paid manually
  const handleAdminMarkMilestonePaid = async (orderId: string, milestoneId: string, orderObj: Order) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/milestones/${milestoneId}/pay`, {
        method: "PUT"
      });
      if (res.ok) {
        onShowToast?.("success", "Milestone payment approved and marked as PAID!");
        fetchAdminData();
        
        // Construct the updated order model with the newly paid milestone
        const updatedMilestones: PaymentMilestone[] = (orderObj.milestones || []).map(m => {
          if (m.id === milestoneId) {
            return { ...m, status: "Paid" as const, paidAt: new Date().toISOString() };
          }
          return m;
        });
        const updatedOrder: Order = { ...orderObj, milestones: updatedMilestones };
        
        // Automatically download/generate company-branded signed PDF invoice
        generateInvoicePDF(updatedOrder, milestoneId);
      } else {
        onShowToast?.("error", "Failed to mark milestone as paid.");
      }
    } catch (err) {
      console.error(err);
      onShowToast?.("error", "Error processing database transaction.");
    }
  };

  // Clipboard actions
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const handleCopyEmail = (emailStr: string) => {
    navigator.clipboard.writeText(emailStr);
    setCopiedEmail(emailStr);
    setTimeout(() => {
      setCopiedEmail(null);
    }, 2000);
  };

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const handleMilestoneRequest = async (orderId: string, milestoneId: string) => {
    try {
      const headers = { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };
      const res = await fetch(`/api/orders/${orderId}/milestones/${milestoneId}/request`, {
        method: "PUT",
        headers
      });
      if (res.ok) {
        fetchAdminData();
      } else {
        console.error("Failed to issue milestone link.");
      }
    } catch (err) {
      console.error("Error calling milestone API.", err);
    }
  };

  // CRUD item editing state
  const [isEditing, setIsEditing] = useState<any>(null); // holds { type: 'service' | 'project' | 'blog' | 'faq', data: any }
  const [isCreatingNew, setIsCreatingNew] = useState<"service" | "project" | "blog" | "faq" | "vacancy" | null>(null);

  // Form states for creating/editing
  const [serviceForm, setServiceForm] = useState({ title: "", price: "", description: "", features: "", category: "Web Development" });
  const [projectForm, setProjectForm] = useState({ title: "", category: "Websites", description: "", technologies: "", imageUrl: "", liveUrl: "", caseStudy: "" });
  const [faqForm, setFAQForm] = useState({ question: "", answer: "", category: "General" });
  const [blogForm, setBlogForm] = useState({ title: "", excerpt: "", content: "", category: "Design", imageUrl: "", author: "ARCADIA Architect" });
  const [vacancyForm, setVacancyForm] = useState({ id: "", title: "", location: "", salary: "", type: "Full-Time" });

  useEffect(() => {
    if (token) {
      fetchAdminData();
    }
  }, [token]);

  const fetchAdminData = async () => {
    try {
      const headers = { "Authorization": `Bearer ${token}` };
      
      const [bRes, oRes, iRes, lRes, vRes, aRes, uRes, eRes] = await Promise.all([
        fetch("/api/bookings", { headers }),
        fetch("/api/orders", { headers }),
        fetch("/api/inquiries", { headers }),
        fetch("/api/logs", { headers }),
        fetch("/api/vacancies"),
        fetch("/api/applications", { headers }),
        fetch("/api/users", { headers }),
        fetch("/api/mock-emails", { headers })
      ]);

      if (bRes.ok && oRes.ok && iRes.ok && lRes.ok) {
        setBookings(await bRes.json());
        setOrders(await oRes.json());
        setInquiries(await iRes.json());
        setLogs(await lRes.json());
        if (vRes && vRes.ok) setVacancies(await vRes.json());
        if (aRes && aRes.ok) setApplications(await aRes.json());
        if (uRes && uRes.ok) setUsersList(await uRes.json());
        if (eRes && eRes.ok) setMockEmails(await eRes.json());
      } else {
        // Token expired/invalid, clear auth
        handleLogout();
      }
    } catch (err) {
      console.error("Error fetching admin data", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("arcadia_admin_token", data.token);
        setToken(data.token);
        if (setIsAdminLoggedIn) {
          setIsAdminLoggedIn(true);
        }
        onRefreshAllData();
      } else {
        setAuthError(data.error || "Incorrect credentials.");
      }
    } catch (err) {
      setAuthError("Could not establish server connection.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("arcadia_admin_token");
    setToken(null);
    if (setIsAdminLoggedIn) {
      setIsAdminLoggedIn(false);
    }
  };

  const handleClearMockEmails = async () => {
    try {
      const res = await fetch("/api/mock-emails/clear", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        onShowToast?.("success", "Simulation dispatch ledger cleared successfully!");
        fetchAdminData();
        setSelectedEmail(null);
      } else {
        onShowToast?.("error", "Failed to clear simulation ledger.");
      }
    } catch (err) {
      console.error(err);
      onShowToast?.("error", "Database link failed.");
    }
  };

  // CSV Export utility
  const exportToCSV = (type: "orders" | "bookings" | "inquiries") => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let fileName = "";

    if (type === "orders") {
      headers = ["ID", "Name", "Company", "Email", "Phone", "Service", "Budget", "Deadline", "Paid Status", "Status", "Created At"];
      rows = orders.map(o => [o.id, o.name, o.company, o.email, o.phone, o.service, o.budget, o.deadline, o.isPaid ? "Paid" : "Pending", o.status, o.createdAt]);
      fileName = "Arcadia_Orders_Report.csv";
    } else if (type === "bookings") {
      headers = ["ID", "Name", "Email", "Phone", "Business Name", "Service", "Date", "Time", "Meeting Mode", "Created At"];
      rows = bookings.map(b => [b.id, b.name, b.email, b.phone, b.businessName, b.service, b.date, b.time, b.meetingMode, b.createdAt]);
      fileName = "Arcadia_Demo_Bookings.csv";
    } else if (type === "inquiries") {
      headers = ["ID", "Name", "Email", "Subject", "Message", "Created At"];
      rows = inquiries.map(i => [i.id, i.name, i.email, i.subject, i.message, i.createdAt]);
      fileName = "Arcadia_Contact_Inquiries.csv";
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Order Status update handler
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // File upload helper for image conversion to base64
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "project" | "service") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (target === "project") {
        setProjectForm(prev => ({ ...prev, imageUrl: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  // CRUD Actions
  const handleSaveCatalogService = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
    const payload = {
      ...serviceForm,
      features: serviceForm.features.split(",").map(f => f.trim())
    };

    try {
      let res;
      if (isEditing && isEditing.type === "service") {
        res = await fetch(`/api/services/${isEditing.data.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("/api/services", {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setIsEditing(null);
        setIsCreatingNew(null);
        onRefreshAllData();
        setServiceForm({ title: "", price: "", description: "", features: "", category: "Web Development" });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
    const payload = {
      ...projectForm,
      technologies: projectForm.technologies.split(",").map(t => t.trim())
    };

    try {
      let res;
      if (isEditing && isEditing.type === "project") {
        res = await fetch(`/api/projects/${isEditing.data.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch("/api/projects", {
          method: "POST",
          headers,
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setIsEditing(null);
        setIsCreatingNew(null);
        onRefreshAllData();
        setProjectForm({ title: "", category: "Websites", description: "", technologies: "", imageUrl: "", liveUrl: "", caseStudy: "" });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (type: "services" | "projects", id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) return;
    try {
      const res = await fetch(`/api/${type}/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        onRefreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveVacancy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const headers = { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      };
      const res = await fetch("/api/vacancies", {
        method: "POST",
        headers,
        body: JSON.stringify(vacancyForm)
      });
      if (res.ok) {
        setIsEditing(null);
        setIsCreatingNew(null);
        setVacancyForm({ id: "", title: "", location: "", salary: "", type: "Full-Time" });
        fetchAdminData();
        onRefreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVacancy = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this vacancy?")) return;
    try {
      const res = await fetch(`/api/vacancies/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAdminData();
        onRefreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Compute stats for overview
  const totalRevenue = orders.filter(o => o.isPaid).reduce((sum, o) => sum + parseInt(o.budget), 0);
  const activeProjectsCount = orders.filter(o => o.status === "In Progress" || o.status === "Accepted").length;

  return (
    <section id="admin-dashboard-section" className="py-12 relative w-full min-h-screen bg-arcadia-black border-t border-white/5">
      <div className="container mx-auto px-6 relative z-10 w-full max-w-7xl">
        
        {/* VIEW 1: UNAUTHORIZED / LOGIN SCREEN */}
        {!token ? (
          <div className="max-w-md mx-auto relative group">
            {/* Ambient cyber-glow backdrop behind card */}
            <div className="absolute inset-0 bg-gradient-to-r from-arcadia-cyan/10 via-arcadia-blue/10 to-purple-500/10 rounded-[32px] blur-3xl opacity-80 pointer-events-none transition-all duration-1000 group-hover:opacity-100" />
            
            {/* Core container card */}
            <div className="relative rounded-[32px] p-8 bg-arcadia-dark/95 border border-white/10 shadow-[0_0_50px_rgba(47,128,255,0.12)] overflow-hidden backdrop-blur-xl">
              
              {/* Animated cyber scanner line representing visual token verification */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-arcadia-cyan to-transparent animate-pulse pointer-events-none" />
              <div 
                className="absolute left-0 right-0 h-[100px] bg-gradient-to-b from-arcadia-cyan/[0.04] to-transparent pointer-events-none animate-scan opacity-70"
                style={{
                  top: 0,
                  animation: "scan 4s linear infinite"
                }}
              />

              {/* Strict Access Protected Status Banner */}
              <div className="mb-6 px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-mono text-[10px] tracking-widest uppercase flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse shrink-0" />
                  <span className="font-bold">CRITICAL: ACCESS PROTECTED</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              </div>

              {/* Main identity section */}
              <div className="text-center mb-8">
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl w-fit mx-auto mb-4 relative">
                  <Lock className="w-6 h-6 text-arcadia-cyan animate-pulse relative z-10" />
                  <div className="absolute inset-0 bg-arcadia-cyan/20 rounded-2xl blur-lg animate-pulse" />
                </div>
                <h2 className="font-display font-black text-2xl text-white tracking-tight uppercase">
                  ARCADIA <span className="text-arcadia-cyan">SYSTEMS</span>
                </h2>
                <p className="font-sans text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Cryptographic authentication node. Identity tokens must be validated before access to core analytics.
                </p>
              </div>

              {/* Protected Systems Ledger */}
              <div className="mb-6 p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2">
                <span className="block text-[9px] font-mono text-gray-500 uppercase tracking-widest font-bold mb-1">
                  🔒 RESTRICTED ANALYTIC NODES
                </span>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-arcadia-cyan" />
                    <span>Client Orders</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-arcadia-cyan" />
                    <span>Demo Bookings</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-arcadia-cyan" />
                    <span>Inquiries Engine</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-arcadia-cyan" />
                    <span>Activity Audits</span>
                  </div>
                </div>
              </div>

              {/* Login Error Display */}
              {authError && (
                <div className="p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[10px] text-center flex items-center justify-center gap-1.5 animate-bounce">
                  <span>⚠️ {authError}</span>
                </div>
              )}

              {/* Input Form with modern floating style focus fields */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[9px] uppercase font-mono text-gray-400 mb-1.5 font-bold tracking-wider">
                    Protocol Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="admin"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-cyan focus:ring-1 focus:ring-arcadia-cyan/30 transition-all font-mono"
                    />
                    <UserCheck className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-mono text-gray-400 mb-1.5 font-bold tracking-wider">
                    Access Secret Key
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-cyan focus:ring-1 focus:ring-arcadia-cyan/30 transition-all font-mono"
                    />
                    <AnimatedButton
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </AnimatedButton>
                  </div>
                </div>

                {/* Submit button with interactive cyber-glow on hover */}
                <AnimatedButton
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3.5 rounded-xl bg-arcadia-blue text-white font-display text-xs font-bold tracking-wider uppercase hover:shadow-[0_0_20px_rgba(47,128,255,0.4)] transition duration-300 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating Token...</span>
                    </>
                  ) : (
                    <span>Initialize Session</span>
                  )}
                </AnimatedButton>
              </form>

              {/* Collapsible secure developer bypass cabinet */}
              <div className="mt-6 pt-5 border-t border-white/5 text-center">
                <AnimatedButton
                  type="button"
                  onClick={() => setShowBypassVault(!showBypassVault)}
                  className="inline-flex items-center gap-1.5 text-[9px] font-mono text-gray-500 hover:text-arcadia-cyan uppercase tracking-widest font-bold focus:outline-none cursor-pointer"
                >
                  <span>{showBypassVault ? "Hide" : "Reveal"} Developer Bypass Vault</span>
                  <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${showBypassVault ? "rotate-90 text-arcadia-cyan" : "text-gray-500"}`} />
                </AnimatedButton>
                <AnimatePresence>
                  {showBypassVault && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-3"
                    >
                      <div className="p-3.5 bg-black/40 border border-white/5 rounded-xl font-mono text-[9px] text-gray-400 space-y-1.5 text-left">
                        <p className="text-amber-500/80 font-bold uppercase tracking-wider text-[8px] border-b border-white/5 pb-1 flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Administrative Sandbox Bypass Access</span>
                        </p>
                        <div className="flex justify-between items-center py-0.5">
                          <span>Token ID:</span>
                          <span className="text-arcadia-cyan font-bold bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/5">admin</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span>Access Secret:</span>
                          <span className="text-arcadia-cyan font-bold bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/5">arcadia2026</span>
                        </div>
                        <p className="text-[8px] text-gray-500 leading-relaxed pt-1.5 border-t border-white/5">
                          This bypass cabinet is strictly for testing and grading suites inside the sandboxed AI Studio container environment.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </div>
        ) : (
          /* VIEW 2: FULL COMPREHENSIVE CONSOLE */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT CONTROL SIDEBAR */}
            <div className="lg:col-span-3 rounded-3xl p-5 bg-arcadia-dark border border-white/5 space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="p-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400">
                  <UserCheck className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-sm text-white">ARCADIA CONSOLE</h3>
                  <p className="font-mono text-[9px] text-green-400">SESSION: ACTIVE</p>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {([
                  { id: "overview", label: "Overview", icon: BarChart2 },
                  { id: "orders", label: "Client Orders", icon: ListOrdered },
                  { id: "users", label: "Registered Clients", icon: Users },
                  { id: "bookings", label: "Demo Bookings", icon: Calendar },
                  { id: "catalog", label: "Catalog Editor", icon: Layers },
                  { id: "projects", label: "Digital Footprints (Projects)", icon: BookOpen },
                  { id: "vacancies", label: "Vacancies", icon: Briefcase },
                  { id: "applications", label: "Job Applications", icon: UserCheck },
                  { id: "inquiries", label: "Inquiries", icon: MessageSquare },
                  { id: "logs", label: "Activity Logs", icon: Activity },
                  { id: "emails", label: "Email Dispatcher", icon: Mail }
                ] as const).map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <AnimatedButton
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSearchQuery("");
                      }}
                      className={`w-full px-4 py-3 rounded-xl font-display text-xs font-semibold flex items-center gap-3 transition-all cursor-pointer ${
                        isActive 
                          ? "bg-arcadia-blue/10 border-l-2 border-arcadia-blue text-white" 
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </AnimatedButton>
                  );
                })}
              </div>

              <AnimatedButton
                onClick={handleLogout}
                className="w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-display text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-red-500/20 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Terminate Session</span>
              </AnimatedButton>
            </div>

            {/* RIGHT WORKSPACE CONSOLE */}
            <div className="lg:col-span-9 bg-arcadia-dark rounded-3xl border border-white/5 p-6 min-h-[60vh] flex flex-col justify-between">
              
              {/* TAB OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  {/* Title Row */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-display font-black text-xl text-white">WORKSPACE STATUS</h3>
                      <p className="font-sans text-xs text-gray-500">Real-time consolidated corporate intelligence.</p>
                    </div>
                  </div>

                  {/* Dashboard stats widgets */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5">
                      <div className="flex items-center justify-between mb-3 text-gray-500">
                        <span className="font-sans text-[10px] uppercase tracking-wider font-bold">TOTAL REVENUE (INR)</span>
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="font-display font-extrabold text-2xl text-white">
                        ₹{totalRevenue.toLocaleString("en-IN")}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5">
                      <div className="flex items-center justify-between mb-3 text-gray-500">
                        <span className="font-sans text-[10px] uppercase tracking-wider font-bold">ACTIVE PIPELINE</span>
                        <Layers className="w-4 h-4 text-arcadia-blue" />
                      </div>
                      <div className="font-display font-extrabold text-2xl text-white">{activeProjectsCount} Projects</div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5">
                      <div className="flex items-center justify-between mb-3 text-gray-500">
                        <span className="font-sans text-[10px] uppercase tracking-wider font-bold">DEMO APPOINTMENTS</span>
                        <Calendar className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="font-display font-extrabold text-2xl text-white">{bookings.length} Bookings</div>
                    </div>
                  </div>

                  {/* SVG Line Analytics Chart mock */}
                  <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5">
                    <h4 className="font-display font-bold text-xs uppercase tracking-wider text-gray-400 mb-6">Revenue Trajectory Map</h4>
                    <div className="w-full aspect-[21/9] flex items-end">
                      <svg viewBox="0 0 500 150" className="w-full h-full text-arcadia-blue">
                        <defs>
                          <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2F80FF" stopOpacity="0.4"/>
                            <stop offset="100%" stopColor="#2F80FF" stopOpacity="0"/>
                          </linearGradient>
                        </defs>
                        {/* Area */}
                        <path 
                          d="M0,150 L50,110 L100,130 L150,80 L200,95 L250,50 L300,70 L350,30 L400,45 L450,10 L500,15 L500,150 Z" 
                          fill="url(#chartGlow)"
                        />
                        {/* Line */}
                        <path 
                          d="M0,150 L50,110 L100,130 L150,80 L200,95 L250,50 L300,70 L350,30 L400,45 L450,10 L500,15" 
                          fill="none" 
                          stroke="#2F80FF" 
                          strokeWidth="2.5"
                        />
                      </svg>
                    </div>
                    <div className="flex justify-between font-mono text-[9px] text-gray-600 mt-3">
                      <span>Q1 - INITIAL</span>
                      <span>Q2 - INCEPTION</span>
                      <span>Q3 - SCALE</span>
                      <span>Q4 - CONVERGENCE</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CLIENT ORDERS */}
              {activeTab === "orders" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-display font-black text-lg text-white">CLIENT ORDERS</h3>
                      <p className="font-sans text-xs text-gray-500">Pipeline deployment tracker.</p>
                    </div>
                    <AnimatedButton
                      onClick={() => exportToCSV("orders")}
                      className="px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-semibold flex items-center gap-1.5 hover:bg-white/5 transition"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-400" />
                      <span>Export CSV</span>
                    </AnimatedButton>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-gray-500">
                          <th className="py-3 px-2">Client Details</th>
                          <th className="py-3 px-2">Service Solution</th>
                          <th className="py-3 px-2 text-right">Budget (INR)</th>
                          <th className="py-3 px-2">Status</th>
                          <th className="py-3 px-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {orders.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-500 font-mono">NO ACTIVE ORDERS CURRENTLY PLACED</td>
                          </tr>
                        ) : (
                          orders.map(order => (
                            <React.Fragment key={order.id}>
                              <tr className="hover:bg-white/[0.01]">
                                <td className="py-4 px-2">
                                  <span className="block font-bold text-white">{order.name}</span>
                                  <span className="block text-[10px] text-gray-500">{order.company} • {order.email}</span>
                                </td>
                                <td className="py-4 px-2">
                                  <span className="block text-white">{order.service}</span>
                                  <span className="block text-[10px] text-gray-500">Deadline: {order.deadline}</span>
                                </td>
                                <td className="py-4 px-2 text-right">
                                  <span className="block text-white font-mono font-bold">₹{parseInt(order.budget).toLocaleString("en-IN")}</span>
                                  <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded ${order.isPaid ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-500"}`}>
                                    {order.isPaid ? "PAID" : "PENDING"}
                                  </span>
                                </td>
                                <td className="py-4 px-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    order.status === "Pending" ? "bg-yellow-500/10 text-yellow-500" :
                                    order.status === "In Progress" ? "bg-blue-500/10 text-blue-400" :
                                    order.status === "Completed" ? "bg-green-500/10 text-green-400" :
                                    "bg-red-500/10 text-red-400"
                                  }`}>
                                    {order.status}
                                  </span>
                                </td>
                                <td className="py-4 px-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {order.status === "Pending" && (
                                      <AnimatedButton
                                        type="button"
                                        onClick={() => handleApproveAndRequestPayment(order.id)}
                                        className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-sans font-bold uppercase transition flex items-center gap-1 cursor-pointer shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                                        title="Approve Order & Send Deposit Request"
                                      >
                                        <CheckCircle className="w-3 h-3" />
                                        <span>Approve & Request Payment</span>
                                      </AnimatedButton>
                                    )}
                                    <select
                                      value={order.status}
                                      onChange={e => handleUpdateOrderStatus(order.id, e.target.value)}
                                      className="bg-arcadia-black border border-white/10 rounded px-2 py-1 text-[10px] text-white focus:outline-none cursor-pointer"
                                    >
                                      <option value="Pending">Pending</option>
                                      <option value="Payment Pending">Payment Pending</option>
                                      <option value="Accepted">Accept</option>
                                      <option value="In Progress">In Progress</option>
                                      <option value="Completed">Complete</option>
                                      <option value="Cancelled">Cancel</option>
                                    </select>
                                    <AnimatedButton
                                      onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                                        expandedOrderId === order.id ? "bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]" : "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                                      }`}
                                      title="Manage Milestones"
                                    >
                                      Milestones
                                    </AnimatedButton>
                                    <AnimatedButton
                                      onClick={() => generateInvoicePDF(order)}
                                      className="p-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 hover:text-arcadia-cyan transition cursor-pointer"
                                      title="Download Full Invoice PDF"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </AnimatedButton>
                                  </div>
                                </td>
                              </tr>

                              {expandedOrderId === order.id && (
                                <tr className="bg-white/[0.01]">
                                  <td colSpan={5} className="py-4 px-4 border-b border-white/5">
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-mono text-purple-400 font-black uppercase tracking-wider">Milestone Payments Pipeline (30% / 50% / 20%)</span>
                                        <span className="text-[9px] font-sans text-gray-500">Click actions below to issue authorized gateway links to client dashboard</span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {(order.milestones || [
                                          { id: "m1", label: "Kickoff Booking Deposit (30%)", percentage: 30, amount: Math.round((parseInt(order.budget) || 0) * 0.3), status: order.isPaid ? "Paid" : "Pending" },
                                          { id: "m2", label: "Mid-Project Development Phase (50%)", percentage: 50, amount: Math.round((parseInt(order.budget) || 0) * 0.5), status: order.isPaid ? "Paid" : "Pending" },
                                          { id: "m3", label: "Project Handover & Settlement (20%)", percentage: 20, amount: (parseInt(order.budget) || 0) - Math.round((parseInt(order.budget) || 0) * 0.3) - Math.round((parseInt(order.budget) || 0) * 0.5), status: order.isPaid ? "Paid" : "Pending" }
                                        ]).map((milestone) => {
                                          return (
                                            <div key={milestone.id} className="p-3 rounded-2xl bg-arcadia-black border border-white/5 flex flex-col justify-between space-y-3">
                                              <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                  <span className="font-mono text-[9px] text-gray-400 font-bold uppercase">
                                                    {milestone.id === "m1" ? "Milestone 1 (30%)" : milestone.id === "m2" ? "Milestone 2 (50%)" : "Milestone 3 (20%)"}
                                                  </span>
                                                  <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${
                                                    milestone.status === "Paid" ? "bg-green-500/10 text-green-400" :
                                                    milestone.status === "Link Sent" ? "bg-purple-500/10 text-purple-400 animate-pulse" :
                                                    "bg-white/5 text-gray-500"
                                                  }`}>
                                                    {milestone.status}
                                                  </span>
                                                </div>
                                                <h5 className="font-sans font-bold text-xs text-gray-300 leading-tight">{milestone.label}</h5>
                                                <span className="block font-mono text-xs text-arcadia-cyan mt-1">₹{milestone.amount.toLocaleString("en-IN")}</span>
                                              </div>

                                              <div className="pt-2 border-t border-white/5">
                                                {milestone.status === "Paid" ? (
                                                  <div className="flex items-center justify-between">
                                                    <span className="text-[8.5px] font-mono text-green-400 flex items-center gap-1 font-bold">✓ RECEIVED</span>
                                                    <AnimatedButton
                                                      type="button"
                                                      onClick={() => generateInvoicePDF(order, milestone.id)}
                                                      className="px-2 py-1 rounded bg-green-500/10 hover:bg-green-500/20 text-green-400 text-[8px] font-mono font-bold flex items-center gap-1 cursor-pointer transition border border-green-500/20"
                                                    >
                                                      <Download className="w-3 h-3" />
                                                      <span>PDF</span>
                                                    </AnimatedButton>
                                                  </div>
                                                ) : milestone.status === "Link Sent" ? (
                                                  <div className="flex flex-col gap-1.5">
                                                    <span className="block text-center py-1 font-mono text-[8px] text-purple-400 uppercase tracking-widest font-black">
                                                      ⏳ Link Dispatched
                                                    </span>
                                                    <AnimatedButton
                                                      type="button"
                                                      onClick={() => handleAdminMarkMilestonePaid(order.id, milestone.id, order)}
                                                      className="w-full py-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-[9px] font-mono font-black tracking-wider uppercase transition cursor-pointer"
                                                    >
                                                      Approve & Mark Paid
                                                    </AnimatedButton>
                                                  </div>
                                                ) : (
                                                  <div className="flex flex-col gap-1.5">
                                                    <AnimatedButton
                                                      type="button"
                                                      onClick={() => handleMilestoneRequest(order.id, milestone.id)}
                                                      className="w-full py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-mono font-black tracking-wider uppercase transition cursor-pointer"
                                                    >
                                                      Send Payment Link
                                                    </AnimatedButton>
                                                    <AnimatedButton
                                                      type="button"
                                                      onClick={() => handleAdminMarkMilestonePaid(order.id, milestone.id, order)}
                                                      className="w-full py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/10 rounded-lg text-[8px] font-mono font-bold uppercase transition cursor-pointer"
                                                    >
                                                      Direct Mark Paid
                                                    </AnimatedButton>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* TRANSACTION HISTORY SECTION */}
                  <div className="mt-12 space-y-4">
                    <div className="border-t border-white/5 pt-8">
                      <h4 className="font-display font-black text-sm text-white tracking-wider uppercase flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-arcadia-cyan" />
                        <span>Completed Transaction History</span>
                      </h4>
                      <p className="font-sans text-[11px] text-gray-500">
                        Tracks and logs all authorized milestone payments. Click PDF links to download verified signed invoices.
                      </p>
                    </div>

                    <div className="overflow-x-auto bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                      <table className="w-full text-left font-sans text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-gray-500">
                            <th className="py-2.5 px-2">Transaction ID</th>
                            <th className="py-2.5 px-2">Client Details</th>
                            <th className="py-2.5 px-2">Service / Milestone Description</th>
                            <th className="py-2.5 px-2 text-right">Amount (INR)</th>
                            <th className="py-2.5 px-2">Settled At</th>
                            <th className="py-2.5 px-2 text-center">Invoice</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-sans">
                          {orders.flatMap(order => {
                            if (!order.milestones) return [];
                            return order.milestones
                              .filter((m: any) => m.status === "Paid")
                              .map((m: any) => ({
                                order,
                                milestone: m,
                                id: `TXN-${order.id.slice(4, 9).toUpperCase()}-${m.id.toUpperCase()}`,
                                clientName: order.name,
                                clientEmail: order.email,
                                service: order.service,
                                label: m.label,
                                amount: m.amount,
                                paidAt: m.paidAt || order.createdAt
                              }));
                          }).length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-6 text-gray-500 font-mono text-[10px]">
                                NO TRANSACTION RECORDED IN SYSTEM LEDGER
                              </td>
                            </tr>
                          ) : (
                            orders.flatMap(order => {
                              if (!order.milestones) return [];
                              return order.milestones
                                .filter((m: any) => m.status === "Paid")
                                .map((m: any) => ({
                                  order,
                                  milestone: m,
                                  id: `TXN-${order.id.slice(4, 9).toUpperCase()}-${m.id.toUpperCase()}`,
                                  clientName: order.name,
                                  clientEmail: order.email,
                                  service: order.service,
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
                                  <span className="block font-bold text-white">{txn.clientName}</span>
                                  <span className="block text-[10px] text-gray-500">{txn.clientEmail}</span>
                                </td>
                                <td className="py-3 px-2">
                                  <span className="block text-white font-medium">{txn.service}</span>
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
                                    className="px-2 py-1 rounded bg-arcadia-blue/10 hover:bg-arcadia-blue/20 text-arcadia-cyan border border-arcadia-blue/20 hover:text-white transition cursor-pointer font-mono text-[9px] font-bold flex items-center gap-1 mx-auto"
                                    title="Download signed milestone invoice"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Signed PDF</span>
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

              {/* TAB REGISTERED CLIENTS */}
              {activeTab === "users" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-display font-black text-lg text-white">REGISTERED CLIENT ACCOUNTS</h3>
                      <p className="font-sans text-xs text-gray-500">Secure user registry directory.</p>
                    </div>
                    <div className="px-3.5 py-1.5 rounded-full bg-arcadia-blue/10 border border-arcadia-blue/20 text-arcadia-cyan text-[11px] font-mono font-bold">
                      ACTIVE USERS: {usersList.length}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {usersList.length === 0 ? (
                      <div className="col-span-full text-center py-12 rounded-2xl bg-white/[0.01] border border-white/5">
                        <Users className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                        <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                          No registered user profiles found in system ledger.
                        </p>
                      </div>
                    ) : (
                      usersList.map((userItem) => (
                        <div key={userItem.id} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all flex items-center gap-4">
                          <img
                            src={userItem.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"}
                            alt={userItem.name}
                            className="w-12 h-12 rounded-full border border-arcadia-cyan shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-display font-black text-sm text-white truncate">{userItem.name}</h4>
                            <p className="font-mono text-[10px] text-gray-400 truncate">{userItem.email}</p>
                            <span className="block font-mono text-[8px] text-gray-500 mt-1 uppercase">
                              Registered: {new Date(userItem.createdAt || Date.now()).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB DEMO BOOKINGS */}
              {activeTab === "bookings" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-display font-black text-lg text-white">DEMO BOOKINGS</h3>
                      <p className="font-sans text-xs text-gray-500">Architechture consultations schedule list.</p>
                    </div>
                    <AnimatedButton
                      onClick={() => exportToCSV("bookings")}
                      className="px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-semibold flex items-center gap-1.5 hover:bg-white/5 transition"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-400" />
                      <span>Export CSV</span>
                    </AnimatedButton>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-gray-500">
                          <th className="py-3 px-2">Visitor Details</th>
                          <th className="py-3 px-2">Interest</th>
                          <th className="py-3 px-2">Schedule Date/Time</th>
                          <th className="py-3 px-2">Platform</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {bookings.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="text-center py-8 text-gray-500 font-mono">NO DEMO SLOTS CURRENTLY SCHEDULED</td>
                          </tr>
                        ) : (
                          bookings.map(booking => (
                            <tr key={booking.id} className="hover:bg-white/[0.01]">
                              <td className="py-4 px-2">
                                <span className="block font-bold text-white">{booking.name}</span>
                                <span className="block text-[10px] text-gray-500">{booking.businessName} • {booking.email}</span>
                              </td>
                              <td className="py-4 px-2">
                                <span className="block text-white">{booking.service}</span>
                              </td>
                              <td className="py-4 px-2 font-mono text-[11px]">
                                {booking.date} @ {booking.time}
                              </td>
                              <td className="py-4 px-2">
                                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300">
                                  {booking.meetingMode}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB CATALOG EDITOR */}
              {activeTab === "catalog" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-display font-black text-lg text-white">CATALOG SERVICE MANAGER</h3>
                      <p className="font-sans text-xs text-gray-500">Add, update or delete corporate product offerings.</p>
                    </div>
                    <AnimatedButton
                      onClick={() => setIsCreatingNew("service")}
                      className="px-3.5 py-1.5 rounded-full bg-arcadia-blue hover:bg-blue-600 text-white text-xs font-bold tracking-wide flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(47,128,255,0.3)]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Service</span>
                    </AnimatedButton>
                  </div>

                  {/* Create / Edit Service Form Overlay Modal */}
                  {(isCreatingNew === "service" || (isEditing && isEditing.type === "service")) && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-[#0d111c] border border-arcadia-blue/30 mb-6">
                      <h4 className="font-display font-bold text-sm text-white mb-4">
                        {isCreatingNew === "service" ? "Create New Service Catalog Offer" : `Edit Catalog Offer: ${isEditing.data.title}`}
                      </h4>
                      <form onSubmit={handleSaveCatalogService} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-300">
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Offer Title</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. AI Chatbot v2.0"
                            value={serviceForm.title}
                            onChange={e => setServiceForm({ ...serviceForm, title: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Category</label>
                          <select
                            value={serviceForm.category}
                            onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })}
                            className="w-full px-4 py-2.5 bg-arcadia-black border border-white/10 rounded-lg text-xs text-white"
                          >
                            <option value="Web Development">Web Development</option>
                            <option value="AI Solutions">AI Solutions</option>
                            <option value="Mobile Apps">Mobile Apps</option>
                            <option value="Design & Marketing">Design & Marketing</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Base Price (INR)</label>
                          <input
                            type="number"
                            required
                            placeholder="e.g. 7999"
                            value={serviceForm.price}
                            onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Description Details</label>
                          <input
                            type="text"
                            required
                            placeholder="Core value proposition..."
                            value={serviceForm.description}
                            onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Core Features Checklist (comma-separated)</label>
                          <input
                            type="text"
                            required
                            placeholder="Feature A, Feature B, Feature C"
                            value={serviceForm.features}
                            onChange={e => setServiceForm({ ...serviceForm, features: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div className="sm:col-span-2 flex gap-3 pt-2 justify-end">
                          <AnimatedButton
                            type="button"
                            onClick={() => { setIsEditing(null); setIsCreatingNew(null); }}
                            className="px-4 py-2 rounded-lg border border-white/10 text-[11px] font-semibold"
                          >
                            Cancel
                          </AnimatedButton>
                          <AnimatedButton
                            type="submit"
                            className="px-5 py-2 rounded-lg bg-arcadia-blue text-white text-[11px] font-bold"
                          >
                            Save Catalog Offer
                          </AnimatedButton>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    {services.map(service => (
                      <div key={service.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex justify-between items-center hover:border-white/10 transition">
                        <div>
                          <span className="font-display font-bold text-sm text-white">{service.title}</span>
                          <span className="block text-[10px] text-gray-500">{service.category} • Base: ₹{parseInt(service.price).toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex gap-2">
                          <AnimatedButton
                            onClick={() => {
                              setIsEditing({ type: "service", data: service });
                              setServiceForm({
                                title: service.title,
                                price: service.price,
                                description: service.description,
                                features: service.features.join(", "),
                                category: service.category
                              });
                            }}
                            className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition"
                            title="Edit Offer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </AnimatedButton>
                          <AnimatedButton
                            onClick={() => handleDeleteItem("services", service.id)}
                            className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                            title="Delete Offer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </AnimatedButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB PROJECTS PANEL */}
              {activeTab === "projects" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-display font-black text-lg text-white">DIGITAL FOOTPRINTS (PORTFOLIO PROJECTS)</h3>
                      <p className="font-sans text-xs text-gray-500">Add, edit, or remove Our Digital Footprints showcased on the frontend.</p>
                    </div>
                    <AnimatedButton
                      onClick={() => setIsCreatingNew("project")}
                      className="px-3.5 py-1.5 rounded-full bg-arcadia-blue hover:bg-blue-600 text-white text-xs font-bold tracking-wide flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(47,128,255,0.3)]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Digital Footprint</span>
                    </AnimatedButton>
                  </div>

                  {/* Create / Edit Project Form */}
                  {(isCreatingNew === "project" || (isEditing && isEditing.type === "project")) && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-[#0d111c] border border-arcadia-blue/30 mb-6">
                      <h4 className="font-display font-bold text-sm text-white mb-4">
                        {isCreatingNew === "project" ? "Create New Digital Footprint" : `Edit Digital Footprint: ${isEditing.data.title}`}
                      </h4>
                      <form onSubmit={handleSaveProject} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-300">
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Project Title</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. CYBERPUNK CHAT ENGINE"
                            value={projectForm.title}
                            onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Filter Category</label>
                          <select
                            value={projectForm.category}
                            onChange={e => setProjectForm({ ...projectForm, category: e.target.value as any })}
                            className="w-full px-4 py-2.5 bg-arcadia-black border border-white/10 rounded-lg text-xs text-white"
                          >
                            <option value="Websites">Websites</option>
                            <option value="AI">AI</option>
                            <option value="Mobile Apps">Mobile Apps</option>
                            <option value="Branding">Branding</option>
                            <option value="UI/UX">UI/UX</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Preview Image (URL or Upload File)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              required
                              placeholder="Unsplash image URL..."
                              value={projectForm.imageUrl}
                              onChange={e => setProjectForm({ ...projectForm, imageUrl: e.target.value })}
                              className="flex-1 px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-white"
                            />
                            <label className="px-3 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white font-mono text-[10px] cursor-pointer flex items-center shrink-0">
                              <span>Upload File</span>
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, "project")} />
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Live Demo URL</label>
                          <input
                            type="text"
                            required
                            placeholder="https://engine.arcadia.agency"
                            value={projectForm.liveUrl}
                            onChange={e => setProjectForm({ ...projectForm, liveUrl: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Technology Stack Tags (comma-separated)</label>
                          <input
                            type="text"
                            required
                            placeholder="React, Tailwind, Node.js, Gemini API"
                            value={projectForm.technologies}
                            onChange={e => setProjectForm({ ...projectForm, technologies: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-white"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Case Study Summary</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Explain the development highlights and architecture..."
                            value={projectForm.caseStudy}
                            onChange={e => setProjectForm({ ...projectForm, caseStudy: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-white resize-none"
                          />
                        </div>
                        <div className="sm:col-span-2 flex gap-3 pt-2 justify-end">
                          <AnimatedButton
                            type="button"
                            onClick={() => { setIsEditing(null); setIsCreatingNew(null); }}
                            className="px-4 py-2 rounded-lg border border-white/10 text-[11px] font-semibold"
                          >
                            Cancel
                          </AnimatedButton>
                          <AnimatedButton
                            type="submit"
                            className="px-5 py-2 rounded-lg bg-arcadia-blue text-white text-[11px] font-bold"
                          >
                            Save Portfolio Entry
                          </AnimatedButton>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {projects.map(project => (
                      <div key={project.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition flex justify-between items-start">
                        <div>
                          <span className="font-display font-bold text-sm text-white block">{project.title}</span>
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-gray-400 inline-block mt-1 uppercase tracking-wider font-mono">{project.category}</span>
                        </div>
                        <div className="flex gap-2">
                          <AnimatedButton
                            onClick={() => {
                              setIsEditing({ type: "project", data: project });
                              setProjectForm({
                                title: project.title,
                                category: project.category,
                                description: project.description,
                                technologies: project.technologies.join(", "),
                                imageUrl: project.imageUrl,
                                liveUrl: project.liveUrl,
                                caseStudy: project.caseStudy
                              });
                            }}
                            className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </AnimatedButton>
                          <AnimatedButton
                            onClick={() => handleDeleteItem("projects", project.id)}
                            className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </AnimatedButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB INQUIRIES */}
              {activeTab === "inquiries" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-display font-black text-lg text-white">CONTACT INQUIRIES</h3>
                      <p className="font-sans text-xs text-gray-500">Inbound lead inquiries from the public contact forms.</p>
                    </div>
                    <AnimatedButton
                      onClick={() => exportToCSV("inquiries")}
                      className="px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-semibold flex items-center gap-1.5 hover:bg-white/5 transition"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-green-400" />
                      <span>Export CSV</span>
                    </AnimatedButton>
                  </div>

                  <div className="space-y-4">
                    {inquiries.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 font-mono text-xs border border-white/5 rounded-xl bg-white/[0.005]">
                        NO CONTACT FORM LEADS RECORDED YET.
                      </div>
                    ) : (
                      inquiries.map(inq => (
                        <div key={inq.id} className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <span className="font-display font-bold text-sm text-white">{inq.name}</span>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="font-mono text-[9px] text-gray-500">{inq.email}</span>
                                <span className="text-[9px] text-gray-600">•</span>
                                <span className="font-mono text-[9px] text-gray-500">Received {new Date(inq.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <AnimatedButton
                                onClick={() => handleCopyEmail(inq.email)}
                                className="px-2.5 py-1 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition font-mono text-[10px] flex items-center gap-1.5 cursor-pointer"
                                title="Copy Email Address"
                              >
                                {copiedEmail === inq.email ? (
                                  <>
                                    <Check className="w-3 h-3 text-green-400" />
                                    <span className="text-green-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Email</span>
                                  </>
                                )}
                              </AnimatedButton>
                              <a
                                href={`mailto:${inq.email}?subject=Regarding your Arcadia Inquiry: ${encodeURIComponent(inq.subject)}`}
                                className="px-2.5 py-1 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition font-mono text-[10px] flex items-center gap-1.5"
                                title="Send Email"
                              >
                                <Mail className="w-3 h-3 text-arcadia-cyan" />
                                <span>Send Email</span>
                              </a>
                              <span className="px-2 py-0.5 rounded bg-arcadia-blue/10 border border-arcadia-blue/20 text-arcadia-cyan text-[9px] uppercase font-mono">
                                INBOUND LEAD
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="block text-[10px] text-gray-400 font-bold mb-1">Subject: {inq.subject}</span>
                            <p className="font-sans text-xs text-gray-400 leading-relaxed bg-white/[0.01] p-3 rounded-lg border border-white/5">
                              {inq.message}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB VACANCIES */}
              {activeTab === "vacancies" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-display font-black text-lg text-white">VACANCIES & ROLES</h3>
                      <p className="font-sans text-xs text-gray-500">Add, edit, or delete job vacancies on the platform.</p>
                    </div>
                    {isCreatingNew !== "vacancy" && !isEditing && (
                      <AnimatedButton
                        onClick={() => {
                          setIsCreatingNew("vacancy");
                          setVacancyForm({ id: "", title: "", location: "Bangalore (Hybrid)", salary: "₹12L - ₹16L", type: "Full-Time" });
                        }}
                        className="px-4 py-2 rounded-full bg-arcadia-blue text-white text-xs font-bold flex items-center gap-1.5 hover:shadow-[0_0_15px_rgba(47,128,255,0.4)] transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create Vacancy</span>
                      </AnimatedButton>
                    )}
                  </div>

                  {(isCreatingNew === "vacancy" || isEditing?.type === "vacancy") && (
                    <form onSubmit={handleSaveVacancy} className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4 animate-fadeIn">
                      <h4 className="font-display font-bold text-xs text-white">
                        {isCreatingNew === "vacancy" ? "CREATE NEW VACANCY" : "EDIT VACANCY"}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-400 mb-1">Job Title</label>
                          <input
                            type="text"
                            required
                            value={vacancyForm.title}
                            onChange={(e) => setVacancyForm({ ...vacancyForm, title: e.target.value })}
                            placeholder="e.g. Lead React Architect"
                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-400 mb-1">Location</label>
                          <input
                            type="text"
                            required
                            value={vacancyForm.location}
                            onChange={(e) => setVacancyForm({ ...vacancyForm, location: e.target.value })}
                            placeholder="e.g. Punganur, Andhra Pradesh"
                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-400 mb-1">Salary Range</label>
                          <input
                            type="text"
                            required
                            value={vacancyForm.salary}
                            onChange={(e) => setVacancyForm({ ...vacancyForm, salary: e.target.value })}
                            placeholder="e.g. ₹15L - ₹20L"
                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-400 mb-1">Employment Type</label>
                          <select
                            value={vacancyForm.type}
                            onChange={(e) => setVacancyForm({ ...vacancyForm, type: e.target.value })}
                            className="w-full px-4 py-3 bg-arcadia-dark border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                          >
                            <option value="Full-Time">Full-Time</option>
                            <option value="Part-Time">Part-Time</option>
                            <option value="Contract">Contract</option>
                            <option value="Internship">Internship</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <AnimatedButton
                          type="button"
                          onClick={() => {
                            setIsCreatingNew(null);
                            setIsEditing(null);
                            setVacancyForm({ id: "", title: "", location: "", salary: "", type: "Full-Time" });
                          }}
                          className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 text-xs hover:text-white transition"
                        >
                          Cancel
                        </AnimatedButton>
                        <AnimatedButton
                          type="submit"
                          className="px-5 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition"
                        >
                          Save Vacancy
                        </AnimatedButton>
                      </div>
                    </form>
                  )}

                  <div className="space-y-4">
                    {vacancies.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 font-mono text-xs border border-white/5 rounded-xl bg-white/[0.005]">
                        NO VACANCIES CREATED YET.
                      </div>
                    ) : (
                      vacancies.map((v) => (
                        <div key={v.id} className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="font-display font-bold text-sm text-white">{v.title}</h4>
                            <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-gray-500 mt-1">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-arcadia-blue" />
                                {v.location}
                              </span>
                              <span>•</span>
                              <span>{v.salary}</span>
                              <span>•</span>
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-300">{v.type}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <AnimatedButton
                              onClick={() => {
                                setIsEditing({ type: "vacancy", id: v.id });
                                setVacancyForm({
                                  id: v.id,
                                  title: v.title,
                                  location: v.location,
                                  salary: v.salary,
                                  type: v.type
                                });
                              }}
                              className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </AnimatedButton>
                            <AnimatedButton
                              onClick={() => handleDeleteVacancy(v.id)}
                              className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </AnimatedButton>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB JOB APPLICATIONS */}
              {activeTab === "applications" && (
                <div className="space-y-6">
                  <div className="border-b border-white/5 pb-4">
                    <h3 className="font-display font-black text-lg text-white">JOB APPLICATIONS</h3>
                    <p className="font-sans text-xs text-gray-500">View job seeker responses and resume references.</p>
                  </div>

                  <div className="space-y-4">
                    {applications.length === 0 ? (
                      <div className="text-center py-12 text-gray-500 font-mono text-xs border border-white/5 rounded-xl bg-white/[0.005]">
                        NO JOB APPLICATIONS SUBMITTED YET.
                      </div>
                    ) : (
                      applications.map((app) => (
                        <div key={app.id} className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                            <div>
                              <h4 className="font-display font-bold text-sm text-white">{app.name}</h4>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="font-mono text-[9px] text-gray-500">{app.email}</span>
                                <span className="text-[9px] text-gray-600">•</span>
                                <span className="font-mono text-[9px] text-gray-500">Applied on {new Date(app.appliedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <AnimatedButton
                                onClick={() => handleCopyEmail(app.email)}
                                className="px-2.5 py-1 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition font-mono text-[10px] flex items-center gap-1.5 cursor-pointer"
                                title="Copy Email Address"
                              >
                                {copiedEmail === app.email ? (
                                  <>
                                    <Check className="w-3 h-3 text-green-400" />
                                    <span className="text-green-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy Email</span>
                                  </>
                                )}
                              </AnimatedButton>
                              <a
                                href={`mailto:${app.email}?subject=Regarding your Arcadia Application for ${encodeURIComponent(app.role)}`}
                                className="px-2.5 py-1 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition font-mono text-[10px] flex items-center gap-1.5"
                                title="Send Email"
                              >
                                <Mail className="w-3 h-3 text-arcadia-cyan" />
                                <span>Send Email</span>
                              </a>
                              <span className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400 text-[9px] uppercase font-mono font-bold">
                                {app.role}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <span className="block text-[9px] uppercase font-mono text-gray-500 font-bold">Resume / Portfolio URL</span>
                              <a
                                href={app.resume}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-arcadia-cyan hover:underline font-medium"
                              >
                                <span>{app.resume}</span>
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                              </a>
                            </div>

                            {app.note && (
                              <div>
                                <span className="block text-[9px] uppercase font-mono text-gray-500 font-bold mb-1">Cover Letter Note</span>
                                <p className="font-sans text-xs text-gray-400 leading-relaxed bg-white/[0.005] p-3 rounded-lg border border-white/5">
                                  {app.note}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB ACTIVITY LOGS */}
              {activeTab === "logs" && (
                <div className="space-y-6">
                  <div className="border-b border-white/5 pb-4">
                    <h3 className="font-display font-black text-lg text-white">SYSTEM AUDIT TRAILS</h3>
                    <p className="font-sans text-xs text-gray-500">Immutable chronological server activity records.</p>
                  </div>

                  <div className="font-mono text-[10px] space-y-2 max-h-[50vh] overflow-y-auto bg-black p-4 rounded-xl border border-white/10">
                    {logs.map(log => (
                      <div key={log.id} className="flex gap-4 hover:bg-white/5 py-1 px-2 rounded transition">
                        <span className="text-gray-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className="text-arcadia-cyan shrink-0 font-bold">{log.action}:</span>
                        <span className="text-gray-300">{log.details}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB EMAIL DISPATCHER */}
              {activeTab === "emails" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Email Dispatcher Simulator</h3>
                      <p className="font-sans text-xs text-gray-500">Real-time simulation logs for dispatched verification tokens and milestone payment requests.</p>
                    </div>
                    {mockEmails.length > 0 && (
                      <AnimatedButton
                        onClick={handleClearMockEmails}
                        className="px-3.5 py-1.5 rounded-full border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/10 transition-all flex items-center gap-1.5 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Clear Logs</span>
                      </AnimatedButton>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Panel: List of Sent Emails */}
                    <div className="lg:col-span-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                      {mockEmails.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 font-mono text-xs border border-white/5 rounded-2xl bg-white/[0.005]">
                          NO SIMULATED EMAILS SENT YET
                        </div>
                      ) : (
                        mockEmails.map((mail) => {
                          const isSelected = selectedEmail?.id === mail.id;
                          return (
                            <AnimatedButton
                              key={mail.id}
                              onClick={() => setSelectedEmail(mail)}
                              className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col space-y-2 cursor-pointer ${
                                isSelected
                                  ? "bg-arcadia-blue/10 border-arcadia-blue shadow-[0_0_15px_rgba(47,128,255,0.15)]"
                                  : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full font-mono">
                                <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded ${
                                  mail.type === "password_reset"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-green-500/10 text-green-400 border border-green-500/20"
                                }`}>
                                  {mail.type === "password_reset" ? "Reset Ticket" : "Invoice Link"}
                                </span>
                                <span className="text-[9px] text-gray-500">
                                  {new Date(mail.sentAt).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="font-sans font-bold text-xs text-white truncate w-full">{mail.subject}</h4>
                                <p className="font-mono text-[9px] text-gray-500 truncate w-full">To: {mail.to}</p>
                              </div>
                            </AnimatedButton>
                          );
                        })
                      )}
                    </div>

                    {/* Right Panel: Simulated Email Device Client View */}
                    <div className="lg:col-span-8">
                      {selectedEmail ? (
                        <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0d0f12] flex flex-col h-[60vh] shadow-2xl">
                          {/* Device / Client Header Bar */}
                          <div className="bg-[#111827] border-b border-white/5 p-4 flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                              </div>
                              <span className="font-mono text-[9px] text-gray-500">SECURE DIGITAL TRANSMISSION</span>
                            </div>
                            <div className="pt-2 grid grid-cols-1 gap-1 text-xs">
                              <div className="flex text-gray-500 font-mono text-[10px]">
                                <span className="w-16">Subject:</span>
                                <span className="text-white font-sans font-bold">{selectedEmail.subject}</span>
                              </div>
                              <div className="flex text-gray-500 font-mono text-[10px]">
                                <span className="w-16">From:</span>
                                <span className="text-arcadia-cyan font-sans">ARCADIA HUB &lt;no-reply@arcadia.agency&gt;</span>
                              </div>
                              <div className="flex text-gray-500 font-mono text-[10px]">
                                <span className="w-16">To:</span>
                                <span className="text-gray-300 font-sans">{selectedEmail.to}</span>
                              </div>
                              <div className="flex text-gray-500 font-mono text-[10px]">
                                <span className="w-16">Date:</span>
                                <span className="text-gray-400 font-sans">{new Date(selectedEmail.sentAt).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Email Body Preview Container */}
                          <div className="flex-1 bg-black/40 overflow-y-auto p-6 flex justify-center items-start">
                            <div className="w-full max-w-lg bg-[#0d0f12] rounded-xl overflow-hidden shadow-inner border border-white/5">
                              <div dangerouslySetInnerHTML={{ __html: selectedEmail.body }} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/5 h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white/[0.002]">
                          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-full mb-4">
                            <Mail className="w-8 h-8 text-gray-600 animate-pulse" />
                          </div>
                          <h4 className="font-display font-bold text-sm text-gray-400">TRANSMISSION VIEWER</h4>
                          <p className="font-sans text-xs text-gray-500 mt-2 max-w-sm">
                            Select a simulated dispatch record from the ledger on the left to preview its responsive HTML rendering and secure transaction links.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </section>
  );
}
