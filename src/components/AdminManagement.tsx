import React, { useState, useEffect } from "react";
import { 
  Users, UserPlus, Search, Shield, Key, Trash2, Edit2, 
  ShieldAlert, ShieldCheck, FileText, Activity, Bell, Info, 
  X, Check, Lock, ChevronLeft, ChevronRight, Eye, EyeOff, 
  Briefcase, Mail, Phone, Calendar, User, Database, Settings
} from "lucide-react";
import AnimatedButton from "./ui/animated-button";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  avatar: string;
  role: string;
  department: string;
  permissions: string[];
  bio: string;
  status: "active" | "suspended";
  lastLogin: string;
  createdBy: string;
  createdAt: string;
  activeSessions: number;
}

interface AdminActivity {
  id: string;
  userId: string;
  email: string;
  timestamp: string;
  action: string;
  status: string;
  ip: string;
  device: string;
  browser: string;
  userAgent: string;
  details: string;
}

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface AdminManagementProps {
  token: string | null;
  currentUserEmail: string | null;
  onShowToast: (type: "success" | "info" | "error", msg: string) => void;
}

const AVAILABLE_PERMISSIONS = [
  { id: "users", name: "Users Management", group: "Core" },
  { id: "products", name: "Products Management", group: "Catalog" },
  { id: "services", name: "Services Management", group: "Catalog" },
  { id: "orders", name: "Orders Control", group: "Finance" },
  { id: "bookings", name: "Demo Bookings", group: "Scheduling" },
  { id: "portfolio", name: "Portfolio Editor", group: "Content" },
  { id: "blog", name: "Blog Posts", group: "Content" },
  { id: "seo", name: "SEO Optimization", group: "Marketing" },
  { id: "analytics", name: "Analytics & Traffic", group: "Reporting" },
  { id: "homepage", name: "Homepage Builder", group: "Content" },
  { id: "settings", name: "Global Settings", group: "System" },
  { id: "reports", name: "Financial Reports", group: "Reporting" },
  { id: "notifications", name: "System Alerts", group: "System" },
  { id: "media_library", name: "Media Assets", group: "Content" },
  { id: "roles", name: "RBAC Controls", group: "System" },
  { id: "admins", name: "Admin Management", group: "System" }
];

const DEPARTMENTS = [
  "Executive Board", "Operations", "Engineering", "Design & UX", 
  "Product Management", "Marketing", "Finance", "Human Resources"
];

