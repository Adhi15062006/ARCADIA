import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import AnimatedButton from "./ui/animated-button";
import { Service, Project, Booking, Order, BlogPost, FAQ, Testimonial, Inquiry, ActivityLog, PaymentMilestone, SEOSettings } from "../types";
import AdminManagement from "./AdminManagement";
import { generateInvoicePDF, generateRefundPDF } from "../utils/pdfGenerator";
import { db, handleFirestoreError, OperationType } from "../firebase/config";
import { recordException } from "../firebase/crashlytics";
import { onSnapshot, doc, collection, query, orderBy, updateDoc, deleteDoc, where, limit, startAfter, getCountFromServer, setDoc, addDoc, getDocs } from "firebase/firestore";
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
  CheckCircle,
  RefreshCw,
  CreditCard,
  Settings,
  Database,
  Globe
} from "lucide-react";

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-4 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-t-xl">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-white/10 rounded flex-1" />
        ))}
      </div>
      {/* Body Skeletons */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4 bg-white/[0.01] border border-white/5 rounded-xl">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-3 bg-white/5 rounded flex-1" style={{ width: j === 0 ? '45%' : '100%' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function GridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 rounded-3xl bg-[#0b0d13] border border-white/5 space-y-4">
          <div className="h-6 bg-white/10 rounded w-2/3" />
          <div className="space-y-2">
            <div className="h-3 bg-white/5 rounded w-full" />
            <div className="h-3 bg-white/5 rounded w-5/6" />
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-white/5">
            <div className="h-4 bg-white/10 rounded w-1/4" />
            <div className="h-8 bg-white/10 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const [token, setToken] = useState<string | null>(sessionStorage.getItem("arcadia_admin_token") || localStorage.getItem("arcadia_admin_token"));
  const [role, setRole] = useState<string | null>(sessionStorage.getItem("arcadia_admin_role") || localStorage.getItem("arcadia_admin_role"));
  const [adminEmail, setAdminEmail] = useState<string | null>(sessionStorage.getItem("arcadia_admin_email") || localStorage.getItem("arcadia_admin_email"));
  const [isAdminDataLoading, setIsAdminDataLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  // Arcadia Integrated Financial States
  const [payments, setPayments] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [financialReports, setFinancialReports] = useState<any | null>(null);

  // Review states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedPaymentForReview, setSelectedPaymentForReview] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<"Approve" | "Reject">("Approve");
  const [reviewNotes, setReviewNotes] = useState("");

  // Refund states
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<any | null>(null);
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundNotes, setRefundNotes] = useState("");

  // Maintenance Subscriptions States
  const [maintenanceSubs, setMaintenanceSubs] = useState<any[]>([]);
  const [maintenanceAnalytics, setMaintenanceAnalytics] = useState<any | null>(null);
  const [maintSearch, setMaintSearch] = useState("");
  const [maintPlanFilter, setMaintPlanFilter] = useState("all");
  const [maintStatusFilter, setMaintStatusFilter] = useState("all");

  // Assign plan modal states
  const [isMaintPlanModalOpen, setIsMaintPlanModalOpen] = useState(false);
  const [selectedMaintSub, setSelectedMaintSub] = useState<any | null>(null);
  const [maintPlanForm, setMaintPlanForm] = useState({ planId: "none", planName: "No Plan Assigned", monthlyPrice: 0, status: "No Plan" });

  // Change renewal date modal states
  const [isMaintRenewalModalOpen, setIsMaintRenewalModalOpen] = useState(false);
  const [maintRenewalDateVal, setMaintRenewalDateVal] = useState("");

  // SEO Metadata settings state
  const [seoSettings, setSeoSettings] = useState<SEOSettings[]>([]);
  const [loadingSeo, setLoadingSeo] = useState<boolean>(false);
  const [seoError, setSeoError] = useState<string | null>(null);
  const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
  const [selectedSeo, setSelectedSeo] = useState<SEOSettings | null>(null);
  const [seoForm, setSeoForm] = useState({
    route: "",
    title: "",
    description: "",
    keywords: "",
    ogImage: "",
    status: "Published" as "Published" | "Draft"
  });

  // Selected tab state
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Crashlytics States
  const [crashReports, setCrashReports] = useState<any[]>([]);
  const [loadingCrashes, setLoadingCrashes] = useState<boolean>(false);
  const [selectedCrash, setSelectedCrash] = useState<any | null>(null);
  const [crashSeverityFilter, setCrashSeverityFilter] = useState<string>("all");
  const [crashStatusFilter, setCrashStatusFilter] = useState<string>("all");
  const [crashPage, setCrashPage] = useState<number>(1);
  const [crashLimit, setCrashLimit] = useState<number>(10);
  const [pageCursors, setPageCursors] = useState<any[]>([null]);
  const [hasNextCrashPage, setHasNextCrashPage] = useState<boolean>(false);
  const [loadingCrashesError, setLoadingCrashesError] = useState<string | null>(null);

  // Crashlytics Aggregate Counts
  const [totalCrashesCount, setTotalCrashesCount] = useState<number>(0);
  const [fatalCrashesCount, setFatalCrashesCount] = useState<number>(0);
  const [openCrashesCount, setOpenCrashesCount] = useState<number>(0);
  const [resolvedCrashesCount, setResolvedCrashesCount] = useState<number>(0);

  // Database Sync State
  const [syncingDb, setSyncingDb] = useState<boolean>(false);
  const [syncResults, setSyncResults] = useState<{ successCount: number; failCount: number; totalCount: number } | null>(null);

  // User Management State
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ email: "", name: "", password: "", role: "Customer" });
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<any | null>(null);
  const [newPasswordResetVal, setNewPasswordResetVal] = useState("");

  // Maintenance API handlers
  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaintSub) return;
    try {
      const res = await fetch(`/api/maintenance/subscriptions/${selectedMaintSub.id}/plan`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(maintPlanForm)
      });
      if (res.ok) {
        onShowToast?.("success", "Successfully updated maintenance contract plan!");
        setIsMaintPlanModalOpen(false);
        fetchAdminData();
      } else {
        const data = await res.json();
        onShowToast?.("error", data.error || "Failed to update plan.");
      }
    } catch (err) {
      console.error(err);
      onShowToast?.("error", "Error connecting to server.");
    }
  };

  const handleSendRenewalReminder = async (subId: string) => {
    try {
      const res = await fetch(`/api/maintenance/subscriptions/${subId}/renewal-reminder`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        onShowToast?.("success", "Automated renewal reminder email dispatched successfully!");
      } else {
        onShowToast?.("error", "Failed to send email reminder.");
      }
    } catch (err) {
      console.error(err);
      onShowToast?.("error", "Error dispatching request.");
    }
  };

  const handleChangeRenewalDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaintSub || !maintRenewalDateVal) return;
    try {
      const res = await fetch(`/api/maintenance/subscriptions/${selectedMaintSub.id}/change-renewal`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ nextRenewalDate: maintRenewalDateVal })
      });
      if (res.ok) {
        onShowToast?.("success", "Renewal date adjusted successfully!");
        setIsMaintRenewalModalOpen(false);
        fetchAdminData();
      } else {
        onShowToast?.("error", "Failed to change renewal date.");
      }
    } catch (err) {
      console.error(err);
      onShowToast?.("error", "Error communicating with server.");
    }
  };

  const handleSimulateDebit = async (subId: string, success: boolean, amount: number) => {
    try {
      const res = await fetch(`/api/maintenance/subscriptions/${subId}/simulate-payment`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount,
          status: success ? "Success" : "Failed",
          reason: success ? undefined : "AutoPay recurring balance insufficient."
        })
      });
      if (res.ok) {
        if (success) {
          onShowToast?.("success", `Simulated AutoPay charge of ₹${amount} completed & email receipt dispatched!`);
        } else {
          onShowToast?.("error", `Simulated AutoPay failed & failure email alert dispatched!`);
        }
        fetchAdminData();
      } else {
        onShowToast?.("error", "Failed to simulate debit.");
      }
    } catch (err) {
      console.error(err);
      onShowToast?.("error", "Simulation error.");
    }
  };

  // Create User API
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserForm.email || !createUserForm.name || !createUserForm.password || !createUserForm.role) {
      onShowToast?.("error", "Please fill in all fields.");
      return;
    }
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(createUserForm)
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast?.("success", `Successfully created user profile: ${createUserForm.name}`);
        setIsCreateUserModalOpen(false);
        setCreateUserForm({ email: "", name: "", password: "", role: "Customer" });
        fetchAdminData();
      } else {
        onShowToast?.("error", data.error || "Failed to create user.");
      }
    } catch (err) {
      console.error(err);
      onShowToast?.("error", "Error connecting to server gateways.");
    }
  };

  // Change Role API
  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/admin/assign-role", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId, role: newRole })
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast?.("success", `Role successfully updated to ${newRole}!`);
        fetchAdminData();
      } else {
        onShowToast?.("error", data.error || "Failed to assign role.");
      }
    } catch (err) {
      console.error(err);
      onShowToast?.("error", "Error communicating with auth gateways.");
    }
  };

  // Suspend User API
  const handleToggleSuspend = async (userId: string, currentStatus: string) => {
    const isSuspendedNow = currentStatus === "suspended";
    const nextSuspended = !isSuspendedNow;
    try {
      const res = await fetch("/api/admin/suspend-user", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId, suspended: nextSuspended })
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast?.("success", nextSuspended ? "User account suspended and active tokens revoked!" : "User account activated successfully!");
        fetchAdminData();
      } else {
        onShowToast?.("error", data.error || "Failed to update account status.");
      }
    } catch (err) {
      console.error(err);
      onShowToast?.("error", "Error communicating with suspend gateways.");
    }
  };

  // Delete User API
  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user account "${email}"? This action is IRREVERSIBLE and will also delete their Firebase auth profile.`)) {
      return;
    }
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast?.("success", "User account successfully purged.");
        fetchAdminData();
      } else {
        onShowToast?.("error", data.error || "Failed to purge user.");
      }
    } catch (err) {
      console.error(err);
      onShowToast?.("error", "Error communicating with delete gateways.");
    }
  };

  // Reset Password API
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordResetVal) {
      onShowToast?.("error", "Please specify a secure password.");
      return;
    }
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId: selectedUserForReset?.id, newPassword: newPasswordResetVal })
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast?.("success", `Successfully forced password reset and invalidated active login sessions for: ${selectedUserForReset?.email}`);
        setIsResetPasswordModalOpen(false);
        setSelectedUserForReset(null);
        setNewPasswordResetVal("");
      } else {
        onShowToast?.("error", data.error || "Failed to reset password.");
      }
    } catch (err) {
      console.error(err);
      onShowToast?.("error", "Error communicating with password gateways.");
    }
  };

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

      const unsubscribes = [
        onSnapshot(doc(db, "arcadia_system_db", "bookings.json"), (snapshot) => {
          const data = snapshot.data();
          if (data && Array.isArray(data.data)) {
            setBookings(data.data);
          }
        }, (err) => console.error("Error listening to bookings:", err)),

        onSnapshot(collection(db, "orders"), (snapshot) => {
          console.log("[Order System] Admin query count:", snapshot.size);
          const ordersList: any[] = [];
          snapshot.forEach((document) => {
            ordersList.push(document.data());
          });
          console.log("[Order System] Orders returned from Firestore orders collection:", ordersList.length);
          if (ordersList.length > 0) {
            setOrders(ordersList);
          }
        }, (err) => console.error("[Order System] Error listening to orders collection:", err)),

        onSnapshot(doc(db, "arcadia_system_db", "orders.json"), (snapshot) => {
          const data = snapshot.data();
          if (data && Array.isArray(data.data)) {
            setOrders(prev => {
              if (prev.length === 0) return data.data;
              const map = new Map();
              data.data.forEach((o: any) => map.set(o.id || o.orderId, o));
              prev.forEach((o: any) => map.set(o.id || o.orderId, o));
              return Array.from(map.values());
            });
          }
        }, (err) => console.error("Error listening to orders:", err)),

        onSnapshot(doc(db, "arcadia_system_db", "inquiries.json"), (snapshot) => {
          const data = snapshot.data();
          if (data && Array.isArray(data.data)) {
            setInquiries(data.data);
          }
        }, (err) => console.error("Error listening to inquiries:", err)),

        onSnapshot(doc(db, "arcadia_system_db", "logs.json"), (snapshot) => {
          const data = snapshot.data();
          if (data && Array.isArray(data.data)) {
            setLogs(data.data);
          }
        }, (err) => console.error("Error listening to logs:", err)),

        onSnapshot(doc(db, "arcadia_system_db", "vacancies.json"), (snapshot) => {
          const data = snapshot.data();
          if (data && Array.isArray(data.data)) {
            setVacancies(data.data);
          }
        }, (err) => console.error("Error listening to vacancies:", err)),

        onSnapshot(doc(db, "arcadia_system_db", "applications.json"), (snapshot) => {
          const data = snapshot.data();
          if (data && Array.isArray(data.data)) {
            setApplications(data.data);
          }
        }, (err) => console.error("Error listening to applications:", err)),

        onSnapshot(doc(db, "arcadia_system_db", "users.json"), (snapshot) => {
          const data = snapshot.data();
          if (data && Array.isArray(data.data)) {
            setUsersList(data.data);
          }
        }, (err) => console.error("Error listening to users:", err)),

        onSnapshot(doc(db, "arcadia_system_db", "mock_emails.json"), (snapshot) => {
          const data = snapshot.data();
          if (data && Array.isArray(data.data)) {
            setMockEmails(data.data);
          }
        }, (err) => console.error("Error listening to mock_emails:", err))
      ];

      return () => {
        unsubscribes.forEach((unsub) => unsub());
      };
    }
  }, [token]);

  // Dedicated Crashlytics Real-Time Query with Server-Side Pagination and Field Filtering
  const fetchCrashMetrics = async () => {
    try {
      const [totalSnap, fatalSnap, openSnap, resolvedSnap] = await Promise.all([
        getCountFromServer(collection(db, "crashReports")),
        getCountFromServer(query(collection(db, "crashReports"), where("severity", "==", "fatal"))),
        getCountFromServer(query(collection(db, "crashReports"), where("status", "==", "open"))),
        getCountFromServer(query(collection(db, "crashReports"), where("status", "==", "resolved")))
      ]);
      setTotalCrashesCount(totalSnap.data().count);
      setFatalCrashesCount(fatalSnap.data().count);
      setOpenCrashesCount(openSnap.data().count);
      setResolvedCrashesCount(resolvedSnap.data().count);
    } catch (err) {
      console.error("Error fetching crash metrics:", err);
    }
  };

  useEffect(() => {
    if (token) {
      setLoadingCrashes(true);
      setLoadingCrashesError(null);

      // Fetch summary counts for the dashboard metrics
      fetchCrashMetrics();

      // 1. Build the dynamic Firebase query base
      let q = query(collection(db, "crashReports"), orderBy("createdAt", "desc"));

      // Apply filters if not set to "all"
      if (crashSeverityFilter !== "all") {
        q = query(q, where("severity", "==", crashSeverityFilter));
      }
      if (crashStatusFilter !== "all") {
        q = query(q, where("status", "==", crashStatusFilter));
      }

      // Apply pagination cursor startAfter if we are on page > 1
      if (crashPage > 1 && pageCursors[crashPage - 1]) {
        q = query(q, startAfter(pageCursors[crashPage - 1]));
      }

      // Apply client-specified limit
      q = query(q, limit(crashLimit));

      // 2. Register dynamic realtime listener
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const reports: any[] = [];
        snapshot.forEach((doc) => {
          reports.push({ id: doc.id, ...doc.data() });
        });
        setCrashReports(reports);
        setLoadingCrashes(false);

        // Store the cursor of the last document in this page for navigating to the next page
        if (snapshot.docs.length > 0) {
          const lastDoc = snapshot.docs[snapshot.docs.length - 1];
          setPageCursors(prev => {
            const nextCursors = [...prev];
            nextCursors[crashPage] = lastDoc; // cursor for crashPage + 1
            return nextCursors;
          });
        }
        setHasNextCrashPage(snapshot.docs.length === crashLimit);
      }, (err) => {
        console.error("Error listening to crashReports:", err);
        try {
          handleFirestoreError(err, OperationType.GET, "crashReports");
        } catch (e: any) {
          setLoadingCrashesError(e.message);
        }
        setLoadingCrashes(false);
      });

      return () => unsubscribe();
    }
  }, [token, crashSeverityFilter, crashStatusFilter, crashPage, crashLimit]);

  const fetchSeoSettings = async () => {
    setLoadingSeo(true);
    setSeoError(null);
    try {
      const snapshot = await getDocs(collection(db, "seoSettings"));
      const list: SEOSettings[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as SEOSettings);
      });
      setSeoSettings(list);
    } catch (err: any) {
      console.error("Error fetching SEO settings: ", err);
      setSeoError(err.message || "Failed to fetch SEO settings");
    } finally {
      setLoadingSeo(false);
    }
  };

  const fetchAdminData = async () => {
    setIsAdminDataLoading(true);
    fetchSeoSettings();
    try {
      const headers = { "Authorization": `Bearer ${token}` };
      
      const [bRes, oRes, iRes, lRes, vRes, aRes, uRes, eRes, pRes, rRes, repRes, mSubRes, mAnalyticRes] = await Promise.all([
        fetch("/api/bookings", { headers }),
        fetch("/api/orders", { headers }),
        fetch("/api/inquiries", { headers }),
        fetch("/api/logs", { headers }),
        fetch("/api/vacancies"),
        fetch("/api/applications", { headers }),
        fetch("/api/users", { headers }),
        fetch("/api/mock-emails", { headers }),
        fetch("/api/payments/list", { headers }),
        fetch("/api/payments/refunds-list", { headers }),
        fetch("/api/payments/reports", { headers }),
        fetch("/api/maintenance/subscriptions", { headers }),
        fetch("/api/maintenance/analytics", { headers })
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
        if (pRes && pRes.ok) setPayments(await pRes.json());
        if (rRes && rRes.ok) setRefunds(await rRes.json());
        if (repRes && repRes.ok) setFinancialReports(await repRes.json());
        if (mSubRes && mSubRes.ok) setMaintenanceSubs(await mSubRes.json());
        if (mAnalyticRes && mAnalyticRes.ok) setMaintenanceAnalytics(await mAnalyticRes.json());
      } else {
        // Token expired/invalid, clear auth
        handleLogout();
      }
    } catch (err) {
      console.error("Error fetching admin data", err);
    } finally {
      setIsAdminDataLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForReview) return;
    try {
      const res = await fetch("/api/payments/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentId: selectedPaymentForReview.id,
          action: reviewAction,
          notes: reviewNotes
        })
      });
      if (res.ok) {
        onShowToast?.("success", `Payment successfully ${reviewAction === "Approve" ? "approved" : "rejected"}!`);
        setIsReviewModalOpen(false);
        setSelectedPaymentForReview(null);
        setReviewNotes("");
        fetchAdminData();
        onRefreshAllData();
      } else {
        const data = await res.json();
        onShowToast?.("error", data.error || "Failed to submit review.");
      }
    } catch (err) {
      onShowToast?.("error", "Failed to communicate with the review server.");
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForRefund) return;
    try {
      const res = await fetch("/api/payments/refund", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentId: selectedPaymentForRefund.id,
          refundType,
          refundAmount: refundType === "partial" ? refundAmount : undefined,
          refundReason,
          notes: refundNotes
        })
      });
      if (res.ok) {
        onShowToast?.("success", "Refund processed successfully!");
        setIsRefundModalOpen(false);
        setSelectedPaymentForRefund(null);
        setRefundAmount("");
        setRefundReason("");
        setRefundNotes("");
        fetchAdminData();
        onRefreshAllData();
      } else {
        const data = await res.json();
        onShowToast?.("error", data.error || "Failed to process refund.");
      }
    } catch (err) {
      onShowToast?.("error", "Error communicating with refund API.");
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
        sessionStorage.setItem("arcadia_admin_token", data.token);
        sessionStorage.setItem("arcadia_admin_role", data.role);
        sessionStorage.setItem("arcadia_admin_email", data.email);
        localStorage.setItem("arcadia_admin_token", data.token);
        localStorage.setItem("arcadia_admin_role", data.role);
        localStorage.setItem("arcadia_admin_email", data.email);
        setToken(data.token);
        setRole(data.role);
        setAdminEmail(data.email);
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

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch("/api/auth/admin-logout", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
      }
    } catch (err) {}
    sessionStorage.removeItem("arcadia_admin_token");
    sessionStorage.removeItem("arcadia_admin_role");
    sessionStorage.removeItem("arcadia_admin_email");
    localStorage.removeItem("arcadia_admin_token");
    localStorage.removeItem("arcadia_admin_role");
    localStorage.removeItem("arcadia_admin_email");
    setToken(null);
    setRole(null);
    setAdminEmail(null);
    if (setIsAdminLoggedIn) {
      setIsAdminLoggedIn(false);
    }
  };

  const handleUpdateCrashStatus = async (reportId: string, newStatus: string) => {
    try {
      const docRef = doc(db, "crashReports", reportId);
      await updateDoc(docRef, { status: newStatus });
      if (selectedCrash && selectedCrash.id === reportId) {
        setSelectedCrash({ ...selectedCrash, status: newStatus });
      }
      fetchCrashMetrics();
      if (onShowToast) {
        onShowToast("success", `Report status updated to ${newStatus}`);
      }
    } catch (err: any) {
      console.error("Failed to update status:", err);
      if (onShowToast) {
        onShowToast("error", "Failed to update report status");
      }
    }
  };

  const handleDeleteCrashReport = async (reportId: string) => {
    if (!window.confirm("Are you sure you want to permanently purge this crash report?")) return;
    try {
      const docRef = doc(db, "crashReports", reportId);
      await deleteDoc(docRef);
      if (selectedCrash && selectedCrash.id === reportId) {
        setSelectedCrash(null);
      }
      fetchCrashMetrics();
      if (onShowToast) {
        onShowToast("success", "Crash report purged successfully");
      }
    } catch (err: any) {
      console.error("Failed to delete report:", err);
      if (onShowToast) {
        onShowToast("error", "Failed to delete crash report");
      }
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

  const handleForceSyncDb = async () => {
    setSyncingDb(true);
    setSyncResults(null);
    try {
      const res = await fetch("/api/admin/force-sync", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onShowToast?.("success", data.message);
        setSyncResults({
          successCount: data.successCount,
          failCount: data.failCount,
          totalCount: data.totalCount
        });
        fetchAdminData();
      } else {
        onShowToast?.("error", data.error || "Failed to force database synchronization.");
      }
    } catch (err: any) {
      console.error(err);
      onShowToast?.("error", "Database synchronization failed.");
    } finally {
      setSyncingDb(false);
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

  const handleSaveSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seoForm.route || !seoForm.title) {
      onShowToast?.("error", "Route and Title are required.");
      return;
    }

    try {
      // Clean up inputs
      const cleanedRoute = seoForm.route.trim().toLowerCase();
      // Generate a document ID: sanitize or use default if site-wide
      const docId = selectedSeo ? selectedSeo.id : (cleanedRoute.replace(/[^a-z0-9]/g, "-") || "default");

      // Parse keywords
      const kwArray = seoForm.keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const payload = {
        id: docId,
        route: cleanedRoute,
        title: seoForm.title.trim(),
        description: seoForm.description.trim(),
        keywords: kwArray,
        ogImage: seoForm.ogImage.trim(),
        status: seoForm.status,
        updatedAt: new Date().toISOString(),
      };

      if (!selectedSeo) {
        // Create new
        const docRef = doc(db, "seoSettings", docId);
        await setDoc(docRef, {
          ...payload,
          createdAt: new Date().toISOString(),
          createdBy: adminEmail || "Admin",
        });
        onShowToast?.("success", "SEO configuration created successfully.");
      } else {
        // Update existing
        const docRef = doc(db, "seoSettings", docId);
        await setDoc(docRef, payload, { merge: true });
        onShowToast?.("success", "SEO configuration updated successfully.");
      }

      setIsSeoModalOpen(false);
      setSelectedSeo(null);
      fetchSeoSettings();
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, selectedSeo ? OperationType.UPDATE : OperationType.CREATE, `seoSettings`);
      onShowToast?.("error", "Failed to save SEO settings.");
    }
  };

  const handleDeleteSeo = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this SEO configuration?")) return;
    try {
      await deleteDoc(doc(db, "seoSettings", id));
      onShowToast?.("success", "SEO configuration deleted.");
      fetchSeoSettings();
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `seoSettings/${id}`);
      onShowToast?.("error", "Failed to delete SEO settings.");
    }
  };

  const handleOpenSeoModal = (seo: SEOSettings | null = null) => {
    if (seo) {
      setSelectedSeo(seo);
      setSeoForm({
        route: seo.route,
        title: seo.title,
        description: seo.description || "",
        keywords: Array.isArray(seo.keywords) ? seo.keywords.join(", ") : "",
        ogImage: seo.ogImage || "",
        status: seo.status || "Published",
      });
    } else {
      setSelectedSeo(null);
      setSeoForm({
        route: "",
        title: "",
        description: "",
        keywords: "",
        ogImage: "",
        status: "Published",
      });
    }
    setIsSeoModalOpen(true);
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
            <div className="absolute inset-0 bg-gradient-to-r from-arcadia-cyan/10 via-arcadia-blue/10 to-purple-500/10 rounded-3xl blur-3xl opacity-80 pointer-events-none transition-all duration-1000 group-hover:opacity-100" />
            
            {/* Core container card */}
            <div className="relative rounded-3xl p-8 bg-arcadia-dark/95 border border-white/10 shadow-[0_0_50px_rgba(47,128,255,0.12)] overflow-hidden backdrop-blur-xl">
              
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
                  { id: "maintenance", label: "Maintenance Contracts", icon: Settings },
                  { id: "finance", label: "Finance & Refunds", icon: FileSpreadsheet },
                  { id: "users", label: "Registered Clients", icon: Users },
                  { id: "bookings", label: "Demo Bookings", icon: Calendar },
                  { id: "catalog", label: "Catalog Editor", icon: Layers },
                  { id: "projects", label: "Projects Panel", icon: BookOpen },
                  { id: "vacancies", label: "Vacancies", icon: Briefcase },
                  { id: "applications", label: "Job Applications", icon: UserCheck },
                  { id: "inquiries", label: "Inquiries", icon: MessageSquare },
                  { id: "logs", label: "Activity Logs", icon: Activity },
                  { id: "emails", label: "Email Dispatcher", icon: Mail },
                  { id: "crashlytics", label: "Firebase Crashlytics", icon: ShieldAlert },
                  { id: "seo", label: "SEO Metadata", icon: Globe },
                  ...(role === "Super Admin" ? [{ id: "admin-management", label: "Admin Management", icon: ShieldCheck }] : [])
                ] as any[]).map(tab => {
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

              {/* TAB FINANCE & REFUNDS */}
              {activeTab === "finance" && (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 gap-4">
                    <div>
                      <h3 className="font-display font-black text-lg text-white">FINANCE & REFUNDS COMMAND CENTER</h3>
                      <p className="font-sans text-xs text-gray-500">Corporate transaction records, pending signature reviews, and refunds dispatch center.</p>
                    </div>
                    <div className="flex gap-2">
                      <AnimatedButton
                        onClick={fetchAdminData}
                        className="px-3 py-1.5 rounded-full border border-white/10 text-xs font-semibold flex items-center gap-1.5 hover:bg-white/5 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-arcadia-cyan" />
                        <span>Refresh Ledger</span>
                      </AnimatedButton>
                    </div>
                  </div>

                  {/* Financial KPI Dashboard Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                      <div className="flex items-center justify-between text-gray-500 mb-1.5">
                        <span className="font-sans text-[9px] uppercase tracking-wider font-bold">Total Collected Revenue</span>
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                      <div className="font-display font-black text-lg text-white">
                        ₹{(financialReports?.totalRevenue || 0).toLocaleString("en-IN")}
                      </div>
                      <p className="text-[8.5px] font-mono text-gray-500 mt-1">Net approved funds</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                      <div className="flex items-center justify-between text-gray-500 mb-1.5">
                        <span className="font-sans text-[9px] uppercase tracking-wider font-bold">Outstanding Review Volume</span>
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      </div>
                      <div className="font-display font-black text-lg text-white">
                        ₹{(financialReports?.pendingPaymentsVolume || 0).toLocaleString("en-IN")}
                      </div>
                      <p className="text-[8.5px] font-mono text-gray-500 mt-1">Awaiting verification</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                      <div className="flex items-center justify-between text-gray-500 mb-1.5">
                        <span className="font-sans text-[9px] uppercase tracking-wider font-bold">Total Disbursed Refunds</span>
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                      </div>
                      <div className="font-display font-black text-lg text-white text-rose-400">
                        ₹{(financialReports?.totalRefunded || 0).toLocaleString("en-IN")}
                      </div>
                      <p className="text-[8.5px] font-mono text-gray-500 mt-1">Returned capital</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5">
                      <div className="flex items-center justify-between text-gray-500 mb-1.5">
                        <span className="font-sans text-[9px] uppercase tracking-wider font-bold">Consolidated Transactions</span>
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                      </div>
                      <div className="font-display font-black text-lg text-white text-purple-400">
                        {payments.length}
                      </div>
                      <p className="text-[8.5px] font-mono text-gray-500 mt-1">Processed orders & milestones</p>
                    </div>
                  </div>

                  {/* SECTION 1: AWAITING ADMIN REVIEW */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-bold text-sm text-white uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>Awaiting Administrative Review ({payments.filter(p => p.status === "Under Review").length})</span>
                      </h4>
                    </div>

                    {isAdminDataLoading ? (
                      <TableSkeleton rows={3} cols={6} />
                    ) : payments.filter(p => p.status === "Under Review").length === 0 ? (
                      <div className="p-8 rounded-2xl bg-white/[0.01] border border-white/5 text-center">
                        <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">🎉 No pending reviews. All payments are verified!</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#050811]">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 font-mono text-[9px] text-gray-400 uppercase tracking-wider bg-white/[0.02]">
                              <th className="p-4 font-bold">Transaction / Client</th>
                              <th className="p-4 font-bold">Project Name</th>
                              <th className="p-4 font-bold">Milestone ID</th>
                              <th className="p-4 font-bold">Payment Details</th>
                              <th className="p-4 font-bold">Amount</th>
                              <th className="p-4 font-bold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs font-sans text-gray-300">
                            {payments.filter(p => p.status === "Under Review").map((p) => {
                              const order = orders.find(o => o.id === p.orderId);
                              const projName = order ? order.service : "Inception Solution";
                              return (
                                <tr key={p.id} className="hover:bg-white/[0.01] transition">
                                  <td className="p-4">
                                    <div className="font-mono font-bold text-[10px] text-white select-all">{p.id}</div>
                                    <div className="text-[9px] text-gray-500 font-mono mt-0.5">{p.clientEmail || p.clientId}</div>
                                  </td>
                                  <td className="p-4 font-bold text-white">{projName}</td>
                                  <td className="p-4">
                                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-mono text-[9px] font-bold uppercase">
                                      {p.milestoneId || "m1"}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <div className="font-mono text-[9px] text-gray-400">Order: {p.razorpayOrderId}</div>
                                    <div className="font-mono text-[9px] text-gray-500 mt-0.5">Pay: {p.razorpayPaymentId}</div>
                                  </td>
                                  <td className="p-4 font-display font-black text-arcadia-cyan">₹{(p.amount || 0).toLocaleString("en-IN")}</td>
                                  <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <AnimatedButton
                                        onClick={() => {
                                          setSelectedPaymentForReview(p);
                                          setReviewAction("Approve");
                                          setIsReviewModalOpen(true);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 font-mono text-[9px] font-black uppercase cursor-pointer"
                                      >
                                        Approve
                                      </AnimatedButton>
                                      <AnimatedButton
                                        onClick={() => {
                                          setSelectedPaymentForReview(p);
                                          setReviewAction("Reject");
                                          setIsReviewModalOpen(true);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-mono text-[9px] font-black uppercase cursor-pointer"
                                      >
                                        Reject
                                      </AnimatedButton>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: COMPLETED PAYMENT LIST (REFUND DISPATCHER) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-bold text-sm text-white uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Disbursed Milestone Transactions & Refunds Desk</span>
                      </h4>
                    </div>

                    {isAdminDataLoading ? (
                      <TableSkeleton rows={4} cols={6} />
                    ) : payments.filter(p => p.status === "Approved" || p.status === "Refunded").length === 0 ? (
                      <div className="p-8 rounded-2xl bg-white/[0.01] border border-white/5 text-center">
                        <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">No settled payments yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#050811]">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 font-mono text-[9px] text-gray-400 uppercase tracking-wider bg-white/[0.02]">
                              <th className="p-4 font-bold">Transaction / Client</th>
                              <th className="p-4 font-bold">Project Name</th>
                              <th className="p-4 font-bold">Milestone</th>
                              <th className="p-4 font-bold">Status</th>
                              <th className="p-4 font-bold">Approved Vol</th>
                              <th className="p-4 font-bold text-right">Refund Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs font-sans text-gray-300">
                            {payments.filter(p => p.status === "Approved" || p.status === "Refunded").map((p) => {
                              const order = orders.find(o => o.id === p.orderId);
                              const projName = order ? order.service : "Inception Solution";
                              return (
                                <tr key={p.id} className="hover:bg-white/[0.01] transition">
                                  <td className="p-4">
                                    <div className="font-mono font-bold text-[10px] text-white select-all">{p.id}</div>
                                    <div className="text-[9px] text-gray-500 font-mono mt-0.5">{p.clientEmail || p.clientId}</div>
                                  </td>
                                  <td className="p-4 font-bold text-white">{projName}</td>
                                  <td className="p-4 font-mono text-[10px] text-gray-400 uppercase">{p.milestoneId || "m1"}</td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider ${
                                      p.status === "Approved" ? "bg-green-500/10 text-green-400" : "bg-rose-500/10 text-rose-400"
                                    }`}>
                                      {p.status}
                                    </span>
                                  </td>
                                  <td className="p-4 font-display font-black text-arcadia-cyan">₹{(p.amount || 0).toLocaleString("en-IN")}</td>
                                  <td className="p-4 text-right">
                                    {p.status === "Approved" ? (
                                      <AnimatedButton
                                        onClick={() => {
                                          setSelectedPaymentForRefund(p);
                                          setRefundAmount((p.amount || "").toString());
                                          setRefundType("full");
                                          setIsRefundModalOpen(true);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-mono text-[9px] font-black uppercase cursor-pointer"
                                      >
                                        Issue Refund
                                      </AnimatedButton>
                                    ) : (
                                      <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">REFUND COMPLETED</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: COMPLETED REFUNDS REGISTER */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-bold text-sm text-white uppercase tracking-wide flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>Completed Refund Receipts & Cancelled Milestones ({refunds.length})</span>
                      </h4>
                    </div>

                    {refunds.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-white/[0.01] border border-white/5 text-center">
                        <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">No refund transactions recorded.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#050811]">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 font-mono text-[9px] text-gray-400 uppercase tracking-wider bg-white/[0.02]">
                              <th className="p-4 font-bold">Refund ID / Date</th>
                              <th className="p-4 font-bold">Original Payment ID</th>
                              <th className="p-4 font-bold">Project / Milestone</th>
                              <th className="p-4 font-bold">Reason</th>
                              <th className="p-4 font-bold">Amount</th>
                              <th className="p-4 font-bold text-right">Receipt</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs font-sans text-gray-300">
                            {refunds.map((ref) => {
                              const order = orders.find(o => o.id === ref.orderId);
                              const projName = order ? order.service : "Cancelled Contract";
                              return (
                                <tr key={ref.id} className="hover:bg-white/[0.01] transition">
                                  <td className="p-4">
                                    <div className="font-mono font-bold text-[10px] text-rose-400 select-all">{ref.id}</div>
                                    <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                                      {new Date(ref.timestamp).toLocaleString("en-IN")}
                                    </div>
                                  </td>
                                  <td className="p-4 font-mono text-[10px] text-gray-400 select-all">{ref.paymentId}</td>
                                  <td className="p-4">
                                    <div className="font-bold text-white">{projName}</div>
                                    <div className="text-[9px] text-purple-400 font-mono uppercase mt-0.5">{ref.milestoneId || "m1"}</div>
                                  </td>
                                  <td className="p-4 text-[10px] text-gray-400 leading-snug max-w-[180px] truncate">{ref.reason}</td>
                                  <td className="p-4 font-display font-black text-rose-400">₹{(ref.amount || 0).toLocaleString("en-IN")}</td>
                                  <td className="p-4 text-right">
                                    <AnimatedButton
                                      onClick={() => {
                                        const originalOrder = orders.find(o => o.id === ref.orderId) || {
                                          id: ref.orderId,
                                          clientId: "Customer",
                                          clientEmail: "customer@arcadia.agency",
                                          title: projName,
                                          serviceType: projName,
                                          budget: (ref.amount * 3).toString(),
                                          status: "Cancelled",
                                          isPaid: false,
                                          timestamp: ref.timestamp
                                        };
                                        generateRefundPDF(originalOrder as any, ref);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white font-mono text-[9px] font-black uppercase cursor-pointer flex items-center gap-1 inline-flex"
                                    >
                                      <Download className="w-3 h-3 text-rose-400" />
                                      <span>Receipt</span>
                                    </AnimatedButton>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB MAINTENANCE CONTRACTS */}
              {activeTab === "maintenance" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-display font-black text-lg text-white">MAINTENANCE CONTRACTS & AUTOPAY</h3>
                      <p className="font-sans text-xs text-gray-500">
                        Manage recurring monthly client maintenance subscriptions, track AutoPay statuses, adjust dates, and simulate recurring billing.
                      </p>
                    </div>
                    <button
                      onClick={fetchAdminData}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-display text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh Panel</span>
                    </button>
                  </div>

                  {/* BENTO ANALYTICS CARDS */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-1">
                      <span className="block font-mono text-[9px] text-gray-500 tracking-wider font-bold uppercase">TOTAL CONTRACTS</span>
                      <span className="block font-display font-black text-2xl text-white">{maintenanceSubs.length}</span>
                      <span className="block font-sans text-[10px] text-gray-500">Initiated on completion</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-1">
                      <span className="block font-mono text-[9px] text-gray-500 tracking-wider font-bold uppercase">ACTIVE AUTOPAY</span>
                      <span className="block font-display font-black text-2xl text-green-400">
                        {maintenanceSubs.filter(s => s.status === "Active").length}
                      </span>
                      <span className="block font-sans text-[10px] text-gray-500">Actively monitored</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-1">
                      <span className="block font-mono text-[9px] text-gray-500 tracking-wider font-bold uppercase">MONTHLY RECURRING REVENUE (MRR)</span>
                      <span className="block font-display font-black text-2xl text-arcadia-cyan">
                        ₹{(maintenanceAnalytics?.monthlyRecurringRevenue || maintenanceSubs.reduce((sum, s) => s.status === "Active" ? sum + (s.monthlyPrice || 0) : sum, 0)).toLocaleString("en-IN")}
                      </span>
                      <span className="block font-sans text-[10px] text-gray-500">Projected billing run-rate</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-1">
                      <span className="block font-mono text-[9px] text-red-500 tracking-wider font-bold uppercase">AUTO-DEBIT FAILURES</span>
                      <span className="block font-display font-black text-2xl text-red-400">
                        {maintenanceSubs.reduce((sum, s) => sum + (s.paymentFailures?.length || 0), 0)}
                      </span>
                      <span className="block font-sans text-[10px] text-gray-500">Requires client action</span>
                    </div>
                  </div>

                  {/* FILTERS PANEL */}
                  <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative w-full md:flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search by project name, ID, or user email..."
                        value={maintSearch}
                        onChange={(e) => setMaintSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white focus:outline-none focus:border-arcadia-cyan"
                      />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto shrink-0">
                      <select
                        value={maintPlanFilter}
                        onChange={(e) => setMaintPlanFilter(e.target.value)}
                        className="flex-1 md:flex-none px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white focus:outline-none"
                      >
                        <option value="all" className="bg-arcadia-dark text-white">All Plans</option>
                        <option value="none" className="bg-arcadia-dark text-white">No Plan Assigned</option>
                        <option value="basic" className="bg-arcadia-dark text-white">Basic Plan</option>
                        <option value="standard" className="bg-arcadia-dark text-white">Standard Plan</option>
                        <option value="advanced" className="bg-arcadia-dark text-white">Advanced Plan</option>
                      </select>

                      <select
                        value={maintStatusFilter}
                        onChange={(e) => setMaintStatusFilter(e.target.value)}
                        className="flex-1 md:flex-none px-3 py-2 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white focus:outline-none"
                      >
                        <option value="all" className="bg-arcadia-dark text-white">All Statuses</option>
                        <option value="No Plan" className="bg-arcadia-dark text-white">No Plan</option>
                        <option value="Pending Subscription" className="bg-arcadia-dark text-white">Pending</option>
                        <option value="Active" className="bg-arcadia-dark text-white">Active</option>
                        <option value="Paused" className="bg-arcadia-dark text-white">Paused</option>
                        <option value="Payment Failed" className="bg-arcadia-dark text-white">Payment Failed</option>
                        <option value="Cancelled" className="bg-arcadia-dark text-white">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* CONTRACTS TABLE */}
                  <div className="overflow-x-auto bg-white/[0.01] border border-white/5 rounded-2xl">
                    {isAdminDataLoading ? (
                      <TableSkeleton rows={4} cols={5} />
                    ) : maintenanceSubs.filter(sub => {
                      const matchesSearch = !maintSearch || 
                        sub.projectName?.toLowerCase().includes(maintSearch.toLowerCase()) ||
                        sub.id?.toLowerCase().includes(maintSearch.toLowerCase()) ||
                        sub.userEmail?.toLowerCase().includes(maintSearch.toLowerCase());
                      const matchesPlan = maintPlanFilter === "all" || sub.planId === maintPlanFilter;
                      const matchesStatus = maintStatusFilter === "all" || sub.status === maintStatusFilter;
                      return matchesSearch && matchesPlan && matchesStatus;
                    }).length === 0 ? (
                      <div className="p-8 text-center text-gray-500 font-sans text-xs">
                        No maintenance contracts found matching current filter query.
                      </div>
                    ) : (
                      <table className="w-full text-left font-sans text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-gray-500">
                            <th className="py-3 px-4">Contract Details</th>
                            <th className="py-3 px-4">Client User</th>
                            <th className="py-3 px-4">Assigned Plan</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Next Renewal</th>
                            <th className="py-3 px-4 text-center">AutoPay Simulation Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {maintenanceSubs
                            .filter(sub => {
                              const matchesSearch = !maintSearch || 
                                sub.projectName?.toLowerCase().includes(maintSearch.toLowerCase()) ||
                                sub.id?.toLowerCase().includes(maintSearch.toLowerCase()) ||
                                sub.userEmail?.toLowerCase().includes(maintSearch.toLowerCase());
                              const matchesPlan = maintPlanFilter === "all" || sub.planId === maintPlanFilter;
                              const matchesStatus = maintStatusFilter === "all" || sub.status === maintStatusFilter;
                              return matchesSearch && matchesPlan && matchesStatus;
                            })
                            .map((sub: any) => (
                              <tr key={sub.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                                <td className="py-3.5 px-4 space-y-0.5">
                                  <span className="font-display font-black text-white block">{sub.projectName}</span>
                                  <span className="font-mono text-[9px] text-gray-500 block">ID: {sub.id}</span>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
                                  {sub.userEmail}
                                </td>
                                <td className="py-3.5 px-4">
                                  {sub.planId === "none" ? (
                                    <span className="text-gray-500 font-sans italic text-[11px]">Unassigned</span>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <span className="font-sans font-bold text-white text-xs block">{sub.planName}</span>
                                      <span className="font-mono text-[10px] text-arcadia-cyan block">₹{sub.monthlyPrice}/mo</span>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase ${
                                    sub.status === "Active" ? "bg-green-500/10 border border-green-500/20 text-green-400" :
                                    sub.status === "Paused" ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" :
                                    sub.status === "Payment Failed" ? "bg-red-500/10 border border-red-500/20 text-red-400" :
                                    sub.status === "Cancelled" ? "bg-rose-500/10 border border-rose-500/20 text-rose-400" :
                                    sub.status === "Pending Subscription" ? "bg-blue-500/10 border border-blue-500/20 text-blue-400" :
                                    "bg-white/5 border border-white/10 text-gray-400"
                                  }`}>
                                    ● {sub.status || "No Plan"}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
                                  {sub.nextRenewalDate ? new Date(sub.nextRenewalDate).toLocaleDateString("en-IN") : "N/A"}
                                </td>
                                <td className="py-3.5 px-4 space-y-1 text-center">
                                  <div className="flex justify-center gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedMaintSub(sub);
                                        setMaintPlanForm({
                                          planId: sub.planId || "none",
                                          planName: sub.planName || "No Plan Assigned",
                                          monthlyPrice: sub.monthlyPrice || 0,
                                          status: sub.status || "No Plan"
                                        });
                                        setIsMaintPlanModalOpen(true);
                                      }}
                                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white font-sans text-[10px] font-bold cursor-pointer"
                                    >
                                      Plan
                                    </button>
                                    
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedMaintSub(sub);
                                        setMaintRenewalDateVal(sub.nextRenewalDate ? sub.nextRenewalDate.split("T")[0] : "");
                                        setIsMaintRenewalModalOpen(true);
                                      }}
                                      className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white font-sans text-[10px] font-bold cursor-pointer"
                                    >
                                      Date
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleSendRenewalReminder(sub.id)}
                                      className="px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-sans text-[10px] font-bold cursor-pointer"
                                      title="Send automated renewal notice email to client"
                                    >
                                      Email Alert
                                    </button>

                                    {["Active", "Paused"].includes(sub.status) && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleSimulateDebit(sub.id, true, sub.monthlyPrice)}
                                          className="px-2 py-1 rounded bg-green-500/15 hover:bg-green-500/25 text-green-400 font-sans text-[10px] font-black cursor-pointer"
                                          title="Simulate successful monthly auto-debit charge"
                                        >
                                          Debit: OK
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSimulateDebit(sub.id, false, sub.monthlyPrice)}
                                          className="px-2 py-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-400 font-sans text-[10px] font-black cursor-pointer"
                                          title="Simulate failed monthly auto-debit charge"
                                        >
                                          Debit: FAIL
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
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
                        {isAdminDataLoading ? (
                          <tr>
                            <td colSpan={5} className="py-4 px-2">
                              <TableSkeleton rows={4} cols={5} />
                            </td>
                          </tr>
                        ) : orders.length === 0 ? (
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
                  {/* Tab Header with Stats & Actions */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
                    <div>
                      <h3 className="font-display font-black text-lg text-white tracking-wide">SECURE USER & ROLE REGISTRY</h3>
                      <p className="font-sans text-xs text-gray-500">Supervise system credentials, suspend accounts, and assign custom security claims.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="px-3.5 py-1.5 rounded-full bg-arcadia-blue/10 border border-arcadia-blue/20 text-arcadia-cyan text-[11px] font-mono font-bold">
                        TOTAL: {usersList.length} DIRECTORY RECORDS
                      </div>
                      <AnimatedButton
                        onClick={() => setIsCreateUserModalOpen(true)}
                        className="px-4 py-2 rounded-full bg-green-600 hover:bg-green-500 text-white font-display text-[10px] font-bold tracking-wider uppercase transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Secure Member</span>
                      </AnimatedButton>
                    </div>
                  </div>

                  {/* Search and Filters Panel */}
                  <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative w-full md:flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search users by name, email, or unique ID..."
                        value={searchUserQuery}
                        onChange={(e) => setSearchUserQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#090a0f] border border-white/5 focus:border-white/20 text-xs text-white placeholder-gray-500 font-sans outline-none transition"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                      {/* Role Filter */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-gray-500 uppercase">Role:</span>
                        <select
                          value={roleFilter}
                          onChange={(e) => setRoleFilter(e.target.value)}
                          className="bg-[#090a0f] border border-white/5 hover:border-white/10 rounded-xl px-3 py-2 text-xs font-sans text-gray-300 cursor-pointer outline-none transition"
                        >
                          <option value="All">All Roles</option>
                          <option value="Super Admin">Super Admin</option>
                          <option value="Admin">Admin</option>
                          <option value="Manager">Manager</option>
                          <option value="Staff">Staff</option>
                          <option value="Customer">Customer</option>
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-gray-500 uppercase">Status:</span>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="bg-[#090a0f] border border-white/5 hover:border-white/10 rounded-xl px-3 py-2 text-xs font-sans text-gray-300 cursor-pointer outline-none transition"
                        >
                          <option value="All">All Statuses</option>
                          <option value="active">Active Only</option>
                          <option value="suspended">Suspended Only</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Users Directory Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {isAdminDataLoading ? (
                      <div className="col-span-full">
                        <GridSkeleton count={3} />
                      </div>
                    ) : (() => {
                      const filtered = usersList.filter((u) => {
                        const q = searchUserQuery.toLowerCase().trim();
                        const matchesSearch = 
                          !q || 
                          (u.name || "").toLowerCase().includes(q) || 
                          (u.email || "").toLowerCase().includes(q) || 
                          (u.id || "").toLowerCase().includes(q);
                        
                        const r = u.role || "Customer";
                        const matchesRole = roleFilter === "All" || r === roleFilter || (roleFilter === "Admin" && r === "admin");
                        
                        const s = u.status || "active";
                        const matchesStatus = statusFilter === "All" || s === statusFilter;

                        return matchesSearch && matchesRole && matchesStatus;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="col-span-full text-center py-16 rounded-2xl bg-white/[0.01] border border-white/5">
                            <Users className="w-10 h-10 text-gray-600 mx-auto mb-3 animate-pulse" />
                            <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest">
                              No credential profiles match the active filter criteria.
                            </p>
                          </div>
                        );
                      }

                      return filtered.map((userItem) => {
                        const roleStr = userItem.role || "Customer";
                        const statusStr = userItem.status || "active";
                        
                        // Select role badge styles
                        let roleBadgeClass = "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
                        if (roleStr === "Super Admin") roleBadgeClass = "bg-red-500/10 text-red-400 border border-red-500/20";
                        else if (roleStr === "Admin" || roleStr === "admin") roleBadgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                        else if (roleStr === "Manager") roleBadgeClass = "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
                        else if (roleStr === "Staff") roleBadgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";

                        return (
                          <div key={userItem.id} className={`p-5 rounded-2xl bg-[#090a0f]/40 backdrop-blur-md border ${statusStr === "suspended" ? "border-red-500/20 hover:border-red-500/30" : "border-white/5 hover:border-white/10"} transition-all flex flex-col justify-between gap-4 relative overflow-hidden group`}>
                            {statusStr === "suspended" && (
                              <div className="absolute top-0 right-0 bg-red-600 text-white font-mono text-[8px] font-black uppercase px-3.5 py-1 rounded-bl-xl tracking-wider">
                                Suspended
                              </div>
                            )}

                            <div className="flex items-start gap-3.5">
                              <img
                                src={userItem.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"}
                                alt={userItem.name}
                                className="w-12 h-12 rounded-full border border-white/15 object-cover shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-display font-black text-sm text-white truncate max-w-[120px] sm:max-w-none">{userItem.name}</h4>
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono uppercase tracking-wider font-bold ${roleBadgeClass}`}>
                                    {roleStr === "admin" ? "Admin" : roleStr}
                                  </span>
                                </div>
                                <p className="font-mono text-[10px] text-gray-400 truncate mt-0.5" title={userItem.email}>{userItem.email}</p>
                                <span className="block font-mono text-[8px] text-gray-500 mt-1 uppercase">
                                  ID: {userItem.id}
                                </span>
                              </div>
                            </div>

                            {/* User details footer & administrative actions */}
                            <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
                              <div className="flex justify-between items-center text-[9px] font-mono uppercase text-gray-500">
                                <span>Joined Directory</span>
                                <span className="text-gray-300">{new Date(userItem.createdAt || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                              </div>

                              <div className="flex justify-between items-center text-[9px] font-mono uppercase text-gray-500">
                                <span>Status Claim</span>
                                <span className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusStr === "suspended" ? "bg-red-500" : "bg-green-500 animate-pulse"}`} />
                                  <span className={statusStr === "suspended" ? "text-red-400 font-black" : "text-green-400 font-bold"}>
                                    {statusStr.toUpperCase()}
                                  </span>
                                </span>
                              </div>

                              {/* Action Row */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-white/[0.02]">
                                {/* Change Role dropdown */}
                                <div className="flex-1 min-w-[90px]">
                                  <select
                                    value={roleStr}
                                    onChange={(e) => handleChangeRole(userItem.id, e.target.value)}
                                    className="w-full bg-white/[0.02] hover:bg-white/5 border border-white/10 rounded-lg py-1 px-2 text-[10px] font-mono text-gray-300 cursor-pointer outline-none transition"
                                    title="Modify User Role"
                                  >
                                    <option value="Customer">Customer</option>
                                    <option value="Staff">Staff</option>
                                    <option value="Manager">Manager</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Super Admin">Super Admin</option>
                                  </select>
                                </div>

                                {/* Reset Password Icon Button */}
                                <button
                                  onClick={() => {
                                    setSelectedUserForReset(userItem);
                                    setIsResetPasswordModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                                  title="Force Password Reset"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>

                                {/* Suspend Icon Button */}
                                <button
                                  onClick={() => handleToggleSuspend(userItem.id, statusStr)}
                                  className={`p-1.5 rounded-lg border transition cursor-pointer ${statusStr === "suspended" ? "border-green-500/20 bg-green-500/5 text-green-400 hover:bg-green-500/10" : "border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10"}`}
                                  title={statusStr === "suspended" ? "Unsuspend Account" : "Suspend Account"}
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Button */}
                                <button
                                  onClick={() => handleDeleteUser(userItem.id, userItem.email)}
                                  className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                                  title="Permanently Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* CREATE USER MODAL */}
                  {isCreateUserModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-md">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md p-6 rounded-3xl bg-[#0b0d13] border border-white/10 shadow-2xl relative"
                      >
                        <h4 className="font-display font-black text-lg text-white mb-1 uppercase tracking-wide">Register Secure Directory Member</h4>
                        <p className="font-sans text-xs text-gray-500 mb-6">Create credentials and apply custom security claims directly.</p>

                        <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                          <div>
                            <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Profile Name</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Vikram Malhotra"
                              value={createUserForm.name}
                              onChange={(e) => setCreateUserForm({ ...createUserForm, name: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-white/20 text-xs text-white outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Corporate Email Address</label>
                            <input
                              type="email"
                              required
                              placeholder="e.g. user@arcadia.agency"
                              value={createUserForm.email}
                              onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-white/20 text-xs text-white outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Initial Security Password</label>
                            <input
                              type="password"
                              required
                              placeholder="At least 8 strong keys..."
                              value={createUserForm.password}
                              onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-white/20 text-xs text-white outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Administrative Claim Role</label>
                            <select
                              value={createUserForm.role}
                              onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-white/20 text-xs text-white outline-none transition cursor-pointer"
                            >
                              <option value="Customer">Customer</option>
                              <option value="Staff">Staff</option>
                              <option value="Manager">Manager</option>
                              <option value="Admin">Admin</option>
                              <option value="Super Admin">Super Admin</option>
                            </select>
                          </div>

                          <div className="flex gap-3 pt-4">
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreateUserModalOpen(false);
                                setCreateUserForm({ email: "", name: "", password: "", role: "Customer" });
                              }}
                              className="flex-1 py-3 rounded-xl border border-white/10 hover:border-white/20 text-xs text-gray-400 hover:text-white transition cursor-pointer font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition cursor-pointer shadow-[0_4px_15px_rgba(22,163,74,0.3)]"
                            >
                              Authorize Profile
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    </div>
                  )}

                  {/* RESET PASSWORD MODAL */}
                  {isResetPasswordModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-md">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-sm p-6 rounded-3xl bg-[#0b0d13] border border-white/10 shadow-2xl relative"
                      >
                        <h4 className="font-display font-black text-lg text-white mb-1 uppercase tracking-wide">Force Security Password Reset</h4>
                        <p className="font-sans text-xs text-gray-500 mb-6">Specify a new secure credential pass for <span className="text-white font-bold">{selectedUserForReset?.email}</span>. This will immediately invalidate all active sessions.</p>

                        <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                          <div>
                            <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">New Security Password</label>
                            <input
                              type="password"
                              required
                              placeholder="Minimum 8 characters..."
                              value={newPasswordResetVal}
                              onChange={(e) => setNewPasswordResetVal(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/5 focus:border-white/20 text-xs text-white outline-none transition"
                            />
                          </div>

                          <div className="flex gap-3 pt-4">
                            <button
                              type="button"
                              onClick={() => {
                                setIsResetPasswordModalOpen(false);
                                setSelectedUserForReset(null);
                                setNewPasswordResetVal("");
                              }}
                              className="flex-1 py-3 rounded-xl border border-white/10 hover:border-white/20 text-xs text-gray-400 hover:text-white transition cursor-pointer font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition cursor-pointer shadow-[0_4px_15px_rgba(217,119,6,0.3)]"
                            >
                              Update Passkey
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    </div>
                  )}
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
                        {isAdminDataLoading ? (
                          <tr>
                            <td colSpan={4} className="py-4 px-2">
                              <TableSkeleton rows={4} cols={4} />
                            </td>
                          </tr>
                        ) : bookings.length === 0 ? (
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
                      <h3 className="font-display font-black text-lg text-white">PROJECTS PANEL</h3>
                      <p className="font-sans text-xs text-gray-500">Edit, add or prune portfolio entries.</p>
                    </div>
                    <AnimatedButton
                      onClick={() => setIsCreatingNew("project")}
                      className="px-3.5 py-1.5 rounded-full bg-arcadia-blue hover:bg-blue-600 text-white text-xs font-bold tracking-wide flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(47,128,255,0.3)]"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Project</span>
                    </AnimatedButton>
                  </div>

                  {/* Create / Edit Project Form */}
                  {(isCreatingNew === "project" || (isEditing && isEditing.type === "project")) && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-[#0d111c] border border-arcadia-blue/30 mb-6">
                      <h4 className="font-display font-bold text-sm text-white mb-4">
                        {isCreatingNew === "project" ? "Create New Portfolio Project" : `Edit Portfolio Project: ${isEditing.data.title}`}
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
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Preview Image URL</label>
                          <input
                            type="text"
                            required
                            placeholder="Unsplash image URL..."
                            value={projectForm.imageUrl}
                            onChange={e => setProjectForm({ ...projectForm, imageUrl: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-white"
                          />
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
                    {isAdminDataLoading ? (
                      <GridSkeleton count={2} />
                    ) : inquiries.length === 0 ? (
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
                    {isAdminDataLoading ? (
                      <GridSkeleton count={2} />
                    ) : applications.length === 0 ? (
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
                              <iframe
                                srcDoc={selectedEmail.body}
                                sandbox="allow-popups"
                                title="Email Preview"
                                className="w-full min-h-[350px] bg-[#0d0f12] border-0"
                              />
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

              {/* TAB FIREBASE CRASHLYTICS */}
              {activeTab === "crashlytics" && (
                <div className="space-y-6">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">Firebase Crashlytics</h3>
                      <p className="font-sans text-xs text-gray-500">Real-time application health metrics, exception logs, and stack-trace diagnostic debugger.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <AnimatedButton
                        id="trigger-test-exception-btn"
                        onClick={() => {
                          try {
                            const testError = new Error("Test Crashlytics Exception: Client-side diagnostic triggers fine!");
                            recordException(testError, "error");
                            if (onShowToast) {
                              onShowToast("success", "Captured test exception in Crashlytics!");
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-sans text-xs font-semibold flex items-center gap-2 hover:bg-rose-500/20 transition-all cursor-pointer"
                      >
                        <ShieldAlert className="w-4 h-4 shrink-0 animate-bounce" />
                        <span>Force Trigger Test Exception</span>
                      </AnimatedButton>
                    </div>
                  </div>

                  {/* Crash Metrics Summary Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p className="font-sans text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Exceptions</p>
                      <h4 className="font-display font-black text-2xl text-white mt-1">{totalCrashesCount}</h4>
                      <p className="font-sans text-[10px] text-emerald-400/80 mt-1 flex items-center gap-1">● Live Listening Active</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p className="font-sans text-[10px] text-gray-500 uppercase font-bold tracking-wider">Fatal Rejections</p>
                      <h4 className="font-display font-black text-2xl text-rose-500 mt-1">
                        {fatalCrashesCount}
                      </h4>
                      <p className="font-sans text-[10px] text-gray-500 mt-1">Immediate action needed</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p className="font-sans text-[10px] text-gray-500 uppercase font-bold tracking-wider">Open Incidents</p>
                      <h4 className="font-display font-black text-2xl text-amber-500 mt-1">
                        {openCrashesCount}
                      </h4>
                      <p className="font-sans text-[10px] text-gray-500 mt-1">Awaiting investigation</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <p className="font-sans text-[10px] text-gray-500 uppercase font-bold tracking-wider">Resolved Issues</p>
                      <h4 className="font-display font-black text-2xl text-green-500 mt-1">
                        {resolvedCrashesCount}
                      </h4>
                      <p className="font-sans text-[10px] text-gray-500 mt-1">Successfully debugged</p>
                    </div>
                  </div>

                  {/* Database Sync Card */}
                  <div className="p-5 rounded-3xl bg-arcadia-blue/5 border border-arcadia-blue/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
                        <Database className="w-4 h-4 text-arcadia-cyan" />
                        <span>Firestore Database Synchronization Status</span>
                      </h4>
                      <p className="font-sans text-xs text-gray-400">
                        The website keeps an in-memory database mirrored in real-time with the active Cloud Firestore instance.
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-gray-500 pt-1">
                        <div>
                          <span className="text-gray-600">PROJECT ID:</span>{" "}
                          <span className="text-arcadia-cyan">{(window as any).FIREBASE_CONFIG?.projectId || "arcadia-developers"}</span>
                        </div>
                        <div className="hidden md:block text-gray-700">|</div>
                        <div>
                          <span className="text-gray-600">DATABASE ID:</span>{" "}
                          <span className="text-arcadia-blue">{(window as any).FIREBASE_CONFIG?.firestoreDatabaseId || "(default)"}</span>
                        </div>
                      </div>
                      {syncResults && (
                        <p className="font-mono text-[10px] text-green-400 pt-2">
                          ✓ Last sync succeeded! Processed {syncResults.totalCount} collections ({syncResults.successCount} backed up, {syncResults.failCount} failed).
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleForceSyncDb}
                      disabled={syncingDb}
                      className={`px-5 py-2.5 rounded-xl font-display text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                        syncingDb
                          ? "bg-white/10 text-gray-500 cursor-not-allowed"
                          : "bg-arcadia-blue hover:bg-[#1a5bbf] text-white shadow-lg cursor-pointer"
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingDb ? "animate-spin" : ""}`} />
                      <span>{syncingDb ? "Synchronizing..." : "Force Sync Local DB to Firestore"}</span>
                    </button>
                  </div>

                  {/* Interactive Filtering and Lists Split Console */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT LIST PANEL */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Controls Box */}
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-xs text-gray-300">Filtering Engine</span>
                          <span className="font-mono text-[10px] text-gray-500">Page {crashPage} • {totalCrashesCount} total</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="font-sans text-[10px] text-gray-500 block mb-1">Severity</label>
                            <select
                              id="crash-severity-filter"
                              value={crashSeverityFilter}
                              onChange={(e) => {
                                setCrashSeverityFilter(e.target.value);
                                setCrashPage(1);
                                setPageCursors([null]);
                                setSelectedCrash(null);
                              }}
                              className="w-full bg-[#0d0f12] border border-white/5 rounded-lg px-2 py-1.5 font-sans text-xs text-white focus:outline-none focus:ring-1 focus:ring-arcadia-blue"
                            >
                              <option value="all">All</option>
                              <option value="fatal">Fatal</option>
                              <option value="error">Error</option>
                              <option value="warning">Warning</option>
                            </select>
                          </div>
                          <div>
                            <label className="font-sans text-[10px] text-gray-500 block mb-1">Status</label>
                            <select
                              id="crash-status-filter"
                              value={crashStatusFilter}
                              onChange={(e) => {
                                setCrashStatusFilter(e.target.value);
                                setCrashPage(1);
                                setPageCursors([null]);
                                setSelectedCrash(null);
                              }}
                              className="w-full bg-[#0d0f12] border border-white/5 rounded-lg px-2 py-1.5 font-sans text-xs text-white focus:outline-none focus:ring-1 focus:ring-arcadia-blue"
                            >
                              <option value="all">All</option>
                              <option value="open">Open</option>
                              <option value="resolved">Resolved</option>
                              <option value="ignored">Ignored</option>
                            </select>
                          </div>
                          <div>
                            <label className="font-sans text-[10px] text-gray-500 block mb-1">Page Size</label>
                            <select
                              id="crash-limit-filter"
                              value={crashLimit}
                              onChange={(e) => {
                                setCrashLimit(Number(e.target.value));
                                setCrashPage(1);
                                setPageCursors([null]);
                                setSelectedCrash(null);
                              }}
                              className="w-full bg-[#0d0f12] border border-white/5 rounded-lg px-2 py-1.5 font-sans text-xs text-white focus:outline-none focus:ring-1 focus:ring-arcadia-blue"
                            >
                              <option value={5}>5 items</option>
                              <option value={10}>10 items</option>
                              <option value={20}>20 items</option>
                              <option value={50}>50 items</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Crash Log Scroller List */}
                      <div className="rounded-2xl border border-white/5 overflow-hidden max-h-[500px] overflow-y-auto space-y-2 pr-1">
                        {loadingCrashes ? (
                          <div className="p-12 text-center text-gray-500 text-xs flex flex-col items-center justify-center gap-3">
                            <RefreshCw className="w-5 h-5 animate-spin text-arcadia-blue" />
                            <span>Retrieving real-time incidents from Firestore...</span>
                          </div>
                        ) : loadingCrashesError ? (
                          <div className="p-8 text-center text-red-400 text-xs font-mono">
                            {loadingCrashesError}
                          </div>
                        ) : crashReports.length === 0 ? (
                          <div className="p-8 text-center text-gray-500 text-xs">
                            No crash reports matching current filters.
                          </div>
                        ) : (
                          crashReports.map(report => {
                            const isSelected = selectedCrash?.id === report.id;
                            return (
                              <div
                                key={report.id}
                                onClick={() => setSelectedCrash(report)}
                                className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                                  isSelected
                                    ? "bg-rose-500/5 border-rose-500/30 shadow-md shadow-rose-500/5"
                                    : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03]"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                                    report.severity === "fatal" 
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                                      : report.severity === "warning"
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                      : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                  }`}>
                                    {report.severity}
                                  </span>
                                  
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-sans font-medium uppercase tracking-tight ${
                                    report.status === "resolved" 
                                      ? "bg-emerald-500/10 text-emerald-400" 
                                      : report.status === "ignored"
                                      ? "bg-gray-500/10 text-gray-400"
                                      : "bg-amber-500/10 text-amber-400"
                                  }`}>
                                    {report.status}
                                  </span>
                                </div>
                                <p className="font-sans text-xs font-bold text-white truncate max-w-full">
                                  {report.message}
                                </p>
                                <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2 font-mono">
                                  <span className="truncate max-w-[120px]">{report.userEmail || "anonymous"}</span>
                                  <span>{report.createdAt ? new Date(report.createdAt).toLocaleTimeString() : "N/A"}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Pagination Bar */}
                      <div className="flex items-center justify-between p-3 bg-white/[0.01] border border-white/5 rounded-2xl">
                        <button
                          type="button"
                          id="crash-prev-page"
                          disabled={crashPage === 1 || loadingCrashes}
                          onClick={() => setCrashPage(p => Math.max(1, p - 1))}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 text-gray-300 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                        >
                          Previous
                        </button>
                        <span className="font-mono text-[10px] text-gray-500">
                          Page {crashPage} of {Math.ceil(totalCrashesCount / crashLimit) || 1}
                        </span>
                        <button
                          type="button"
                          id="crash-next-page"
                          disabled={!hasNextCrashPage || loadingCrashes}
                          onClick={() => setCrashPage(p => p + 1)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 text-gray-300 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>

                    {/* RIGHT WORKSPACE CONSOLE DETAILS */}
                    <div className="lg:col-span-7">
                      {selectedCrash ? (
                        <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-6 text-left">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                            <div>
                              <h4 className="font-display font-bold text-sm text-white">Incident Details</h4>
                              <p className="font-mono text-[10px] text-gray-500 uppercase mt-0.5">{selectedCrash.id}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                id="crash-delete-btn"
                                onClick={() => handleDeleteCrashReport(selectedCrash.id)}
                                className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl hover:bg-red-500/20 transition cursor-pointer"
                                title="Purge Crash Log"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Quick Edit Status Row */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="font-sans text-[10px] text-gray-500 block mb-1">Change Status</label>
                              <select
                                id="selected-crash-status"
                                value={selectedCrash.status}
                                onChange={(e) => handleUpdateCrashStatus(selectedCrash.id, e.target.value)}
                                className="w-full bg-[#0d0f12] border border-white/5 rounded-lg px-2 py-1.5 font-sans text-xs text-white focus:outline-none focus:ring-1 focus:ring-arcadia-blue"
                              >
                                <option value="open">Open</option>
                                <option value="resolved">Resolved</option>
                                <option value="ignored">Ignored</option>
                              </select>
                            </div>
                            <div className="col-span-2">
                              <label className="font-sans text-[10px] text-gray-500 block mb-1">Diagnostics Context</label>
                              <div className="p-2 bg-[#0d0f12] border border-white/5 rounded-lg font-mono text-[10px] text-gray-400 truncate">
                                Route: <span className="text-white">{selectedCrash.route}</span>
                              </div>
                            </div>
                          </div>

                          {/* General Information Metadata Table */}
                          <div className="rounded-xl border border-white/5 overflow-hidden font-sans text-xs bg-black/20">
                            <div className="grid grid-cols-3 border-b border-white/5 p-3">
                              <span className="text-gray-500">Exception Message</span>
                              <span className="col-span-2 text-white font-medium break-all">{selectedCrash.message}</span>
                            </div>
                            <div className="grid grid-cols-3 border-b border-white/5 p-3">
                              <span className="text-gray-500">Active User</span>
                              <span className="col-span-2 text-white font-medium">{selectedCrash.userEmail || "anonymous"}</span>
                            </div>
                            <div className="grid grid-cols-3 border-b border-white/5 p-3">
                              <span className="text-gray-500">Target Path/URL</span>
                              <span className="col-span-2 text-white font-mono text-[10px] break-all">{selectedCrash.url}</span>
                            </div>
                            <div className="grid grid-cols-3 border-b border-white/5 p-3">
                              <span className="text-gray-500">Browser User-Agent</span>
                              <span className="col-span-2 text-gray-400 font-mono text-[9px] break-all">{selectedCrash.userAgent}</span>
                            </div>
                            <div className="grid grid-cols-3 p-3">
                              <span className="text-gray-500">Reported Timestamp</span>
                              <span className="col-span-2 text-white font-medium">
                                {new Date(selectedCrash.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Trace Stack Box */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="font-sans text-[10px] text-gray-500 uppercase font-bold tracking-wider">Trace Call Stack</label>
                              <button
                                type="button"
                                id="copy-trace-btn"
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedCrash.stack || "");
                                  if (onShowToast) onShowToast("success", "Stack trace copied!");
                                }}
                                className="font-sans text-[10px] text-arcadia-blue hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy Full Trace</span>
                              </button>
                            </div>
                            <div className="p-4 bg-[#050608] border border-white/5 rounded-xl overflow-x-auto max-h-[250px] overflow-y-auto shadow-inner">
                              <pre className="font-mono text-[9px] text-rose-400/90 whitespace-pre text-left leading-relaxed">
                                {selectedCrash.stack || "No stack trace generated for this record."}
                              </pre>
                            </div>
                          </div>

                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/5 h-[65vh] flex flex-col items-center justify-center text-center p-8 bg-white/[0.001]">
                          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-full mb-4">
                            <ShieldAlert className="w-8 h-8 text-rose-500/40 animate-pulse" />
                          </div>
                          <h4 className="font-display font-bold text-sm text-gray-400">CRASHLYTICS DEBUGGER</h4>
                          <p className="font-sans text-xs text-gray-500 mt-2 max-w-sm">
                            Select any uncaught runtime exception or trace rejection log from the real-time stream on the left to debug variables and trace call stacks.
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* TAB SEO METADATA */}
              {activeTab === "seo" && (
                <div className="space-y-6 text-left">
                  {/* Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">SEO Metadata Console</h3>
                      <p className="font-sans text-xs text-gray-500">Dynamically update site-wide search indexes, route meta tags, OpenGraph cards, and search crawler keywords.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <AnimatedButton
                        onClick={fetchSeoSettings}
                        disabled={loadingSeo}
                        className="p-2.5 rounded-xl border border-white/10 text-xs font-semibold hover:bg-white/5 transition flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-4 h-4 text-arcadia-cyan ${loadingSeo ? "animate-spin" : ""}`} />
                      </AnimatedButton>
                      <AnimatedButton
                        onClick={() => handleOpenSeoModal(null)}
                        className="px-4 py-2 rounded-xl bg-arcadia-blue hover:bg-arcadia-blue/80 text-white font-sans text-xs font-semibold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(47,128,255,0.4)] transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>Add SEO Config</span>
                      </AnimatedButton>
                    </div>
                  </div>

                  {/* Settings Content Area */}
                  {loadingSeo && seoSettings.length === 0 ? (
                    <TableSkeleton rows={4} cols={5} />
                  ) : seoError ? (
                    <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
                      <p className="font-sans text-sm font-semibold">Error Loading SEO Configurations</p>
                      <p className="font-mono text-xs mt-1 text-red-300">{seoError}</p>
                    </div>
                  ) : seoSettings.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/5 py-12 flex flex-col items-center justify-center text-center p-8 bg-white/[0.001]">
                      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-full mb-4">
                        <Globe className="w-8 h-8 text-arcadia-cyan/40 animate-pulse" />
                      </div>
                      <h4 className="font-display font-bold text-sm text-gray-400">NO SEO OVERRIDES</h4>
                      <p className="font-sans text-xs text-gray-500 mt-2 max-w-sm">
                        Create your first custom SEO entry to override the default page title, description, and preview image for specific application routes.
                      </p>
                      <AnimatedButton
                        onClick={() => handleOpenSeoModal(null)}
                        className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs text-white font-semibold flex items-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5 text-arcadia-cyan" />
                        <span>Configure Route</span>
                      </AnimatedButton>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {seoSettings.map((seo) => (
                        <div
                          key={seo.id}
                          className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
                        >
                          <div className="space-y-3 flex-1 min-w-0">
                            {/* Route Indicator & Status */}
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="font-mono text-xs text-arcadia-cyan bg-arcadia-cyan/10 border border-arcadia-cyan/20 px-2.5 py-0.5 rounded-full font-bold">
                                {seo.route === "*" || seo.route === "default" ? "Site-wide (Default)" : seo.route}
                              </span>
                              <span className={`font-sans text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                seo.status === "Published"
                                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                  : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                              }`}>
                                {seo.status}
                              </span>
                              {seo.updatedAt && (
                                <span className="font-mono text-[9px] text-gray-500">
                                  Updated: {new Date(seo.updatedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {/* Meta title and Description */}
                            <div>
                              <h4 className="font-display font-bold text-sm text-white truncate">{seo.title}</h4>
                              <p className="font-sans text-xs text-gray-400 mt-1 line-clamp-2 max-w-3xl leading-relaxed">
                                {seo.description || "No description set."}
                              </p>
                            </div>

                            {/* Keywords and OG Image Indicator */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {seo.keywords && seo.keywords.length > 0 ? (
                                seo.keywords.map((kw, i) => (
                                  <span key={i} className="font-sans text-[9px] bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded-md">
                                    {kw}
                                  </span>
                                ))
                              ) : (
                                <span className="font-sans text-[9px] text-gray-600">No search keywords set</span>
                              )}
                            </div>
                          </div>

                          {/* Image preview thumbnail & Actions */}
                          <div className="flex items-center gap-4 shrink-0 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-white/5 pt-4 lg:pt-0">
                            {seo.ogImage ? (
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-8 rounded-lg overflow-hidden border border-white/10 bg-[#0d0f12]">
                                  <img
                                    src={seo.ogImage}
                                    alt="OG Preview"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                </div>
                                <span className="font-sans text-[10px] text-gray-500">OG Card</span>
                              </div>
                            ) : (
                              <span className="font-sans text-[10px] text-gray-600">No OG Card image</span>
                            )}

                            <div className="flex items-center gap-2">
                              <AnimatedButton
                                onClick={() => handleOpenSeoModal(seo)}
                                className="p-2 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                                title="Edit SEO configuration"
                              >
                                <Edit3 className="w-4 h-4" />
                              </AnimatedButton>
                              <AnimatedButton
                                onClick={() => handleDeleteSeo(seo.id)}
                                className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:text-white hover:bg-red-500/20 transition cursor-pointer"
                                title="Delete SEO override"
                              >
                                <Trash2 className="w-4 h-4" />
                              </AnimatedButton>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB ADMIN MANAGEMENT - Super Admin Only */}
              {activeTab === "admin-management" && role === "Super Admin" && (
                <AdminManagement
                  token={token}
                  currentUserEmail={adminEmail}
                  onShowToast={onShowToast || ((type, msg) => console.log(type, msg))}
                />
              )}

              {/* MAINTENANCE CONTRACT ASSIGNMENT MODAL */}
              <AnimatePresence>
                {isMaintPlanModalOpen && selectedMaintSub && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-md">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="w-full max-w-sm p-6 rounded-3xl bg-[#0b0d13] border border-white/10 shadow-2xl relative"
                    >
                      <h4 className="font-display font-black text-base text-white mb-1 uppercase tracking-wide">Assign Maintenance Plan</h4>
                      <p className="font-sans text-xs text-gray-500 mb-6">Configure the active contract parameters for <strong className="text-white">{selectedMaintSub.projectName}</strong>.</p>

                      <form onSubmit={handleAssignPlan} className="space-y-4">
                        <div>
                          <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Select Subscription Plan</label>
                          <select
                            value={maintPlanForm.planId}
                            onChange={(e) => {
                              const id = e.target.value;
                              let name = "No Plan Assigned";
                              let price = 0;
                              if (id === "basic") { name = "Basic Maintenance"; price = 999; }
                              else if (id === "standard") { name = "Standard Maintenance"; price = 1999; }
                              else if (id === "advanced") { name = "Advanced Maintenance"; price = 2999; }
                              
                              setMaintPlanForm(prev => ({
                                ...prev,
                                planId: id,
                                planName: name,
                                monthlyPrice: price,
                                status: id === "none" ? "No Plan" : prev.status === "No Plan" ? "Pending Subscription" : prev.status
                              }));
                            }}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white focus:outline-none focus:border-arcadia-cyan"
                          >
                            <option value="none" className="bg-arcadia-dark text-white">No Plan Assigned</option>
                            <option value="basic" className="bg-arcadia-dark text-white">Basic Maintenance (₹999/mo)</option>
                            <option value="standard" className="bg-arcadia-dark text-white">Standard Maintenance (₹1,999/mo)</option>
                            <option value="advanced" className="bg-arcadia-dark text-white">Advanced Maintenance (₹2,999/mo)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Rate Overwrite (₹)</label>
                          <input
                            type="number"
                            value={maintPlanForm.monthlyPrice}
                            onChange={(e) => setMaintPlanForm(prev => ({ ...prev, monthlyPrice: parseInt(e.target.value) || 0 }))}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white focus:outline-none focus:border-arcadia-cyan"
                          />
                        </div>

                        <div>
                          <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Status Override</label>
                          <select
                            value={maintPlanForm.status}
                            onChange={(e) => setMaintPlanForm(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white focus:outline-none focus:border-arcadia-cyan"
                          >
                            <option value="No Plan" className="bg-arcadia-dark text-white">No Plan</option>
                            <option value="Pending Subscription" className="bg-arcadia-dark text-white">Pending Subscription</option>
                            <option value="Active" className="bg-arcadia-dark text-white">Active</option>
                            <option value="Paused" className="bg-arcadia-dark text-white">Paused</option>
                            <option value="Payment Failed" className="bg-arcadia-dark text-white">Payment Failed</option>
                            <option value="Cancelled" className="bg-arcadia-dark text-white">Cancelled</option>
                          </select>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => setIsMaintPlanModalOpen(false)}
                            className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 font-sans text-xs font-bold hover:bg-white/5 cursor-pointer text-center"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-2.5 rounded-xl bg-arcadia-blue hover:bg-arcadia-cyan text-white font-sans text-xs font-bold cursor-pointer text-center"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* RENEWAL DATE ADJUSTMENT MODAL */}
              <AnimatePresence>
                {isMaintRenewalModalOpen && selectedMaintSub && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-md">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="w-full max-w-sm p-6 rounded-3xl bg-[#0b0d13] border border-white/10 shadow-2xl relative"
                    >
                      <h4 className="font-display font-black text-base text-white mb-1 uppercase tracking-wide">Adjust Renewal Date</h4>
                      <p className="font-sans text-xs text-gray-500 mb-6">Modify the next recurring debit schedule date for <strong className="text-white">{selectedMaintSub.projectName}</strong>.</p>

                      <form onSubmit={handleChangeRenewalDate} className="space-y-4">
                        <div>
                          <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Next Renewal Date</label>
                          <input
                            type="date"
                            required
                            value={maintRenewalDateVal}
                            onChange={(e) => setMaintRenewalDateVal(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white focus:outline-none focus:border-arcadia-cyan"
                          />
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => setIsMaintRenewalModalOpen(false)}
                            className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 font-sans text-xs font-bold hover:bg-white/5 cursor-pointer text-center"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-2.5 rounded-xl bg-arcadia-blue hover:bg-arcadia-cyan text-white font-sans text-xs font-bold cursor-pointer text-center"
                          >
                            Update Date
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}

                {isSeoModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050505]/80 backdrop-blur-md">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="w-full max-w-lg p-6 rounded-3xl bg-[#0b0d13] border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto"
                    >
                      <h4 className="font-display font-black text-base text-white mb-1 uppercase tracking-wide">
                        {selectedSeo ? "Edit SEO Configuration" : "New SEO Configuration"}
                      </h4>
                      <p className="font-sans text-xs text-gray-500 mb-6">
                        {selectedSeo 
                          ? `Modify metadata override settings for the custom route.` 
                          : "Configure a new route-specific search override or site-wide default metadata."}
                      </p>

                      <form onSubmit={handleSaveSeo} className="space-y-4 text-left">
                        {/* Route Input */}
                        <div>
                          <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Application Route / View ID</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. home, services, pricing, portfolio, or * for site-wide default"
                            value={seoForm.route}
                            onChange={(e) => setSeoForm({ ...seoForm, route: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white focus:outline-none focus:border-arcadia-cyan"
                          />
                          <p className="text-[9px] text-gray-500 mt-1">
                            Must match view identifier (e.g. <code className="text-arcadia-cyan font-bold">home</code>, <code className="text-arcadia-cyan font-bold">services</code>, or <code className="text-arcadia-cyan font-bold">*</code> / <code className="text-arcadia-cyan font-bold">default</code> for site-wide).
                          </p>
                        </div>

                        {/* Title Input */}
                        <div>
                          <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Page Meta Title</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Arcadia | Software Co-Development Hub"
                            value={seoForm.title}
                            onChange={(e) => setSeoForm({ ...seoForm, title: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white focus:outline-none focus:border-arcadia-cyan"
                          />
                        </div>

                        {/* Description Textarea */}
                        <div>
                          <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Page Meta Description</label>
                          <textarea
                            rows={3}
                            placeholder="e.g. Arcadia is an elite software co-development hub bridging world-class creators and high-octane engineering."
                            value={seoForm.description}
                            onChange={(e) => setSeoForm({ ...seoForm, description: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white focus:outline-none focus:border-arcadia-cyan resize-none"
                          />
                        </div>

                        {/* Keywords input */}
                        <div>
                          <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Meta Keywords (Comma Separated)</label>
                          <input
                            type="text"
                            placeholder="e.g. arcadia, co-development, software, next-gen dev"
                            value={seoForm.keywords}
                            onChange={(e) => setSeoForm({ ...seoForm, keywords: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white focus:outline-none focus:border-arcadia-cyan"
                          />
                        </div>

                        {/* OG Image URL */}
                        <div>
                          <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">OpenGraph / Twitter Card Image (URL)</label>
                          <input
                            type="url"
                            placeholder="https://images.unsplash.com/photo-..."
                            value={seoForm.ogImage}
                            onChange={(e) => setSeoForm({ ...seoForm, ogImage: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl font-sans text-xs text-white focus:outline-none focus:border-arcadia-cyan"
                          />
                        </div>

                        {/* Status Select */}
                        <div>
                          <label className="block font-mono text-[9px] text-gray-500 uppercase tracking-wider mb-1.5">Deployment Status</label>
                          <select
                            value={seoForm.status}
                            onChange={(e) => setSeoForm({ ...seoForm, status: e.target.value as "Published" | "Draft" })}
                            className="w-full px-4 py-2.5 bg-[#0d0f12] border border-white/10 rounded-xl font-sans text-xs text-white focus:outline-none focus:border-arcadia-cyan"
                          >
                            <option value="Published">Published (Active)</option>
                            <option value="Draft">Draft (Inactive)</option>
                          </select>
                        </div>

                        {/* Form buttons */}
                        <div className="flex gap-3 pt-4 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => setIsSeoModalOpen(false)}
                            className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 font-sans text-xs font-bold hover:bg-white/5 cursor-pointer text-center"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-2.5 rounded-xl bg-arcadia-blue hover:bg-arcadia-cyan text-white font-sans text-xs font-bold cursor-pointer text-center"
                          >
                            {selectedSeo ? "Save Changes" : "Create Override"}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

            </div>

          </div>
        )}

      </div>
    </section>
  );
}
