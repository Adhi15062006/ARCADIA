import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Project } from "../types";
import { Sparkles, Globe, BookOpen, X, ChevronRight, Check } from "lucide-react";
import AnimatedButton from "./ui/animated-button";
import { FlipText } from "./ui/flip-text";
import DiagonalCarousel from "./ui/diagonal-carousel";

interface PortfolioProps {
  projects: Project[];
  lang: "en" | "hi";
}

export default function Portfolio({ projects, lang }: PortfolioProps) {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const filters = ["All", "Websites", "AI", "Mobile Apps", "Branding", "UI/UX"];

  const translations = {
    title: { en: "Our Digital Footprints", hi: "हमारे डिजिटल पदचिह्न" },
    subtitle: { en: "High Performance • Custom Graphics • Cutting Edge Technical Frameworks", hi: "उच्च प्रदर्शन • कस्टम ग्राफिक्स • अत्याधुनिक तकनीकी ढांचा" },
    btnDemo: { en: "Launch Live Demo", hi: "लाइव डेमो शुरू करें" },
    btnCase: { en: "Read Case Study", hi: "केस स्टडी पढ़ें" },
    details: { en: "Architectural Overview", hi: "स्थापत्य विनिर्देशन" },
    tech: { en: "Technology Spectrum", hi: "प्रौद्योगिकी स्पेक्ट्रम" }
  };

  const filteredProjects = projects.filter(proj => {
    return activeFilter === "All" || proj.category === activeFilter;
  });

  const carouselImages = filteredProjects.map(proj => ({
    src: proj.imageUrl,
    alt: proj.category,
    title: proj.title,
    description: proj.description
  }));

  return (
    <section 
      id="portfolio" 
      className="py-24 relative w-full bg-[#050505]/40 backdrop-blur-md border-b border-white/5 overflow-hidden"
    >
      <div className="glow-bg glow-cyan w-[500px] h-[500px] top-[20%] left-[-5%] opacity-15" />
      <div className="glow-bg glow-purple w-[400px] h-[400px] bottom-[10%] right-[-5%] opacity-20" />

      <div className="container mx-auto px-6 relative z-10 w-full max-w-7xl">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span className="font-display text-[10px] uppercase tracking-widest text-purple-400 font-semibold">
              PORTFOLIO
            </span>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4"
          >
            <FlipText>{translations.title[lang]}</FlipText>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 font-sans text-sm sm:text-base"
          >
            {translations.subtitle[lang]}
          </motion.p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {filters.map((filter) => (
            <AnimatedButton
              key={filter}
              onClick={() => {
                setActiveFilter(filter);
                setCarouselIndex(0);
              }}
              className={`px-5 py-2.5 rounded-full font-display text-xs font-semibold tracking-wide transition-all ${
                activeFilter === filter
                  ? "bg-purple-600 text-white shadow-[0_4px_15px_rgba(147,51,234,0.3)]"
                  : "bg-white/5 text-gray-400 hover:text-white border border-white/5 hover:border-white/10"
              }`}
            >
              {filter === "All" ? (lang === "en" ? "All Masterpieces" : "सभी उत्कृष्ट कृतियाँ") : filter}
            </AnimatedButton>
          ))}
        </div>

        {/* Animated 3D Diagonal Carousel */}
        <div className="w-full relative z-10 flex flex-col items-center justify-center">
          {carouselImages.length > 0 ? (
            <div className="w-full h-[580px] relative overflow-hidden rounded-[32px] border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center">
              <DiagonalCarousel
                items={filteredProjects.map(proj => ({
                  src: proj.imageUrl,
                  title: proj.title,
                  alt: proj.category
                }))}
                activeIndex={carouselIndex}
                onActiveIndexChange={setCarouselIndex}
                onItemClick={(index) => {
                  const project = filteredProjects[index];
                  if (project) {
                    setSelectedProject(project);
                  }
                }}
                slideSize={250}
                className="w-full h-[540px]"
                showControls={false}
                showDots={false}
              />
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">
                No systems commissioned under this segment node.
              </p>
            </div>
          )}
        </div>

        {/* Fullscreen Interactive Case Study Modal Overlay */}
        <AnimatePresence>
          {selectedProject && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-arcadia-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedProject(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 180 }}
                className="w-full max-w-2xl bg-arcadia-dark rounded-[32px] border border-white/10 overflow-hidden shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close absolute btn */}
                <AnimatedButton
                  onClick={() => setSelectedProject(null)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white transition z-30"
                >
                  <X className="w-4 h-4" />
                </AnimatedButton>

                {/* Banner Hero */}
                <div className="relative aspect-[16/9] w-full">
                  <div className="absolute inset-0 bg-gradient-to-t from-arcadia-dark via-arcadia-dark/30 to-transparent z-10" />
                  <img
                    src={selectedProject.imageUrl}
                    alt={selectedProject.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Category Title info overlay */}
                  <div className="absolute bottom-6 left-6 z-20">
                    <span className="px-2.5 py-0.5 rounded bg-arcadia-blue text-white text-[9px] font-bold uppercase tracking-widest font-display">
                      {selectedProject.category}
                    </span>
                    <h4 className="font-display font-extrabold text-2xl text-white mt-2">
                      {selectedProject.title}
                    </h4>
                  </div>
                </div>

                {/* Case study Details container */}
                <div className="p-8 max-h-[50vh] overflow-y-auto">
                  <div className="mb-6">
                    <h5 className="font-display font-bold text-xs uppercase tracking-wider text-arcadia-cyan mb-3">
                      {translations.details[lang]}
                    </h5>
                    <p className="font-sans text-xs text-gray-300 leading-relaxed">
                      {selectedProject.caseStudy}
                    </p>
                  </div>

                  <div className="mb-6">
                    <h5 className="font-display font-bold text-xs uppercase tracking-wider text-arcadia-blue mb-3">
                      {translations.tech[lang]}
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.technologies.map((tech) => (
                        <span 
                          key={tech}
                          className="px-3 py-1 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-gray-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Standard structural quality assurance indicators */}
                  <div className="border-t border-white/5 pt-6 grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="font-mono text-base font-extrabold text-white">99%</div>
                      <div className="font-sans text-[9px] text-gray-500 uppercase tracking-widest mt-1">LIGHTHOUSE</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="font-mono text-base font-extrabold text-white">60 FPS</div>
                      <div className="font-sans text-[9px] text-gray-500 uppercase tracking-widest mt-1">ANIMATION</div>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="font-mono text-base font-extrabold text-white">&lt; 1s</div>
                      <div className="font-sans text-[9px] text-gray-500 uppercase tracking-widest mt-1">COLD START</div>
                    </div>
                  </div>
                </div>

                {/* Footer cta bar */}
                <div className="p-6 border-t border-white/5 bg-arcadia-black/50 flex justify-end">
                  <a
                    href={selectedProject.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-full bg-arcadia-blue hover:bg-blue-600 text-white font-display text-xs font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(47,128,255,0.3)] flex items-center gap-1.5"
                  >
                    <span>{translations.btnDemo[lang]}</span>
                    <Globe className="w-3.5 h-3.5" />
                  </a>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
