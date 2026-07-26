import React from "react";
import { motion } from "motion/react";
import { Sparkles, Quote, Award, ShieldCheck, Zap } from "lucide-react";

interface AboutSectionProps {
  lang: "en" | "hi";
}

export default function AboutSection({ lang }: AboutSectionProps) {
  return (
    <section id="about" className="relative py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 overflow-hidden">
      {/* Background glowing accents */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-arcadia-blue/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-arcadia-cyan/10 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header Badge */}
      <div className="text-center mb-16 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-arcadia-blue/20 bg-arcadia-blue/10 text-arcadia-cyan text-xs font-mono tracking-widest uppercase"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>{lang === "en" ? "FOUNDER'S VISION" : "संस्थापक की दृष्टि"}</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white"
        >
          {lang === "en" ? "Building The Future of Digital Excellence" : "डिजिटल उत्कृष्टता के भविष्य का निर्माण"}
        </motion.h2>
      </div>

      {/* Main Grid: Founder Image & Narrative */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        
        {/* Left Column: Founder Photo */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5 relative group"
        >
          {/* Card Border & Glow */}
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-arcadia-blue via-arcadia-cyan to-purple-600 opacity-30 group-hover:opacity-60 blur-xl transition duration-500" />
          
          <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#0b0d13] p-3 shadow-2xl">
            <div className="relative rounded-2xl overflow-hidden aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4]">
              <img
                src="/founder.png"
                alt="K. JAI ADITYA - Founder, Arcadia"
                className="w-full h-full object-cover object-center transform group-hover:scale-105 transition duration-700 ease-out"
                loading="lazy"
              />
              
              {/* Gradient Overlay for Text Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-80" />
              
              {/* Name Overlay inside image */}
              <div className="absolute bottom-6 left-6 right-6 z-10">
                <div className="inline-block px-3 py-1 rounded-full bg-arcadia-blue/30 backdrop-blur-md border border-arcadia-blue/30 text-arcadia-cyan text-xs font-mono mb-2">
                  ARCADIA LEADERSHIP
                </div>
                <h3 className="font-display text-2xl font-bold text-white tracking-wide">
                  K. JAI ADITYA
                </h3>
                <p className="text-sm font-mono text-gray-300">
                  Founder, Arcadia
                </p>
              </div>
            </div>

            {/* Micro Badge Stats */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5 text-center">
              <div className="p-2 rounded-xl bg-white/[0.02]">
                <div className="flex justify-center mb-1"><Zap className="w-4 h-4 text-arcadia-cyan" /></div>
                <div className="text-[10px] font-mono text-gray-400">INNOVATION</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.02]">
                <div className="flex justify-center mb-1"><ShieldCheck className="w-4 h-4 text-green-400" /></div>
                <div className="text-[10px] font-mono text-gray-400">PRECISION</div>
              </div>
              <div className="p-2 rounded-xl bg-white/[0.02]">
                <div className="flex justify-center mb-1"><Award className="w-4 h-4 text-yellow-400" /></div>
                <div className="text-[10px] font-mono text-gray-400">EXCELLENCE</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Founder Statement & Narrative */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="lg:col-span-7 space-y-6"
        >
          {/* Header titles */}
          <div>
            <span className="text-arcadia-cyan font-mono text-sm uppercase tracking-wider font-semibold">
              MEET THE FOUNDER
            </span>
            <h3 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mt-1">
              K. JAI ADITYA
            </h3>
            <p className="text-arcadia-blue font-mono text-sm tracking-wide font-medium mt-1">
              Founder, Arcadia
            </p>
          </div>

          {/* Narrative Body Paragraphs */}
          <div className="space-y-4 text-gray-300 text-sm sm:text-base leading-relaxed font-sans">
            <p>
              Technology has always been more than a profession for me—it's a way to create meaningful change. My vision for Arcadia was born from a passion for innovation and a belief that every business deserves digital solutions that are modern, scalable, and built to make a lasting impact.
            </p>
            <p>
              At Arcadia, we combine creativity, strategy, and cutting-edge technology to transform ideas into exceptional digital experiences. Whether it's developing high-performance websites, intelligent web applications, or AI-powered solutions, every project is crafted with precision, quality, and a commitment to excellence.
            </p>
            <p>
              I believe that true success is built on trust, continuous learning, and a relentless pursuit of innovation. Every client partnership is an opportunity to solve real-world challenges, deliver measurable value, and create technology that empowers businesses to grow with confidence.
            </p>
            <p>
              As Founder, my mission is to build more than just software—I strive to build experiences that inspire, solutions that perform, and relationships that last. Every milestone we achieve reflects our dedication to excellence, integrity, and customer success.
            </p>
            <p>
              Thank you for taking the time to learn about our journey. I invite you to join us as we continue shaping the future through innovation, creativity, and technology.
            </p>
          </div>

          {/* Founder Quote Card */}
          <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/10 shadow-xl overflow-hidden mt-6">
            <Quote className="absolute top-4 right-4 w-12 h-12 text-arcadia-cyan/10 pointer-events-none" />
            <blockquote className="font-display italic text-white text-base sm:text-lg leading-relaxed relative z-10">
              "Great companies are built on great ideas, but lasting success comes from the passion, dedication, and vision to turn those ideas into reality."
            </blockquote>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-gray-400">
              <span className="text-arcadia-cyan font-semibold">— K. JAI ADITYA</span>
              <span>Founder, Arcadia</span>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
