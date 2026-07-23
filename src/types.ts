export interface Service {
  id: string;
  title: string;
  price: string;
  description: string;
  features: string[];
  category: "Web Development" | "AI Solutions" | "Mobile Apps" | "Design & Marketing" | "Other";
  isFeatured?: boolean;
}

export interface Project {
  id: string;
  title: string;
  category: "Websites" | "AI" | "Mobile Apps" | "Branding" | "UI/UX";
  description: string;
  technologies: string[];
  imageUrl: string;
  liveUrl: string;
  caseStudy: string;
}

export interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  service: string;
  date: string;
  time: string;
  meetingMode: "Google Meet" | "Zoom" | "Phone";
  requirements: string;
  createdAt: string;
}

export interface PaymentMilestone {
  id: string;
  label: string;
  percentage: number;
  amount: number;
  status: "Pending" | "Link Sent" | "Paid";
  paymentLink?: string;
  paidAt?: string;
  invoiceGenerated?: boolean;
}

export interface Order {
  id: string;
  orderId?: string;
  customerId?: string;
  userId?: string;
  name: string;
  customerName?: string;
  company: string;
  email: string;
  phone: string;
  address?: string;
  service: string;
  items?: any[];
  subtotal?: number;
  tax?: number;
  shipping?: number;
  discount?: number;
  total?: number;
  budget: string;
  paymentAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  status: "Pending" | "Payment Pending" | "Accepted" | "In Progress" | "Completed" | "Cancelled";
  isPaid: boolean;
  deadline: string;
  description: string;
  fileUrl?: string;
  paymentScreenshot?: string;
  milestones?: PaymentMilestone[];
  createdAt: string;
  updatedAt?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  imageUrl: string;
  author: string;
  date: string;
  readTime: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface Testimonial {
  id: string;
  name: string;
  company: string;
  role: string;
  content: string;
  rating: number;
  avatarUrl: string;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userEmail: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  orderId?: string;
  milestoneId?: string;
  type?: "Payment Required" | "General" | "Success";
  deadline?: string;
}

export interface RenewalLog {
  dateTime: string;
  amount: number;
  paymentId: string;
  invoiceNumber: string;
  status: "Success" | "Failed";
}

export interface PaymentFailureLog {
  dateTime: string;
  reason: string;
  amount: number;
}

export interface MaintenanceSubscription {
  id: string;
  clientId: string;
  clientEmail: string;
  clientName: string;
  orderId: string;
  projectName: string;
  planId: "basic" | "standard" | "advanced" | "none";
  planName: string;
  monthlyPrice: number;
  status: "No Plan" | "Pending Subscription" | "Active" | "Paused" | "Cancelled" | "Expired" | "Payment Failed";
  startDate?: string;
  lastPaymentDate?: string;
  nextRenewalDate?: string;
  razorpaySubscriptionId?: string;
  totalPaymentsReceived: number;
  renewalHistory: RenewalLog[];
  paymentFailures: PaymentFailureLog[];
  createdAt: string;
  updatedAt: string;
}

export interface SEOSettings {
  id: string;
  route: string;
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  status: "Published" | "Draft";
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  deleted?: boolean;
  deletedAt?: string;
}

