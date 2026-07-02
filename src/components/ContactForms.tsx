import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import AnimatedButton from "./ui/animated-button";
import { 
  Calendar, 
  Clock, 
  Video, 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  CheckCircle, 
  CreditCard, 
  Download, 
  Printer, 
  ShieldCheck, 
  Upload,
  User,
  Building,
  Mail,
  Phone,
  Settings,
  DollarSign,
  Lock
} from "lucide-react";
import { generateInvoicePDF } from "../utils/pdfGenerator";
import { Order } from "../types";

interface ContactFormsProps {
  prefilledService: string;
  lang: "en" | "hi";
  onSuccess: (type: "booking" | "order", details: any) => void;
  isClientLoggedIn?: boolean;
  clientEmail?: string;
  clientName?: string;
  onNavigateToLogin?: () => void;
  onClientLogin?: () => void;
}

export default function ContactForms({ 
  prefilledService, 
  lang, 
  onSuccess,
  isClientLoggedIn = false,
  clientEmail = "",
  clientName = "",
  onNavigateToLogin,
  onClientLogin
}: ContactFormsProps) {
  // Booking Form State
  const [bookingData, setBookingData] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    service: prefilledService || "Business Website",
    date: "",
    time: "",
    meetingMode: "Google Meet" as "Google Meet" | "Zoom" | "Phone",
    requirements: ""
  });
  const [bookingStatus, setBookingStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  // Order Placement Multi-Step State
  const [orderStep, setOrderStep] = useState(1);
  const [orderData, setOrderData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    service: prefilledService || "Business Website",
    budget: "7999",
    deadline: "10 Days",
    description: "",
    fileUrl: "",
    fileName: "",
    paymentScreenshot: "",
    paymentScreenshotName: "",
    isPaid: false
  });
  const [orderStatus, setOrderStatus] = useState<"idle" | "processing_payment" | "payment_success" | "submitting" | "success" | "error">("idle");
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [activeOrderDetails, setActiveOrderDetails] = useState<any>(null);

  const SERVICE_PRICES: Record<string, string> = {
    "Landing Page": "2999",
    "Portfolio Website": "4999",
    "Business Website": "7999",
    "Website Redesign": "5999",
    "E-Commerce Website": "19999",
    "Custom Web App": "29999",
    "AI Chatbot": "7999",
    "AI Voice Calling Agent": "24999",
    "UI/UX Design": "5999",
    "Logo Design": "1499",
    "Branding Package": "4999",
    "SEO Optimization": "4999",
    "Website Maintenance": "999"
  };

  const handleServiceChange = (serviceName: string) => {
    const price = SERVICE_PRICES[serviceName] || "7999";
    setOrderData(prev => ({
      ...prev,
      service: serviceName,
      budget: price
    }));
  };

  // Sync prefilled services when props change
  useEffect(() => {
    if (prefilledService) {
      setBookingData(prev => ({ ...prev, service: prefilledService }));
      const price = SERVICE_PRICES[prefilledService] || "7999";
      setOrderData(prev => ({ ...prev, service: prefilledService, budget: price }));
    }
  }, [prefilledService]);

  // Sync client profile details if logged in & check active orders
  useEffect(() => {
    if (isClientLoggedIn && clientEmail) {
      setBookingData(prev => ({ ...prev, name: clientName, email: clientEmail }));
      setOrderData(prev => ({ ...prev, name: clientName, email: clientEmail }));

      const checkActiveOrders = async () => {
        try {
          const clientToken = localStorage.getItem("arcadia_client_token");
          if (!clientToken) return;
          const res = await fetch("/api/client/orders", {
            headers: {
              "Authorization": `Bearer ${clientToken}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            // Check for order that is not Completed and not Cancelled
            const active = data.find((o: any) => o.status !== "Completed" && o.status !== "Cancelled");
            if (active) {
              setHasActiveOrder(true);
              setActiveOrderDetails(active);
            } else {
              setHasActiveOrder(false);
              setActiveOrderDetails(null);
            }
          }
        } catch (err) {
          console.error("Error checking client orders:", err);
        }
      };
      checkActiveOrders();

      const intervalId = setInterval(checkActiveOrders, 5000);
      return () => clearInterval(intervalId);
    } else {
      setHasActiveOrder(false);
      setActiveOrderDetails(null);
    }
  }, [isClientLoggedIn, clientEmail, clientName, orderStatus]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingStatus("submitting");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData)
      });
      if (res.ok) {
        const data = await res.json();
        setBookingStatus("success");
        onSuccess("booking", data);
        setTimeout(() => {
          setBookingStatus("idle");
          setBookingData({
            name: "",
            email: "",
            phone: "",
            businessName: "",
            service: "",
            date: "",
            time: "",
            meetingMode: "Google Meet",
            requirements: ""
          });
        }, 5000);
      } else {
        setBookingStatus("error");
      }
    } catch (err) {
      setBookingStatus("error");
    }
  };

  // Convert files to base64 for submission
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: "fileUrl" | "paymentScreenshot") => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        if (field === "fileUrl") {
          setOrderData(prev => ({ ...prev, fileUrl: reader.result as string, fileName: file.name }));
        } else {
          setOrderData(prev => ({ ...prev, paymentScreenshot: reader.result as string, paymentScreenshotName: file.name }));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Simulated Razorpay payment flow
  const handleRazorpaySimulation = () => {
    setOrderStatus("processing_payment");
    setTimeout(() => {
      setOrderStatus("payment_success");
      setOrderData(prev => ({ ...prev, isPaid: true }));
    }, 2000);
  };

  const handleOrderSubmit = async () => {
    setOrderStatus("submitting");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orderData.name,
          company: orderData.company,
          email: orderData.email,
          phone: orderData.phone,
          service: orderData.service,
          budget: orderData.budget,
          deadline: orderData.deadline,
          description: orderData.description,
          fileUrl: orderData.fileUrl,
          paymentScreenshot: orderData.paymentScreenshot,
          isPaid: orderData.isPaid
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPlacedOrder(data);
        setOrderStatus("success");
        onSuccess("order", data);
      } else {
        setOrderStatus("error");
      }
    } catch (err) {
      setOrderStatus("error");
    }
  };

  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto px-6 py-12 relative z-20">
      
      {/* 1. DEMO CONSULTATION BOOKING */}
      <div 
        id="demo-booking"
        className="rounded-[32px] p-8 bg-arcadia-dark border border-white/5 shadow-2xl relative overflow-hidden flex flex-col justify-between"
      >
        <div className="absolute top-[-5%] right-[-5%] w-[150px] h-[150px] bg-arcadia-blue/10 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2.5 mb-6">
            <div className="p-2 rounded-xl bg-arcadia-blue/10 border border-arcadia-blue/20 text-arcadia-blue">
              <Calendar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-xl text-white">
                {lang === "en" ? "Book Free Demo" : "फ्री डेमो बुक करें"}
              </h3>
              <p className="font-sans text-xs text-gray-400">
                {lang === "en" ? "30-Minute Architecture Briefing" : "30-मिनट का निःशुल्क परामर्श"}
              </p>
            </div>
          </div>

          <form onSubmit={handleBookingSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Your Name</label>
                <input
                  type="text"
                  required
                  value={bookingData.name}
                  onChange={e => setBookingData({ ...bookingData, name: e.target.value })}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Business Name</label>
                <input
                  type="text"
                  required
                  value={bookingData.businessName}
                  onChange={e => setBookingData({ ...bookingData, businessName: e.target.value })}
                  placeholder="e.g. Zenix Systems"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue/50 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Email Address</label>
                <input
                  type="email"
                  required
                  value={bookingData.email}
                  onChange={e => setBookingData({ ...bookingData, email: e.target.value })}
                  placeholder="e.g. aarav@zenix.in"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={bookingData.phone}
                  onChange={e => setBookingData({ ...bookingData, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Service Interested In</label>
              <input
                type="text"
                required
                value={bookingData.service}
                onChange={e => setBookingData({ ...bookingData, service: e.target.value })}
                placeholder="e.g. E-Commerce Website, AI Chatbot"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue/50 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Preferred Date</label>
                <input
                  type="date"
                  required
                  value={bookingData.date}
                  onChange={e => setBookingData({ ...bookingData, date: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-arcadia-blue/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Preferred Time</label>
                <input
                  type="time"
                  required
                  value={bookingData.time}
                  onChange={e => setBookingData({ ...bookingData, time: e.target.value })}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-arcadia-blue/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Meeting Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Google Meet", "Zoom", "Phone"] as const).map(mode => (
                  <AnimatedButton
                    key={mode}
                    type="button"
                    onClick={() => setBookingData({ ...bookingData, meetingMode: mode })}
                    className={`py-2.5 rounded-xl border text-[11px] font-semibold transition ${
                      bookingData.meetingMode === mode
                        ? "bg-arcadia-blue/10 border-arcadia-blue text-white"
                        : "bg-white/[0.02] border-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    {mode}
                  </AnimatedButton>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Project Requirements / Description</label>
              <textarea
                value={bookingData.requirements}
                onChange={e => setBookingData({ ...bookingData, requirements: e.target.value })}
                placeholder="Give us a brief overview of what you'd like us to develop..."
                rows={3}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-arcadia-blue/50 transition-all resize-none"
              />
            </div>

            <AnimatedButton
              type="submit"
              disabled={bookingStatus === "submitting"}
              className="w-full py-4 rounded-xl bg-arcadia-blue text-white text-xs font-bold tracking-wider hover:shadow-[0_0_15px_rgba(47,128,255,0.4)] transition duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {bookingStatus === "submitting" ? (
                <span>Registering Appointment...</span>
              ) : bookingStatus === "success" ? (
                <span className="text-green-300">Successfully Scheduled!</span>
              ) : (
                <span>Confirm Consultation Slot</span>
              )}
            </AnimatedButton>
          </form>
        </div>
      </div>

      {/* 2. ORDER PLACEMENT FLOW */}
      <div 
        id="order-portal"
        className="rounded-[32px] p-8 bg-arcadia-dark border border-white/5 shadow-2xl relative overflow-hidden flex flex-col justify-between"
      >
        <div className="absolute top-[-5%] left-[-5%] w-[150px] h-[150px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Success / Invoice Step */}
        {orderStatus === "success" && placedOrder ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col h-full justify-between"
          >
            <div id="invoice-receipt-panel" className="p-8 bg-arcadia-black border border-white/10 rounded-3xl text-center space-y-6 overflow-y-auto max-h-[500px]">
              <div className="p-3 bg-purple-500/10 rounded-full w-fit mx-auto border border-purple-500/20 text-purple-400">
                <ShieldCheck className="w-8 h-8 animate-pulse" />
              </div>

              <div>
                <h4 className="font-display font-black text-xl text-white">Order Request Transmitted!</h4>
                <p className="font-sans text-xs text-gray-400 mt-2">
                  Request ID: <span className="font-mono text-arcadia-cyan font-bold">#{placedOrder.id}</span>
                </p>
              </div>

              <div className="inline-block px-4 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-mono text-[10px] uppercase font-bold tracking-wider">
                Awaiting Admin Review & Approval
              </div>

              <p className="font-sans text-xs text-gray-400 leading-relaxed max-w-md mx-auto">
                Your co-development specifications have been dispatched to our engineering board. Our administrators will verify the details, configure your custom payment schedule, and send you the first payment link (30%).
              </p>

              {/* Company Contact Details Section */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-left space-y-3">
                <h5 className="font-display font-bold text-xs text-purple-400 uppercase tracking-widest">ARCADIA CONTACT SPECIFICATIONS</h5>
                <div className="space-y-1.5 font-sans text-[11px] text-gray-300">
                  <div>📧 <span className="text-white font-semibold">arcadiadevelopers07@gmail.com</span> (Priority Support Desk)</div>
                  <div>📞 <span className="text-white font-semibold">+91 8328218878</span> (Noida Headquarters Hotline)</div>
                  <div>🏢 Arcadia Labs, Level 4, Tech Hub, Sector 62, Noida, India</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2 text-left text-[11px] font-sans">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">Requested Service:</span>
                  <span className="text-white font-semibold">{placedOrder.service}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-400">Estimated Budget:</span>
                  <span className="text-arcadia-cyan font-extrabold">₹{parseInt(placedOrder.budget).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between pt-1 font-mono text-[9px] text-gray-500">
                  <span>Milestone structure:</span>
                  <span>30% First • 50% Mid • 20% Delivery</span>
                </div>
              </div>

              {/* Policy & Terms Footer */}
              <div className="text-left p-4 rounded-xl bg-purple-500/[0.02] border border-purple-500/10 space-y-2 text-[10px] text-gray-500">
                <p className="font-sans font-bold text-purple-300 text-[8px] uppercase tracking-widest">TERMS & CO-DEVELOPMENT POLICY</p>
                <p className="leading-relaxed">
                  By submitting your project draft, you fully acknowledge and accept our service policies. All intellectual properties are maintained under escrow until milestone payouts are settled. All transactions are governed under high-tech jurisdiction in Noida, India.
                </p>
              </div>

              <AnimatedButton
                type="button"
                onClick={() => generateInvoicePDF(placedOrder)}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 text-xs font-mono font-bold flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <Download className="w-4 h-4 animate-bounce" />
                <span>DOWNLOAD PROJECT INVOICE</span>
              </AnimatedButton>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex gap-4">
                <AnimatedButton
                  onClick={() => {
                    setOrderStatus("idle");
                    setOrderStep(1);
                    setPlacedOrder(null);
                  }}
                  className="flex-1 py-3.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 text-xs font-bold tracking-wide flex items-center justify-center cursor-pointer text-gray-400 hover:text-white transition"
                >
                  <span>Submit Another Draft</span>
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => {
                    const clientTab = document.getElementById("client-portal-btn") || document.getElementById("navbar-client-btn");
                    if (clientTab) {
                      clientTab.click();
                    } else {
                      window.location.hash = "#client";
                      window.location.reload();
                    }
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold tracking-wide flex items-center justify-center cursor-pointer transition shadow-[0_4px_15px_rgba(147,51,234,0.3)]"
                >
                  <span>Go to Client Dashboard</span>
                </AnimatedButton>
              </div>
            </div>
          </motion.div>
        ) : hasActiveOrder ? (
          <div className="h-full flex flex-col justify-between space-y-6">
            <div className="p-6 bg-arcadia-black border border-red-500/10 rounded-3xl text-center space-y-4">
              <div className="p-3 bg-red-500/10 rounded-full w-fit mx-auto border border-red-500/20 text-red-400">
                <ShieldCheck className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h4 className="font-display font-black text-lg text-white">Active Order In Progress</h4>
                <p className="font-sans text-xs text-gray-400 mt-1">
                  Ongoing Sector: <span className="text-arcadia-cyan font-semibold">{activeOrderDetails?.service}</span>
                </p>
              </div>
              <p className="font-sans text-xs text-gray-400 leading-relaxed max-w-md mx-auto">
                You currently have an active co-development project in our secure engineering pipeline. To guarantee our absolute highest standard of engineering quality, precision, and response times, we limit clients to a single active pipeline order.
              </p>
              <div className="inline-block px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-mono text-[9px] uppercase font-bold tracking-wider">
                Current Status: {activeOrderDetails?.status}
              </div>
            </div>

            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
              <h4 className="font-display font-bold text-sm text-white">ARCADIA REGIONAL HEADQUARTERS</h4>
              <div className="space-y-2.5 text-xs font-sans text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="text-arcadia-cyan font-mono text-[10px] w-16">SUPPORT:</span>
                  <span className="text-white font-semibold">arcadiadevelopers07@gmail.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-arcadia-cyan font-mono text-[10px] w-16">HOTLINE:</span>
                  <span className="text-white font-semibold">+91 8328218878</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-arcadia-cyan font-mono text-[10px] w-16">OFFICE:</span>
                  <span className="text-white">Arcadia Labs, Level 4, Tech Hub, Sector 62, Noida, India</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-arcadia-cyan font-mono text-[10px] w-16">HOURS:</span>
                  <span className="text-white">24/7 Priority Operations</span>
                </div>
              </div>
            </div>

            {/* Terms and conditions and Policy links / snippet */}
            <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2 text-[10px] text-gray-500">
              <p className="font-sans font-semibold text-gray-400 uppercase tracking-widest text-[8px] mb-1">
                ARCADIA DEVELOPMENT COMPLIANCE
              </p>
              <p className="leading-relaxed">
                By maintaining an active order, you remain bound to our <strong>Secure Development Terms & Conditions</strong> and <strong>Co-development Privacy Policy</strong>. All code artifacts, intellectual properties, and server staging variables are fully secure and governed under Noida high-tech jurisdiction.
              </p>
              <div className="flex gap-4 pt-1 border-t border-white/5 text-[9px]">
                <a href="#terms" className="text-arcadia-cyan hover:underline">TERMS OF COMPLIANCE</a>
                <span className="text-gray-700">•</span>
                <a href="#policy" className="text-arcadia-cyan hover:underline">CO-DEVELOPER PRIVACY</a>
              </div>
            </div>

            <AnimatedButton
              onClick={() => {
                const clientTab = document.getElementById("client-portal-btn") || document.getElementById("navbar-client-btn");
                if (clientTab) {
                  clientTab.click();
                }
              }}
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold tracking-wide flex items-center justify-center cursor-pointer transition shadow-[0_4px_15px_rgba(147,51,234,0.3)]"
            >
              <span>Go to Client Dashboard</span>
            </AnimatedButton>
          </div>
        ) : (
          <div className="h-full flex flex-col justify-between">
            {/* Form Wizard Head */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-xl text-white">
                    {lang === "en" ? "Start Your Project" : "परियोजना शुरू करें"}
                  </h3>
                  <p className="font-sans text-xs text-gray-400">
                    Step {orderStep} of 3: {orderStep === 1 ? "Partner Details" : orderStep === 2 ? "Project Scope" : "Checkout Gateway"}
                  </p>
                </div>
              </div>
            </div>

            {/* Step Content */}
            <div className="flex-grow">
              {!isClientLoggedIn ? (
                <div className="flex flex-col items-center justify-center text-center p-8 bg-black/40 border border-white/5 rounded-3xl space-y-6 my-4">
                  <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400">
                    <Lock className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-display font-black text-sm text-white uppercase tracking-wider">Authentication Required</h4>
                    <p className="font-sans text-[11px] text-gray-500 mt-2 leading-relaxed max-w-sm">
                      Only authenticated users can place project orders. Please log in or register a corporate client account to proceed.
                    </p>
                  </div>
                  <div className="w-full max-w-xs flex justify-center">
                    <button
                      type="button"
                      onClick={onNavigateToLogin}
                      className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-display text-[10px] font-bold uppercase tracking-wider transition cursor-pointer shadow-[0_4px_12px_rgba(147,51,234,0.3)] flex items-center justify-center"
                    >
                      Go to Login Portal
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {orderStep === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                      {/* Logged in badge */}
                      <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 text-[10px] text-purple-300 font-mono flex items-center justify-between">
                        <span>🔐 SECURED PORTAL SESSION</span>
                        <span className="font-bold">{clientEmail}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Full Name</label>
                          <input
                            type="text"
                            readOnly
                            value={orderData.name}
                            className="w-full px-4 py-3 bg-white/[0.01] border border-white/5 rounded-xl text-xs text-gray-400 focus:outline-none select-none cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Company / Brand</label>
                          <input
                            type="text"
                            value={orderData.company}
                            onChange={e => setOrderData({ ...orderData, company: e.target.value })}
                            placeholder="e.g. Aura Innovations"
                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Email Address</label>
                          <input
                            type="email"
                            readOnly
                            value={orderData.email}
                            className="w-full px-4 py-3 bg-white/[0.01] border border-white/5 rounded-xl text-xs text-gray-400 focus:outline-none select-none cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Phone Number</label>
                          <input
                            type="tel"
                            value={orderData.phone}
                            onChange={e => setOrderData({ ...orderData, phone: e.target.value })}
                            placeholder="e.g. +91 91234 56789"
                            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none"
                          />
                        </div>
                      </div>
                </motion.div>
              )}

              {orderStep === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Development Solution</label>
                    <select
                      value={orderData.service}
                      onChange={e => handleServiceChange(e.target.value)}
                      className="w-full px-4 py-3 bg-arcadia-dark border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500/50"
                    >
                      {Object.keys(SERVICE_PRICES).map(serv => (
                        <option key={serv} value={serv} className="bg-arcadia-black text-white">
                          {serv} (₹{parseInt(SERVICE_PRICES[serv]).toLocaleString("en-IN")})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Estimated Budget (INR)</label>
                      <input
                        type="text"
                        value={orderData.budget}
                        onChange={e => setOrderData({ ...orderData, budget: e.target.value })}
                        placeholder="e.g. 14999"
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Target Deadline</label>
                      <input
                        type="text"
                        value={orderData.deadline}
                        onChange={e => setOrderData({ ...orderData, deadline: e.target.value })}
                        placeholder="e.g. 10 Days"
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">File Uploads (Sitemap / Assets)</label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-white/10 border-dashed rounded-xl cursor-pointer bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                          <Upload className="w-6 h-6 text-gray-400 mb-1" />
                          <p className="font-sans text-[11px] text-gray-400">
                            {orderData.fileName ? (
                              <span className="text-arcadia-cyan font-semibold">{orderData.fileName}</span>
                            ) : (
                              <span>Click to upload project specifications file</span>
                            )}
                          </p>
                        </div>
                        <input type="file" className="hidden" onChange={e => handleFileChange(e, "fileUrl")} />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Detailed Requirements</label>
                    <textarea
                      value={orderData.description}
                      onChange={e => setOrderData({ ...orderData, description: e.target.value })}
                      placeholder="Give us details about pages, APIs or database requirements..."
                      rows={2}
                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none resize-none"
                    />
                  </div>
                </motion.div>
              )}

              {orderStep === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  {/* Checkout summary */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Billed Item:</span>
                      <span className="text-white font-semibold">{orderData.service} Setup</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Total Invoice:</span>
                      <span className="text-arcadia-cyan font-extrabold">₹{parseInt(orderData.budget).toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Project Review Info card */}
                  <div className="text-center p-6 rounded-2xl bg-arcadia-black border border-white/10 space-y-4">
                    <div className="p-3 bg-purple-500/10 rounded-full w-fit mx-auto border border-purple-500/20 text-purple-400">
                      <ShieldCheck className="w-6 h-6 animate-pulse" />
                    </div>
                    <h4 className="font-display font-extrabold text-sm text-white">Project Review & Roadmap Setup</h4>
                    <p className="font-sans text-[11px] text-gray-400 leading-relaxed">
                      Arcadia operates on an approved milestone payment architecture. Once your order request is submitted, our review panel inspects specifications and issues authorized payment links directly to your Client Dashboard. No upfront payment is required today.
                    </p>
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-left font-mono text-[9px] text-gray-400">
                      <div className="flex justify-between">
                        <span>Milestone 1: Kickoff Booking Deposit</span>
                        <span className="text-white font-bold">30% (₹{Math.round((parseInt(orderData.budget) || 0) * 0.3).toLocaleString("en-IN")})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Milestone 2: Mid-Development Stage</span>
                        <span className="text-white font-bold">50% (₹{Math.round((parseInt(orderData.budget) || 0) * 0.5).toLocaleString("en-IN")})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Milestone 3: Delivery & Full Settlement</span>
                        <span className="text-white font-bold">20% (₹{Math.round((parseInt(orderData.budget) || 0) - Math.round((parseInt(orderData.budget) || 0) * 0.3) - Math.round((parseInt(orderData.budget) || 0) * 0.5)).toLocaleString("en-IN")})</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
                </>
              )}
            </div>

            {/* Wizard Navigation Controls */}
            {isClientLoggedIn && (
              <div className="flex justify-between gap-4 pt-6 mt-6 border-t border-white/5">
              {orderStep > 1 && (
                <AnimatedButton
                  type="button"
                  onClick={() => setOrderStep(prev => prev - 1)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </AnimatedButton>
              )}

              {orderStep < 3 ? (
                <AnimatedButton
                  type="button"
                  onClick={() => setOrderStep(prev => prev + 1)}
                  disabled={orderStep === 1 && (!orderData.name || !orderData.email)}
                  className="ml-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </AnimatedButton>
              ) : (
                <AnimatedButton
                  type="button"
                  onClick={handleOrderSubmit}
                  disabled={orderStatus === "submitting"}
                  className="ml-auto px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold tracking-wider transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  {orderStatus === "submitting" ? (
                    <span>Registering Order...</span>
                  ) : (
                    <>
                      <span>Submit for Review</span>
                      <CheckCircle className="w-4 h-4" />
                    </>
                  )}
                </AnimatedButton>
              )}
            </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