export default function AdminManagement({ token, currentUserEmail, onShowToast }: AdminManagementProps) {
  // Lists
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // UI state
  const [activeSubTab, setActiveSubTab] = useState<"admins" | "activity" | "audit" | "notifications">("admins");
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [viewingProfile, setViewingProfile] = useState<AdminUser | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState<AdminUser | null>(null);

  // Form State - Add/Edit Admin
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "Staff",
    department: "Operations",
    bio: "",
    avatar: "",
    permissions: [] as string[]
  });
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Form State - Reset Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"name" | "email" | "role" | "createdAt" | "lastLogin">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Initialize
  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const headers = { "Authorization": `Bearer ${token}` };
      const [adminsRes, actRes, notifRes, auditRes] = await Promise.all([
        fetch("/api/admin/admins", { headers }),
        fetch("/api/admin/admins/activity", { headers }),
        fetch("/api/admin/admins/notifications", { headers }),
        fetch("/api/logs", { headers }) // Reuses existing general audit logs
      ]);

      if (adminsRes.ok) setAdmins(await adminsRes.ok ? await adminsRes.json() : []);
      if (actRes.ok) setActivities(await actRes.ok ? await actRes.json() : []);
      if (notifRes.ok) setNotifications(await notifRes.ok ? await notifRes.json() : []);
      if (auditRes.ok) {
        const rawAudits = await auditRes.json();
        // Filter out admin-related audits
        setAuditLogs(rawAudits);
      }
    } catch (err) {
      console.error("Failed to load admin management data", err);
      onShowToast("error", "Failed to retrieve administrative records.");
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength check
  const checkPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    setPasswordStrength(score);
  };

  // Handle open add modal
  const handleOpenAddAdmin = () => {
    setEditingAdmin(null);
    setAdminForm({
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "Staff",
      department: "Operations",
      bio: "",
      avatar: "",
      permissions: ["services", "bookings", "orders", "blog"] // default Staff permissions
    });
    setPasswordStrength(0);
    setIsAdminModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEditAdmin = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setAdminForm({
      name: admin.name,
      email: admin.email,
      phone: admin.phone || "",
      password: "",
      confirmPassword: "",
      role: admin.role,
      department: admin.department || "Operations",
      bio: admin.bio || "",
      avatar: admin.avatar || "",
      permissions: admin.permissions || []
    });
    setIsAdminModalOpen(true);
  };

  // Role based permission presets
  const handleRolePresetSelect = (roleName: string) => {
    let perms: string[] = [];
    if (roleName === "Super Admin") {
      perms = AVAILABLE_PERMISSIONS.map(p => p.id);
    } else if (roleName === "Admin") {
      perms = AVAILABLE_PERMISSIONS.filter(p => p.id !== "roles" && p.id !== "admins").map(p => p.id);
    } else if (roleName === "Manager") {
      perms = ["products", "services", "orders", "bookings", "portfolio", "blog", "analytics", "reports", "notifications", "media_library"];
    } else {
      perms = ["services", "bookings", "orders", "blog"];
    }
    setAdminForm(prev => ({ ...prev, role: roleName, permissions: perms }));
  };

  // Toggle single permission
  const handleTogglePermission = (permId: string) => {
    setAdminForm(prev => {
      const perms = prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: perms };
    });
  };

  // Toggle group permissions
  const handleToggleGroupPermissions = (groupName: string, checkAll: boolean) => {
    const groupPerms = AVAILABLE_PERMISSIONS.filter(p => p.group === groupName).map(p => p.id);
    setAdminForm(prev => {
      let nextPerms = [...prev.permissions];
      if (checkAll) {
        // Add all in group
        groupPerms.forEach(id => {
          if (!nextPerms.includes(id)) nextPerms.push(id);
        });
      } else {
        // Remove all in group
        nextPerms = nextPerms.filter(id => !groupPerms.includes(id));
      }
      return { ...prev, permissions: nextPerms };
    });
  };

  // Create or Update Admin submit
  const handleAdminFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!adminForm.name.trim() || !adminForm.email.trim()) {
      onShowToast("error", "Name and Email are required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminForm.email)) {
      onShowToast("error", "Invalid email formatting.");
      return;
    }

    if (adminForm.phone && !/^\+?[0-9\s\-()]{7,15}$/.test(adminForm.phone)) {
      onShowToast("error", "Invalid phone number formatting.");
      return;
    }

    if (!editingAdmin) {
      // Creation requirements
      if (!adminForm.password) {
        onShowToast("error", "Initial password is required.");
        return;
      }
      if (adminForm.password !== adminForm.confirmPassword) {
        onShowToast("error", "Passwords do not match.");
        return;
      }
      if (passwordStrength < 3) {
        onShowToast("error", "Password is too weak. Please include letters, numbers, and uppercase.");
        return;
      }
    }

    setIsLoading(true);
    try {
      const url = editingAdmin ? `/api/admin/admins/${editingAdmin.id}` : "/api/admin/admins";
      const method = editingAdmin ? "PUT" : "POST";
      const payload = editingAdmin 
        ? {
            name: adminForm.name,
            phone: adminForm.phone,
            role: adminForm.role,
            department: adminForm.department,
            permissions: adminForm.permissions,
            avatar: adminForm.avatar,
            bio: adminForm.bio
          }
        : {
            ...adminForm
          };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        onShowToast("success", editingAdmin ? "Administrator profile updated!" : "New administrator created successfully.");
        setIsAdminModalOpen(false);
        loadData();
      } else {
        onShowToast("error", data.error || "Failed to save administrator.");
      }
    } catch (err) {
      onShowToast("error", "Network connection failure.");
    } finally {
      setIsLoading(false);
    }
  };

  // Suspend/Activate Admin
  const handleToggleSuspend = async (admin: AdminUser) => {
    const isSuspended = admin.status === "suspended";
    const promptMsg = isSuspended 
      ? `Are you sure you want to activate the account for ${admin.name}?`
      : `Are you sure you want to suspend the account for ${admin.name}? They will lose immediate access and their active sessions will be revoked.`;
    
    if (!window.confirm(promptMsg)) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ suspended: !isSuspended })
      });

      const data = await res.json();
      if (res.ok) {
        onShowToast("success", isSuspended ? "Administrator reactivated!" : "Administrator suspended and sessions revoked.");
        loadData();
      } else {
        onShowToast("error", data.error || "Operation failed.");
      }
    } catch (err) {
      onShowToast("error", "Server communication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete Admin
  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (admin.email === currentUserEmail) {
      onShowToast("error", "You cannot delete your own Super Admin account!");
      return;
    }

    const promptMsg = `CRITICAL WARNING: You are about to permanently delete the administrator account for ${admin.name} (${admin.email}). This will delete their Firebase Auth user and Firestore credentials. This action is irreversible.\n\nType DELETE to confirm:`;
    const confirmation = window.prompt(promptMsg);
    if (confirmation !== "DELETE") {
      onShowToast("info", "Deletion cancelled.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        onShowToast("success", "Administrator account permanently purged.");
        loadData();
      } else {
        onShowToast("error", data.error || "Deletion failed.");
      }
    } catch (err) {
      onShowToast("error", "Failed to contact database server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Force Password Reset submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;

    if (newPassword !== confirmNewPassword) {
      onShowToast("error", "Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      onShowToast("error", "Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/admins/${resettingUser.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        onShowToast("success", `Password successfully forced for ${resettingUser.name}. Any active sessions have been revoked.`);
        setIsResetPasswordOpen(false);
        setNewPassword("");
        setConfirmNewPassword("");
        loadData();
      } else {
        onShowToast("error", data.error || "Failed to force password reset.");
      }
    } catch (err) {
      onShowToast("error", "Network error.");
    } finally {
      setIsLoading(false);
    }
  };

  // Dispatched email instructions
  const handleDispatchResetInstructions = async (admin: AdminUser) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/admins/${admin.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({}) // Empty body triggers link generation
      });

      const data = await res.json();
      if (res.ok) {
        onShowToast("success", `Dispatched password reset instructions for ${admin.email}!`);
        if (data.link) {
          console.log("[Password Reset Link Dispatched]:", data.link);
        }
        loadData();
      } else {
        onShowToast("error", data.error || "Failed to send link.");
      }
    } catch (err) {
      onShowToast("error", "Server communication failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // Terminate dynamic session
  const handleTerminateSession = async (activity: AdminActivity) => {
    if (!window.confirm(`Force terminate active session for ${activity.email} from IP ${activity.ip}?`)) return;
    
    setIsLoading(true);
    try {
      // Updates status / revokes Firebase refresh tokens
      const res = await fetch(`/api/admin/admins/${activity.userId}/suspend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ suspended: false }) // forces claims/session revocation refresh
      });

      if (res.ok) {
        onShowToast("success", "Active sessions and refresh tokens successfully revoked.");
        loadData();
      } else {
        onShowToast("error", "Failed to terminate session.");
      }
    } catch (err) {
      onShowToast("error", "Network failure.");
    } finally {
      setIsLoading(false);
    }
  };

  // Notifications mark read
  const handleMarkNotificationsRead = async (id?: string) => {
    try {
      const res = await fetch("/api/admin/admins/notifications/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(id ? { id } : { all: true })
      });

      if (res.ok) {
        onShowToast("success", id ? "Alert acknowledged." : "All alerts marked as read.");
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Sort & Filter Admins List
  const filteredAdmins = admins.filter(admin => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q || 
      admin.name.toLowerCase().includes(q) || 
      admin.email.toLowerCase().includes(q) || 
      (admin.phone || "").includes(q) ||
      (admin.department || "").toLowerCase().includes(q);

    const matchesRole = roleFilter === "All" || admin.role === roleFilter;
    const matchesStatus = statusFilter === "All" || admin.status === statusFilter;
    const matchesDept = deptFilter === "All" || admin.department === deptFilter;

    return matchesSearch && matchesRole && matchesStatus && matchesDept;
  }).sort((a, b) => {
    let fieldA = a[sortBy] || "";
    let fieldB = b[sortBy] || "";
    
    if (typeof fieldA === "string") fieldA = fieldA.toLowerCase();
    if (typeof fieldB === "string") fieldB = fieldB.toLowerCase();

    if (fieldA < fieldB) return sortOrder === "asc" ? -1 : 1;
    if (fieldA > fieldB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination bounds
  const totalItems = filteredAdmins.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAdmins = filteredAdmins.slice(startIndex, startIndex + itemsPerPage);

  const getRoleBadgeClass = (roleStr: string) => {
    switch (roleStr) {
      case "Super Admin":
        return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "Admin":
        return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      case "Manager":
        return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
      default:
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    }
  };

  const getStatusBadgeClass = (statusStr: string) => {
    return statusStr === "active"
      ? "bg-green-500/10 text-green-400 border border-green-500/20"
      : "bg-red-500/10 text-red-400 border border-red-500/20";
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      
      {/* 1. Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h3 className="font-display font-black text-xl text-white tracking-wide flex items-center gap-2.5">
            <Users className="w-5 h-5 text-arcadia-blue animate-pulse" />
            ADMINISTRATOR MANAGEMENT
          </h3>
          <p className="font-sans text-xs text-gray-500 mt-1">
            Assign security roles, toggle micro-permissions, force resets, and monitor admin activity ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications Trigger Alert Badge */}
          <AnimatedButton
            onClick={() => setActiveSubTab("notifications")}
            className="relative p-2.5 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 text-white font-mono text-[9px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {unreadNotificationsCount}
              </span>
            )}
          </AnimatedButton>

          <AnimatedButton
            onClick={handleOpenAddAdmin}
            className="px-4 py-2.5 rounded-xl bg-arcadia-blue text-white font-display text-xs font-bold tracking-wider uppercase hover:shadow-[0_0_20px_rgba(47,128,255,0.4)] transition duration-300 flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Create Admin
          </AnimatedButton>
        </div>
      </div>

      {/* 2. Sub Tabs Navigation */}
      <div className="flex border-b border-white/5 gap-2">
        <button
          onClick={() => { setActiveSubTab("admins"); setCurrentPage(1); }}
          className={`px-4 py-2.5 font-display text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === "admins" ? "border-arcadia-blue text-white" : "border-transparent text-gray-500 hover:text-white"
          }`}
        >
          Administrators ({admins.length})
        </button>
        <button
          onClick={() => setActiveSubTab("activity")}
          className={`px-4 py-2.5 font-display text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === "activity" ? "border-arcadia-blue text-white" : "border-transparent text-gray-500 hover:text-white"
          }`}
        >
          Login Activity
        </button>
        <button
          onClick={() => setActiveSubTab("audit")}
          className={`px-4 py-2.5 font-display text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeSubTab === "audit" ? "border-arcadia-blue text-white" : "border-transparent text-gray-500 hover:text-white"
          }`}
        >
          Audit Ledger
        </button>
        <button
          onClick={() => setActiveSubTab("notifications")}
          className={`px-4 py-2.5 font-display text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "notifications" ? "border-arcadia-blue text-white" : "border-transparent text-gray-500 hover:text-white"
          }`}
        >
          Security Alerts
          {unreadNotificationsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          )}
        </button>
      </div>

      {/* 3. Tab Workspaces */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-arcadia-blue border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">Querying Cloud Records...</p>
        </div>
      )}

      {!isLoading && activeSubTab === "admins" && (
        <div className="space-y-4">
          
          {/* Controls Bar (Search + Filters + Sorting) */}
          <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            
            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search administrators name, email, department..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-[#090a0f] border border-white/5 hover:border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue focus:ring-1 focus:ring-arcadia-blue/30 transition font-sans"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Role filter */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-gray-500 uppercase">Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-[#090a0f] border border-white/5 hover:border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] font-sans text-gray-300 cursor-pointer outline-none transition"
                >
                  <option value="All">All Roles</option>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>

              {/* Department filter */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-gray-500 uppercase">Dept:</span>
                <select
                  value={deptFilter}
                  onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-[#090a0f] border border-white/5 hover:border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] font-sans text-gray-300 cursor-pointer outline-none transition"
                >
                  <option value="All">All Departments</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-gray-500 uppercase">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-[#090a0f] border border-white/5 hover:border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] font-sans text-gray-300 cursor-pointer outline-none transition"
                >
                  <option value="All">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                </select>
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-gray-500 uppercase">Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[#090a0f] border border-white/5 hover:border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] font-sans text-gray-300 cursor-pointer outline-none transition"
                >
                  <option value="name">Name</option>
                  <option value="email">Email</option>
                  <option value="role">Role</option>
                  <option value="createdAt">Date Created</option>
                  <option value="lastLogin">Last Active</option>
                </select>
                <button
                  onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                  className="p-1.5 rounded-lg bg-[#090a0f] border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition text-xs"
                >
                  {sortOrder === "asc" ? "▲" : "▼"}
                </button>
              </div>
            </div>

          </div>

          {/* Directory Table Grid / List view */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Profile / Name</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Email Address</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Role Badge</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Department</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Last Login</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {paginatedAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-gray-500 font-mono text-xs">
                        No matching administrators found.
                      </td>
                    </tr>
                  ) : (
                    paginatedAdmins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-white/[0.01] transition-all">
                        {/* Profile Info */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={admin.avatar}
                              alt={admin.name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-xl object-cover border border-white/10"
                            />
                            <div>
                              <div className="font-sans font-bold text-xs text-white flex items-center gap-1.5">
                                {admin.name}
                                {admin.email === currentUserEmail && (
                                  <span className="text-[8px] font-mono font-bold bg-arcadia-blue/20 text-arcadia-blue px-1.5 py-0.5 rounded uppercase">You</span>
                                )}
                              </div>
                              <div className="font-mono text-[9px] text-gray-500 mt-0.5">ID: {admin.id.substring(0, 10)}...</div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-5 py-4 font-mono text-xs text-gray-400">
                          {admin.email}
                        </td>

                        {/* Role */}
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full font-sans text-[10px] font-semibold ${getRoleBadgeClass(admin.role)}`}>
                            {admin.role}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="px-5 py-4 font-sans text-xs text-gray-300">
                          {admin.department || "Operations"}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${getStatusBadgeClass(admin.status)} flex items-center gap-1 w-fit`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${admin.status === "active" ? "bg-green-400" : "bg-red-400 animate-ping"}`} />
                            {admin.status}
                          </span>
                        </td>

                        {/* Last Login */}
                        <td className="px-5 py-4 font-mono text-[10px] text-gray-400">
                          {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : "Never"}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* View Info */}
                            <button
                              onClick={() => setViewingProfile(admin)}
                              title="View Admin Profile"
                              className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEditAdmin(admin)}
                              title="Edit Credentials"
                              className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => {
                                setResettingUser(admin);
                                setNewPassword("");
                                setConfirmNewPassword("");
                                setIsResetPasswordOpen(true);
                              }}
                              title="Force Password Reset"
                              className="p-1.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 text-amber-400 hover:text-amber-300 transition cursor-pointer"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            {/* Toggle Suspend */}
                            <button
                              onClick={() => handleToggleSuspend(admin)}
                              disabled={admin.role === "Super Admin"}
                              title={admin.status === "active" ? "Suspend Admin" : "Reactivate Admin"}
                              className={`p-1.5 rounded-lg border transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                                admin.status === "active"
                                  ? "bg-red-500/5 border-red-500/10 text-red-400 hover:bg-red-500/15"
                                  : "bg-green-500/5 border-green-500/10 text-green-400 hover:bg-green-500/15"
                              }`}
                            >
                              {admin.status === "active" ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                            </button>

                            {/* Purge Delete */}
                            <button
                              onClick={() => handleDeleteAdmin(admin)}
                              disabled={admin.email === currentUserEmail}
                              title="Permanently Purge Account"
                              className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/5">
              <div className="font-mono text-[10px] text-gray-500 uppercase">
                Displaying {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} items
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs text-white px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 3.2 Login Activity Workspace */}
      {(!isLoading && activeSubTab === "activity") && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Timestamp</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Admin Email</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Action Event</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">IP Address</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Device / Browser</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400 text-right">Session</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-gray-500 font-mono text-xs">
                        No active login sessions recorded.
                      </td>
                    </tr>
                  ) : (
                    activities.slice(0, 100).map((act) => (
                      <tr key={act.id} className="hover:bg-white/[0.01] transition">
                        <td className="px-5 py-3 font-mono text-[10px] text-gray-400">
                          {new Date(act.timestamp).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-white font-semibold">
                          {act.email}
                        </td>
                        <td className="px-5 py-3 font-sans text-xs text-gray-200">
                          {act.action === "login" ? "🔑 Session Established" : act.action === "logout" ? "🚪 Graceful Exit" : "⚠️ Unauthorized / Failed"}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-arcadia-cyan">
                          {act.ip}
                        </td>
                        <td className="px-5 py-3 font-sans text-xs text-gray-300">
                          {act.device} ({act.browser})
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${act.status === "Success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                            {act.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {act.action === "login" && (
                            <button
                              onClick={() => handleTerminateSession(act)}
                              className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-display text-[9px] font-bold uppercase transition tracking-wider cursor-pointer"
                            >
                              Terminate
                            </button>
                          )}
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

      {/* 3.3 Audit Ledger Workspace */}
      {(!isLoading && activeSubTab === "audit") && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
            <p className="font-sans text-xs text-gray-500">
              Read-only immutable operational ledgers synchronized directly with security locks.
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Timestamp</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Actor ID</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Role</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Action Log</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Target Module</th>
                    <th className="px-5 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">System Trace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-500 font-mono text-xs">
                        No administrative audit logs currently recorded.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.slice(0, 100).map((log, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.01] transition text-xs">
                        <td className="px-5 py-3 font-mono text-[10px] text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-5 py-3 font-mono text-gray-300">
                          {log.userId || log.email || "System"}
                        </td>
                        <td className="px-5 py-3">
                          <span className="px-1.5 py-0.5 bg-white/5 text-gray-400 font-mono text-[10px] rounded uppercase">
                            {log.role || "Guest"}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-sans font-semibold text-white">
                          {log.action}
                        </td>
                        <td className="px-5 py-3 font-mono text-arcadia-cyan text-[11px]">
                          {log.resourceAffected || "Core"}
                        </td>
                        <td className="px-5 py-3 font-mono text-[10px] text-gray-500 truncate max-w-xs" title={log.details}>
                          {log.details}
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

      {/* 3.4 Alerts / Notifications Workspace */}
      {(!isLoading && activeSubTab === "notifications") && (
        <div className="space-y-4">
          <div className="flex justify-between items-center p-2">
            <h4 className="font-display font-bold text-xs text-gray-400 uppercase tracking-wider">SYSTEM SECURITY WARNINGS</h4>
            {unreadNotificationsCount > 0 && (
              <button
                onClick={() => handleMarkNotificationsRead()}
                className="font-display text-xs text-arcadia-blue hover:text-white font-bold transition cursor-pointer"
              >
                Clear All Alerts
              </button>
            )}
          </div>

          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="p-8 rounded-2xl border border-white/5 text-center text-gray-500 font-mono text-xs">
                No active system alerts detected.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                    notif.read 
                      ? "bg-white/[0.01] border-white/5 opacity-60" 
                      : "bg-red-500/[0.02] border-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${notif.read ? "bg-white/5 text-gray-400" : "bg-red-500/10 text-red-400"}`}>
                    <Bell className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-sans font-bold text-xs text-white">{notif.title}</h4>
                      <span className="font-mono text-[9px] text-gray-500">{new Date(notif.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="font-sans text-xs text-gray-400 mt-1">{notif.message}</p>
                  </div>
                  {!notif.read && (
                    <button
                      onClick={() => handleMarkNotificationsRead(notif.id)}
                      title="Acknowledge Alert"
                      className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. Modals - 4.1 Create/Edit Admin Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030406]/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-arcadia-dark border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-arcadia-blue/10 border border-arcadia-blue/20 text-arcadia-blue">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-sm text-white uppercase tracking-wide">
                    {editingAdmin ? "MODIFY ADMIN PROFILE" : "PROVISION ADMINISTRATIVE ACCOUNT"}
                  </h4>
                  <p className="font-sans text-[11px] text-gray-500">
                    {editingAdmin ? `Updating records for: ${editingAdmin.email}` : "Define corporate identity and checklist rules."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Scroll Area */}
            <form onSubmit={handleAdminFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label className="block text-[9px] uppercase font-mono text-gray-400 mb-1.5 font-bold tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full display name"
                    value={adminForm.name}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue focus:ring-1 focus:ring-arcadia-blue/30 transition"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[9px] uppercase font-mono text-gray-400 mb-1.5 font-bold tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingAdmin}
                    placeholder="name@arcadia.com"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue focus:ring-1 focus:ring-arcadia-blue/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[9px] uppercase font-mono text-gray-400 mb-1.5 font-bold tracking-wider">Phone Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="+91 XXXXX XXXXX"
                    value={adminForm.phone}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue focus:ring-1 focus:ring-arcadia-blue/30 transition"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-[9px] uppercase font-mono text-gray-400 mb-1.5 font-bold tracking-wider">Department</label>
                  <select
                    value={adminForm.department}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#090a0f] border border-white/10 rounded-xl text-xs text-white cursor-pointer outline-none focus:border-arcadia-blue transition"
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Password credentials block (only during Creation) */}
              {!editingAdmin && (
                <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
                  <h5 className="font-display font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-arcadia-blue" />
                    Initial Password Security
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Password */}
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-gray-400 mb-1.5 font-bold tracking-wider">Temporary Password</label>
                      <div className="relative">
                        <input
                          type={showFormPassword ? "text" : "password"}
                          placeholder="••••••••••••"
                          value={adminForm.password}
                          onChange={(e) => {
                            setAdminForm(prev => ({ ...prev, password: e.target.value }));
                            checkPasswordStrength(e.target.value);
                          }}
                          className="w-full pl-4 pr-10 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue focus:ring-1 focus:ring-arcadia-blue/30 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFormPassword(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition cursor-pointer"
                        >
                          {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      
                      {/* Password strength visualizer */}
                      {adminForm.password && (
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-[9px] font-mono text-gray-500 uppercase">
                            <span>Complexity Strength:</span>
                            <span className={passwordStrength >= 4 ? "text-green-400" : passwordStrength >= 3 ? "text-amber-400" : "text-red-400"}>
                              {passwordStrength >= 4 ? "Excellent Secure" : passwordStrength >= 3 ? "Medium Secure" : "Weak Password"}
                            </span>
                          </div>
                          <div className="grid grid-cols-5 gap-1">
                            {[1, 2, 3, 4, 5].map((idx) => (
                              <div
                                key={idx}
                                className={`h-1 rounded-full ${
                                  idx <= passwordStrength 
                                    ? passwordStrength >= 4 
                                      ? "bg-green-500" 
                                      : passwordStrength >= 3 
                                        ? "bg-amber-500" 
                                        : "bg-red-500"
                                    : "bg-white/5"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label className="block text-[9px] uppercase font-mono text-gray-400 mb-1.5 font-bold tracking-wider">Confirm Password</label>
                      <input
                        type="password"
                        placeholder="••••••••••••"
                        value={adminForm.confirmPassword}
                        onChange={(e) => setAdminForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue focus:ring-1 focus:ring-arcadia-blue/30 transition"
                      />
                      {adminForm.confirmPassword && adminForm.password !== adminForm.confirmPassword && (
                        <p className="text-[9px] font-mono text-red-400 mt-1 uppercase font-bold tracking-wider">Passwords do not match.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Role & Micro-Permissions setup */}
              <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
                <h5 className="font-display font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-arcadia-blue" />
                  Security Role & Micro-Permissions Rules
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  {(["Super Admin", "Admin", "Manager", "Staff"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRolePresetSelect(r)}
                      className={`px-4 py-3 rounded-xl font-display text-xs font-bold uppercase transition flex flex-col items-center justify-center border gap-1 cursor-pointer ${
                        adminForm.role === r 
                          ? "bg-arcadia-blue/10 border-arcadia-blue text-white" 
                          : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-white"
                      }`}
                    >
                      <span>{r}</span>
                      <span className="text-[8px] font-mono normal-case font-normal text-gray-500">
                        {r === "Super Admin" ? "All controls" : r === "Admin" ? "Full Operations" : r === "Manager" ? "Moderate Editor" : "Restricted Staff"}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Granular permissions checklist */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono text-gray-400 font-bold tracking-wider">Granular Permissions List</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAdminForm(prev => ({ ...prev, permissions: AVAILABLE_PERMISSIONS.map(p => p.id) }))}
                        className="font-mono text-[9px] text-arcadia-blue hover:text-white uppercase font-bold transition cursor-pointer"
                      >
                        Grant All
                      </button>
                      <span className="text-gray-700">|</span>
                      <button
                        type="button"
                        onClick={() => setAdminForm(prev => ({ ...prev, permissions: [] }))}
                        className="font-mono text-[9px] text-gray-500 hover:text-white uppercase font-bold transition cursor-pointer"
                      >
                        Revoke All
                      </button>
                    </div>
                  </div>

                  {/* Grouped Permissions checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.group))).map((groupName) => {
                      const groupItems = AVAILABLE_PERMISSIONS.filter(p => p.group === groupName);
                      const allChecked = groupItems.every(gi => adminForm.permissions.includes(gi.id));
                      return (
                        <div key={groupName} className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-2.5">
                          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                            <span className="font-display text-[10px] font-extrabold uppercase text-gray-400 tracking-wide">{groupName}</span>
                            <input
                              type="checkbox"
                              checked={allChecked}
                              onChange={(e) => handleToggleGroupPermissions(groupName, e.target.checked)}
                              className="w-3 h-3 rounded border-white/10 text-arcadia-blue focus:ring-0 cursor-pointer"
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {groupItems.map(item => {
                              const isChecked = adminForm.permissions.includes(item.id);
                              return (
                                <label key={item.id} className="flex items-center justify-between text-xs text-gray-300 hover:text-white transition cursor-pointer select-none">
                                  <span>{item.name}</span>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(item.id)}
                                    className="w-3.5 h-3.5 rounded border-white/10 text-arcadia-blue focus:ring-0"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Bio & Avatar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Image selector */}
                <div>
                  <label className="block text-[9px] uppercase font-mono text-gray-400 mb-1.5 font-bold tracking-wider">Profile Image URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={adminForm.avatar}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, avatar: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue focus:ring-1 focus:ring-arcadia-blue/30 transition font-mono"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-[9px] uppercase font-mono text-gray-400 mb-1.5 font-bold tracking-wider">Biography / Executive Bio</label>
                  <textarea
                    placeholder="Short professional biography..."
                    value={adminForm.bio}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, bio: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue focus:ring-1 focus:ring-arcadia-blue/30 transition h-12 resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <AnimatedButton
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-display text-xs font-bold uppercase transition hover:text-white cursor-pointer"
                >
                  Cancel
                </AnimatedButton>
                <AnimatedButton
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-arcadia-blue text-white font-display text-xs font-bold uppercase tracking-wider hover:shadow-[0_0_2px_rgba(47,128,255,0.4)] transition cursor-pointer"
                >
                  {editingAdmin ? "Save Changes" : "Create Account"}
                </AnimatedButton>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 4.2 Reset Password Modal */}
      {isResetPasswordOpen && resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030406]/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-arcadia-dark border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Key className="w-5 h-5 text-amber-400 animate-spin" />
                <h4 className="font-display font-extrabold text-sm text-white uppercase">FORCE PASSWORD RESET</h4>
              </div>
              <button onClick={() => setIsResetPasswordOpen(false)} className="text-gray-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <p className="text-xs text-gray-400">
                You are forcing a security credentials overhaul for <strong>{resettingUser.name}</strong> ({resettingUser.email}).
                Their current sessions will be immediately terminated.
              </p>

              <div>
                <label className="block text-[9px] uppercase font-mono text-gray-400 mb-1.5 font-bold">New Security Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    placeholder="Enter strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-mono text-gray-400 mb-1.5 font-bold">Confirm Password</label>
                <input
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue"
                />
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => handleDispatchResetInstructions(resettingUser)}
                  className="text-xs text-arcadia-blue hover:text-white font-bold transition font-display cursor-pointer"
                >
                  Send Reset Link Email Instead
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetPasswordOpen(false)}
                    className="px-3 py-2 bg-white/5 rounded-xl text-xs text-gray-400 font-bold uppercase tracking-wider hover:text-white transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:shadow-[0_0_10px_rgba(245,158,11,0.3)] transition cursor-pointer"
                  >
                    Reset Now
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 4.3 Detailed Profile View Modal */}
      {viewingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030406]/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-arcadia-dark border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
              <h4 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">ADMINISTRATIVE USER DOSSIER</h4>
              <button onClick={() => setViewingProfile(null)} className="text-gray-500 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-5 pb-5 border-b border-white/5">
                <img
                  src={viewingProfile.avatar}
                  alt={viewingProfile.name}
                  className="w-20 h-20 rounded-2xl object-cover border border-white/15 shadow-xl"
                />
                <div className="text-center sm:text-left space-y-1.5">
                  <h3 className="font-display font-black text-lg text-white">{viewingProfile.name}</h3>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getRoleBadgeClass(viewingProfile.role)}`}>
                      {viewingProfile.role}
                    </span>
                    <span className="px-2 py-0.5 bg-white/5 text-gray-400 border border-white/5 rounded-full text-[10px] font-sans">
                      {viewingProfile.department}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${getStatusBadgeClass(viewingProfile.status)}`}>
                      {viewingProfile.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Information Ledger */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-sans">
                    <Mail className="w-4 h-4 text-arcadia-blue shrink-0" />
                    <strong>Email:</strong> <span className="font-mono">{viewingProfile.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-sans">
                    <Phone className="w-4 h-4 text-arcadia-blue shrink-0" />
                    <strong>Phone:</strong> {viewingProfile.phone || "Not specified"}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-sans">
                    <Calendar className="w-4 h-4 text-arcadia-blue shrink-0" />
                    <strong>Provisioned:</strong> {new Date(viewingProfile.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-sans">
                    <User className="w-4 h-4 text-arcadia-blue shrink-0" />
                    <strong>Created By:</strong> {viewingProfile.createdBy || "System"}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-sans">
                    <Activity className="w-4 h-4 text-arcadia-blue shrink-0" />
                    <strong>Last Login:</strong> {viewingProfile.lastLogin ? new Date(viewingProfile.lastLogin).toLocaleString() : "Never"}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-sans">
                    <Database className="w-4 h-4 text-arcadia-blue shrink-0" />
                    <strong>Active Connections:</strong> {viewingProfile.activeSessions || 1} active
                  </div>
                </div>
              </div>

              {/* Biography description */}
              {viewingProfile.bio && (
                <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-1.5">
                  <span className="text-[10px] uppercase font-mono text-gray-500 font-bold">Biography Details</span>
                  <p className="font-sans text-xs text-gray-300 leading-relaxed">{viewingProfile.bio}</p>
                </div>
              )}

              {/* Micro-permissions block list */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono text-gray-500 font-bold">Active Micro-Permissions Checklist</span>
                <div className="flex flex-wrap gap-1.5">
                  {viewingProfile.permissions.length === 0 ? (
                    <span className="text-xs text-gray-500 font-mono">No granular privileges assigned.</span>
                  ) : (
                    viewingProfile.permissions.map(p => {
                      const details = AVAILABLE_PERMISSIONS.find(ap => ap.id === p);
                      return (
                        <span key={p} className="px-2 py-0.5 bg-arcadia-blue/10 border border-arcadia-blue/20 text-arcadia-cyan font-sans text-[10px] rounded-md font-semibold" title={details?.group}>
                          {details?.name || p}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
