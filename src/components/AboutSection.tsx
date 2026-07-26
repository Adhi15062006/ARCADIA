import React from "react";
import { motion } from "motion/react";
import { Sparkles, Quote } from "lucide-react";

interface AboutSectionProps {
  lang: "en" | "hi";
}

export default function AboutSection({ lang }: AboutSectionProps) {
  return (
    <section id="about" className="relative py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 overflow-hidden">
      {/* Background glowing accents */}
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-arcadia-blue/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-arcadia-cyan/15 rounded-full blur-3xl pointer-events-none" />

      {/* Section Header Badge */}
      <div className="mb-14 space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-arcadia-blue/20 bg-arcadia-blue/10 text-arcadia-cyan text-xs font-mono tracking-widest uppercase"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>{lang === "en" ? "FOUNDER'S VISION" : "संस्थापक की दृष्टि"}</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white"
        >
          {lang === "en" ? "Building The Future of Digital Excellence" : "डिजिटल उत्कृष्टता के भविष्य का निर्माण"}
        </motion.h2>
      </div>

      {/* Main Grid: Borderless Photo & Pure Typographic Narrative */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        
        {/* Left Column: Borderless Founder Photo */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="lg:col-span-5 relative"
        >
          {/* Subtle Ambient Image Glow */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-arcadia-blue/20 to-arcadia-cyan/20 blur-2xl pointer-events-none" />

          <div className="relative rounded-2xl overflow-hidden aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4]">
            <img
              src="/founder.png"
              alt="K. JAI ADITYA - Founder, Arcadia"
              className="w-full h-full object-cover object-center transform hover:scale-102 transition duration-700 ease-out"
              loading="lazy"
            />
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Minimal Name & Title overlay */}
            <div className="absolute bottom-6 left-6 right-6 z-10 space-y-1">
              <div className="text-xs font-mono tracking-widest text-arcadia-cyan uppercase">
                ARCADIA LEADERSHIP
              </div>
              <h3 className="font-display text-2xl font-bold text-white tracking-wide">
                K. JAI ADITYA
              </h3>
              <p className="text-xs font-mono text-gray-300">
                Founder, Arcadia
              </p>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Founder Statement & Narrative (Pure Typographic Flow, No Cards) */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="lg:col-span-7 space-y-6"
        >
          {/* Founder Title Header */}
          <div className="border-l-2 border-arcadia-blue pl-4 py-1">
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              K. JAI ADITYA
            </h3>
            <p className="text-arcadia-cyan font-mono text-xs tracking-wider uppercase font-semibold mt-0.5">
              Founder, Arcadia
            </p>
          </div>

          {/* Pure Typographic Narrative Paragraphs */}
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

          {/* Typographic Quote Block (No Enclosed Card Container) */}
          <div className="relative pl-6 py-2 border-l-2 border-gradient-to-b from-arcadia-cyan via-arcadia-blue to-purple-500 space-y-3 mt-8">
            <Quote className="w-8 h-8 text-arcadia-cyan/30" />
            <blockquote className="font-display italic text-white text-base sm:text-lg leading-relaxed">
              "Great companies are built on great ideas, but lasting success comes from the passion, dedication, and vision to turn those ideas into reality."
            </blockquote>
            <div className="text-xs font-mono text-gray-400">
              <span className="text-arcadia-cyan font-semibold">— K. JAI ADITYA</span>
              <span className="ml-2 text-gray-500">Founder, Arcadia</span>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
