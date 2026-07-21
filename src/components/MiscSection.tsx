import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import AnimatedButton from "./ui/animated-button";
import { BlogPost, FAQ } from "../types";
import { FlipText } from "./ui/flip-text";
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  User, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  Send, 
  Sparkles, 
  ExternalLink,
  Cpu,
  Bookmark,
  Briefcase,
  X,
  Plus
} from "lucide-react";

interface MiscSectionProps {
  blogs: BlogPost[];
  faqs: FAQ[];
  lang: "en" | "hi";
}

export default function MiscSection({ blogs, faqs, lang }: MiscSectionProps) {
  // Accordion open tracker
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);
  
  // Blog reading modal
  const [readingBlog, setReadingBlog] = useState<BlogPost | null>(null);

  // Careers positions dynamic state
  const [careerPositions, setCareerPositions] = useState<any[]>([
    { id: "v1", title: "Senior AI Solutions Engineer", location: "Bangalore (Hybrid)", salary: "₹18L - ₹24L", type: "Full-Time" },
    { id: "v2", title: "Lead React & Frontend Architect", location: "Gurugram (Remote)", salary: "₹14L - ₹18L", type: "Full-Time" },
    { id: "v3", title: "Creative UI/UX Designer & Prototyper", location: "Mumbai (Hybrid)", salary: "₹8L - ₹12L", type: "Full-Time" }
  ]);

  useEffect(() => {
    fetch("/api/vacancies")
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then(data => setCareerPositions(data))
      .catch(() => {});
  }, []);

  // Careers application modal
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [applyForm, setApplyForm] = useState({ name: "", email: "", resume: "", note: "" });
  const [applySuccess, setApplySuccess] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Inbound Inquiry message states
  const [inquiryData, setInquiryData] = useState({ name: "", email: "", subject: "", message: "" });
  const [inquiryStatus, setInquiryStatus] = useState<"idle" | "submitting" | "success">("idle");

  const translations = {
    faqTitle: { en: "Technical FAQ Node", hi: "अक्सर पूछे जाने वाले सवाल" },
    blogTitle: { en: "ARCADIA Journals", hi: "आर्केडिया पत्रिकाएं" },
    careersTitle: { en: "Join Our Odyssey", hi: "हमारे साथ जुड़ें" },
    careersSub: { en: "We are always hunting for world-class design and full-stack software engineers in India.", hi: "हम हमेशा विश्व स्तरीय डिजाइन और सॉफ्टवेयर इंजीनियरों की तलाश में रहते हैं।" },
    contactTitle: { en: "Establish Communication", hi: "संपर्क स्थापित करें" },
    btnSubmit: { en: "Broadcast Message", hi: "संदेश प्रसारित करें" }
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryStatus("submitting");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inquiryData)
      });
      if (res.ok) {
        setInquiryStatus("success");
        setTimeout(() => {
          setInquiryStatus("idle");
          setInquiryData({ name: "", email: "", subject: "", message: "" });
        }, 5000);
      }
    } catch (err) {
      setInquiryStatus("idle");
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setIsApplying(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          name: applyForm.name,
          email: applyForm.email,
          resume: applyForm.resume,
          note: applyForm.note
        })
      });
      if (res.ok) {
        setApplySuccess(true);
        setApplyForm({ name: "", email: "", resume: "", note: "" });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-32">
      
      {/* 1. FAQ ACCORDION SECTION */}
      <section id="faq" className="py-20 bg-[#050505]/40 backdrop-blur-md relative overflow-hidden border-b border-white/5">
        <div className="container mx-auto px-6 max-w-4xl relative z-10">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-arcadia-blue/10 border border-arcadia-blue/20 mb-4"
            >
              <HelpCircle className="w-3.5 h-3.5 text-arcadia-blue" />
              <span className="font-display text-[10px] uppercase tracking-widest text-arcadia-blue font-semibold">
                FAQ DECK
              </span>
            </motion.div>
            <h2 className="font-display font-black text-3xl md:text-4xl text-white">
              <FlipText>{translations.faqTitle[lang]}</FlipText>
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => {
              const isOpen = openFAQ === faq.id;
              return (
                <div 
                  key={faq.id} 
                  className="rounded-3xl border border-white/5 bg-white/[0.01] overflow-hidden transition-colors hover:bg-white/[0.02]"
                >
                  <AnimatedButton
                    onClick={() => setOpenFAQ(isOpen ? null : faq.id)}
                    className="w-full p-6 text-left flex justify-between items-center gap-4 text-white focus:outline-none"
                  >
                    <span className="font-display font-bold text-sm md:text-base">{faq.question}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-arcadia-blue shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
                  </AnimatedButton>
                  
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 text-xs text-gray-400 font-sans leading-relaxed border-t border-white/5 pt-4">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. BLOG / INSIGHTS LIST */}
      <section id="blog" className="py-20 bg-[#050505]/40 backdrop-blur-md relative overflow-hidden border-b border-white/5">
        <div className="glow-bg glow-purple w-[400px] h-[400px] top-[-10%] left-[-10%] opacity-15" />
        
        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-display text-[10px] uppercase tracking-widest text-purple-400 font-semibold">
                KNOWLEDGE
              </span>
            </div>
            <h2 className="font-display font-black text-3xl md:text-4xl text-white">
              <FlipText>{translations.blogTitle[lang]}</FlipText>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <div 
                key={blog.id} 
                onClick={() => setReadingBlog(blog)}
                className="group rounded-3xl bg-arcadia-dark border border-white/5 overflow-hidden hover:border-purple-500/30 transition shadow-xl cursor-pointer flex flex-col h-full"
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-gray-900 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-arcadia-dark to-transparent opacity-60 z-10" />
                  <img 
                    src={blog.imageUrl} 
                    alt={blog.title} 
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover transition duration-500 group-hover:scale-103"
                  />
                  <span className="absolute top-4 left-4 z-20 px-2.5 py-0.5 rounded bg-purple-600 text-white font-mono text-[9px] uppercase font-bold tracking-wider">
                    {blog.category}
                  </span>
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 mb-3">
                    <User className="w-3.5 h-3.5" />
                    <span>{blog.author}</span>
                    <span>•</span>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{blog.readTime}</span>
                  </div>

                  <h3 className="font-display font-bold text-base text-white group-hover:text-purple-400 transition-colors mb-2 line-clamp-2">
                    {blog.title}
                  </h3>
                  
                  <p className="font-sans text-xs text-gray-400 leading-relaxed line-clamp-3">
                    {blog.excerpt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full Post Overlay Reader Modal */}
        <AnimatePresence>
          {readingBlog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-arcadia-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4"
              onClick={() => setReadingBlog(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl bg-arcadia-dark rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative aspect-[16/9] w-full">
                  <AnimatedButton
                    onClick={() => setReadingBlog(null)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-arcadia-black/75 border border-white/10 text-white hover:bg-white/10 transition z-20"
                  >
                    <X className="w-4 h-4" />
                  </AnimatedButton>
                  <div className="absolute inset-0 bg-gradient-to-t from-arcadia-dark to-transparent opacity-80 z-10" />
                  <img src={readingBlog.imageUrl} alt={readingBlog.title} referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover" />
                  <div className="absolute bottom-6 left-6 z-20">
                    <span className="px-2.5 py-0.5 rounded bg-purple-600 text-white text-[9px] font-mono uppercase tracking-wider">{readingBlog.category}</span>
                    <h4 className="font-display font-extrabold text-xl sm:text-2xl text-white mt-2 leading-tight">{readingBlog.title}</h4>
                  </div>
                </div>

                <div className="p-8 max-h-[50vh] overflow-y-auto font-sans text-xs sm:text-sm text-gray-300 leading-relaxed space-y-4">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4 text-gray-500 font-mono text-[10px]">
                    <span>Author: {readingBlog.author}</span>
                    <span>•</span>
                    <span>Read length: {readingBlog.readTime}</span>
                    <span>•</span>
                    <span>Date: {readingBlog.date}</span>
                  </div>
                  <p className="whitespace-pre-line">{readingBlog.content}</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 3. CAREERS VACANCIES */}
      <section id="careers" className="py-20 bg-[#050505]/40 backdrop-blur-md relative overflow-hidden border-b border-white/5">
        <div className="container mx-auto px-6 max-w-5xl relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
              <Briefcase className="w-3.5 h-3.5 text-green-400" />
              <span className="font-display text-[10px] uppercase tracking-widest text-green-400 font-semibold">
                VACANCIES
              </span>
            </div>
            <h2 className="font-display font-black text-3xl md:text-4xl text-white mb-3">
              {translations.careersTitle[lang]}
            </h2>
            <p className="font-sans text-xs text-gray-400 max-w-xl mx-auto">
              {translations.careersSub[lang]}
            </p>
          </div>

          <div className="space-y-4">
            {careerPositions.map((pos) => (
              <div 
                key={pos.title} 
                className="p-6 rounded-3xl border border-white/5 bg-white/[0.01] hover:border-green-500/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h4 className="font-display font-bold text-base text-white">{pos.title}</h4>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-gray-500 mt-2">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-arcadia-blue" />{pos.location}</span>
                    <span>•</span>
                    <span>{pos.salary}</span>
                  </div>
                </div>
                <AnimatedButton
                  onClick={() => setSelectedRole(pos.title)}
                  className="px-5 py-2.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500 hover:text-white transition cursor-pointer shrink-0"
                >
                  Apply Role
                </AnimatedButton>
              </div>
            ))}
          </div>
        </div>

        {/* Role Apply Modal */}
        <AnimatePresence>
          {selectedRole && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-arcadia-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedRole(null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="w-full max-w-md bg-arcadia-dark rounded-3xl p-8 border border-white/10 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="font-display font-extrabold text-lg text-white">Apply Solution Node</h4>
                    <p className="font-sans text-xs text-green-400">Role: {selectedRole}</p>
                  </div>
                  <AnimatedButton onClick={() => { setSelectedRole(null); setApplySuccess(false); }} className="p-1.5 rounded-full bg-white/5 text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </AnimatedButton>
                </div>

                {applySuccess ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="p-3 bg-green-500/10 rounded-full w-fit mx-auto text-green-400 border border-green-500/20">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <h5 className="font-display font-bold text-white">Application Recorded</h5>
                    <p className="font-sans text-xs text-gray-400 leading-relaxed">
                      Our architecture recruiters will analyze your resume. If aligned, we will schedule an interview block soon.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleApplySubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Your Name</label>
                      <input 
                        type="text" 
                        required 
                        value={applyForm.name}
                        onChange={(e) => setApplyForm({ ...applyForm, name: e.target.value })}
                        placeholder="e.g. Advika Nair" 
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Email</label>
                      <input 
                        type="email" 
                        required 
                        value={applyForm.email}
                        onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                        placeholder="e.g. advika@gmail.com" 
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Resume / GitHub Portfolio URL</label>
                      <input 
                        type="url" 
                        required 
                        value={applyForm.resume}
                        onChange={(e) => setApplyForm({ ...applyForm, resume: e.target.value })}
                        placeholder="e.g. https://github.com/advika" 
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1 font-bold">Cover Letter Note</label>
                      <textarea 
                        value={applyForm.note}
                        onChange={(e) => setApplyForm({ ...applyForm, note: e.target.value })}
                        placeholder="Why are you a craft champion?" 
                        rows={2} 
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none resize-none" 
                      />
                    </div>
                    <AnimatedButton 
                      type="submit" 
                      disabled={isApplying}
                      className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-display text-xs font-bold tracking-wider transition disabled:opacity-50"
                    >
                      {isApplying ? "Transmitting..." : "Transmit Application Data"}
                    </AnimatedButton>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 4. CONTACT CHANNELS & GOOGLE MAPS INTEGRATION */}
      <section id="contact" className="py-20 bg-[#050505]/40 backdrop-blur-md relative overflow-hidden border-b border-white/5">
        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            
            {/* Left Column Inquiry form */}
            <div className="lg:col-span-7 rounded-3xl p-8 bg-[#050505]/20 backdrop-blur-md border border-white/5 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="p-2 rounded-xl bg-arcadia-blue/10 border border-arcadia-blue/20 text-arcadia-blue">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-xl text-white">
                      {translations.contactTitle[lang]}
                    </h3>
                    <p className="font-sans text-xs text-gray-400">Direct neural inquiry line.</p>
                  </div>
                </div>

                {inquiryStatus === "success" ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="p-3 bg-green-500/10 rounded-full w-fit mx-auto text-green-400">
                      <Send className="w-6 h-6" />
                    </div>
                    <h4 className="font-display font-bold text-white">Communication Transmitted</h4>
                    <p className="font-sans text-xs text-gray-400 max-w-md mx-auto">
                      Your packet has successfully traversed our secure web protocols and landed in our administrator inbox. We usually return answers within 6 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleInquirySubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Your Name</label>
                        <input
                          type="text"
                          required
                          value={inquiryData.name}
                          onChange={e => setInquiryData({ ...inquiryData, name: e.target.value })}
                          placeholder="e.g. Vihaan Sen"
                          className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Email Address</label>
                        <input
                          type="email"
                          required
                          value={inquiryData.email}
                          onChange={e => setInquiryData({ ...inquiryData, email: e.target.value })}
                          placeholder="e.g. vihaan@outlook.in"
                          className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Message Subject</label>
                      <input
                        type="text"
                        required
                        value={inquiryData.subject}
                        onChange={e => setInquiryData({ ...inquiryData, subject: e.target.value })}
                        placeholder="e.g. Integration with our current CRM backend"
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5 font-bold">Detailed Description</label>
                      <textarea
                        required
                        value={inquiryData.message}
                        onChange={e => setInquiryData({ ...inquiryData, message: e.target.value })}
                        placeholder="Detail your inquiry..."
                        rows={4}
                        className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white focus:outline-none resize-none"
                      />
                    </div>

                    <AnimatedButton
                      type="submit"
                      disabled={inquiryStatus === "submitting"}
                      className="w-full py-4 rounded-xl bg-arcadia-blue text-white text-xs font-bold tracking-wider hover:shadow-[0_0_15px_rgba(47,128,255,0.4)] transition"
                    >
                      {inquiryStatus === "submitting" ? "Transmitting Packet..." : translations.btnSubmit[lang]}
                    </AnimatedButton>
                  </form>
                )}
              </div>
            </div>

            {/* Right Column Maps & Details */}
            <div className="lg:col-span-5 rounded-3xl p-2 bg-[#050505]/20 backdrop-blur-md border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[400px]">
              {/* highly stylized premium dark Google maps embed iframe centering Punganur, Andhra Pradesh */}
              <div className="relative w-full h-[240px] rounded-3xl overflow-hidden border border-white/10">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3876.54133481261!2d78.57218671481183!3d13.513788990501865!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bb2912a781b2a95%3A0xc3911f44a30dbf2!2sPunganur%2C%20Andhra%20Pradesh%20517247!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0, filter: "invert(90%) hue-rotate(180deg) contrast(120%)" }} 
                  allowFullScreen={false} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Arcadia Punganur Headquarters"
                />
                
                {/* stylized glow overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-arcadia-dark/90 via-transparent pointer-events-none" />
              </div>

              {/* HQ details card */}
              <div className="p-6 space-y-4">
                <div className="flex gap-3 text-xs text-gray-400">
                  <MapPin className="w-5 h-5 text-arcadia-cyan shrink-0" />
                  <div>
                    <span className="block font-bold text-white">Arcadia Headquarters</span>
                    <span>Punganur, Andhra Pradesh 517247</span>
                  </div>
                </div>

                <div className="flex gap-3 text-xs text-gray-400">
                  <Mail className="w-5 h-5 text-arcadia-blue shrink-0" />
                  <div>
                    <span className="block font-bold text-white">Transmission Node</span>
                    <span>{(window as any).FIREBASE_CONFIG?.adminEmail || "arcadiadevelopers07@gmail.com"}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
}
