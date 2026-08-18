"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import Link from "next/link"
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion"
import { Shield, MessageSquare, Lock, ArrowRight, TrendingUp, Zap, GraduationCap, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedCounter } from "@/components/animated-counter"
import { MobileNav } from "@/components/mobile-nav"
import { SkeletonCard } from "@/components/ui/skeleton-card"
import { supabase } from "@/lib/supabase"
import { MagneticButton } from "@/components/home/magnetic-button"
import { TextReveal } from "@/components/home/text-reveal"
import { GradientOrb } from "@/components/home/gradient-orb"
import { FeatureCard } from "@/components/home/feature-card"
import { Step } from "@/components/home/step"
import { TrendingCard } from "@/components/home/trending-card"

export default function HomePage() {
  const [trendingSubmissions, setTrendingSubmissions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    rate: 95,
    resolved: 0,
    active: 0
  })
  const [orgInfo, setOrgInfo] = useState({
    name: "Lincoln Student Union Voice",
    description: "Anonymous feedback platform for Lincoln College Science Management and Technology Student Union"
  })
  const [particles, setParticles] = useState<any[]>([])

  useEffect(() => {
    // Generate particles only on the client to avoid hydration mismatch
    const newParticles = [...Array(20)].map(() => ({
      width: Math.random() * 6 + 2,
      height: Math.random() * 6 + 2,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: Math.random() * 5 + 5,
      delay: Math.random() * 5,
      moveX: Math.random() * 50 - 25,
    }))
    setParticles(newParticles)

    async function fetchData() {
      try {
        setIsLoading(true)

        // Fetch Org Info
        const { data: orgData } = await supabase
          .from('organization_settings')
          .select('name, description')
          .limit(1)
          .maybeSingle()

        if (orgData) {
          setOrgInfo({
            name: orgData.name,
            description: orgData.description
          })
        }

        // Fetch Stats
        const { data: submissions } = await supabase
          .from("submissions")
          .select("status, upvotes, downvotes")

        if (submissions) {
          const total = submissions.length
          const responded = submissions.filter((s: any) => s.status === 'responded').length
          const underReview = submissions.filter((s: any) => s.status === 'under_review').length
          const totalVotes = submissions.reduce((acc: number, s: any) => acc + (s.upvotes || 0) + (s.downvotes || 0), 0)

          const rate = total > 0 ? Math.round((responded / total) * 100) : 0

          setStats({
            total,
            rate: rate > 0 ? rate : 95,
            resolved: responded,
            active: underReview
          })
        }

        // Fetch Trending
        const { data: trending } = await supabase
          .from("submissions")
          .select("*")
          .order("upvotes", { ascending: false })
          .limit(3)

        if (trending) setTrendingSubmissions(trending)
      } catch (error) {
        console.error("Error fetching homepage data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  })

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 300])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9])

  return (
    <div className="min-h-screen bg-background overflow-hidden" ref={containerRef}>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
        className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
            >
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
                <GraduationCap className="h-7 w-7 text-primary-foreground" />
              </div>
            </motion.div>
            <div className="flex flex-col">
              <motion.span
                className="font-semibold text-lg sm:text-xl tracking-tight text-foreground"
                whileHover={{ scale: 1.02 }}
              >
                <span className="hidden sm:inline">Lincoln Student Union <span className="text-accent">Voice</span></span>
                <span className="inline sm:hidden">LSU <span className="text-accent">Voice</span></span>
              </motion.span>
              <span className="text-xs text-muted-foreground hidden sm:inline">{orgInfo.description.split('.')[0]}</span>
            </div>
          </Link>
          <nav className="flex items-center gap-3 md:gap-6">
            <Link
              href="/trending"
              className="text-sm font-medium text-foreground hover:text-accent transition-colors hidden md:block relative group"
            >
              Trending
              <motion.span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-300" />
            </Link>
            <Link
              href="/submit"
              className="text-sm font-medium text-foreground hover:text-accent transition-colors hidden md:block relative group"
            >
              Submit Feedback
              <motion.span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-300" />
            </Link>
            <Link
              href="/track"
              className="text-sm font-medium text-foreground hover:text-accent transition-colors hidden md:block relative group"
            >
              Track
              <motion.span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-300" />
            </Link>
            <MobileNav />
          </nav>
        </div>
      </motion.header>

      <motion.section
        style={{ y: heroY, opacity: heroOpacity, scale }}
        className="relative min-h-[90vh] flex items-center justify-center"
      >
        {/* Background Video Container */}
        <div className="absolute inset-0 bg-primary overflow-hidden">
          {/* Background Video */}
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onLoadedData={() => setIsVideoLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              isVideoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ filter: 'brightness(0.4) contrast(1.1)' }}
          >
            <source src="/videos/vid.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Semi-transparent overlay to ensure text readability */}
          <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px]"></div>

          {/* Existing gradient orbs - they'll appear over the video */}
          <GradientOrb className="w-[600px] h-[600px] bg-accent/40 -top-32 -left-32" delay={0} />
          <GradientOrb className="w-[500px] h-[500px] bg-primary-foreground/10 top-1/2 right-0" delay={2} />
          <GradientOrb className="w-[400px] h-[400px] bg-accent/30 bottom-0 left-1/3" delay={4} />
        </div>

        {/* Rest of your existing code remains exactly the same... */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
            }}
          />
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((particle, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: particle.width,
                height: particle.height,
                background: i % 2 === 0 ? "rgba(74, 140, 170, 0.6)" : "rgba(255, 255, 255, 0.4)",
                left: particle.left,
                top: particle.top,
              }}
              animate={{
                y: [0, -100, 0],
                x: [0, particle.moveX, 0],
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: particle.duration,
                repeat: Number.POSITIVE_INFINITY,
                delay: particle.delay,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-primary-foreground mb-6 text-balance"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <TextReveal delay={0.2}>Your Voice Matters.</TextReveal>
              <br />
              <span className="text-accent">
                <TextReveal delay={0.5}>{orgInfo.name.includes("Voice") ? "Your Identity Doesn't." : "Anonymous & Secure."}</TextReveal>
              </span>
            </h1>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1, duration: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
              className="w-24 h-1 bg-accent mx-auto mb-8 rounded-full"
            />

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="text-lg md:text-xl text-primary-foreground/85 mb-10 max-w-2xl mx-auto text-pretty leading-relaxed"
            >
              Share feedback, report concerns, and propose ideas with complete anonymity. A safe space for the Lincoln
              College Science Management and Technology Student Union community to speak freely.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <MagneticButton>
                <Link href="/submit">
                  <Button
                    size="lg"
                    className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-xl shadow-accent/40 group px-8 relative overflow-hidden"
                  >
                    <motion.span
                      className="absolute inset-0 bg-white/20"
                      initial={{ x: "-100%", skewX: "-15deg" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.5 }}
                    />
                    <span className="relative z-10 flex items-center gap-2">
                      Submit Anonymously
                      <motion.span
                        animate={{ x: [0, 5, 0] }}
                        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5, ease: "easeInOut" }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </motion.span>
                    </span>
                  </Button>
                </Link>
              </MagneticButton>
              <MagneticButton>
                <Link href="/track">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-primary-foreground/10 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/20 backdrop-blur-sm"
                  >
                    Track Submission
                  </Button>
                </Link>
              </MagneticButton>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8 }}
              className="grid grid-cols-3 gap-8 mt-16 max-w-xl mx-auto"
            >
              {[
                { value: stats.total, label: "Submissions" },
                { value: stats.rate, suffix: "%", label: "Success Rate" },
                { value: stats.active + stats.resolved, label: "Issues Addressed" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.8 + i * 0.15 }}
                  whileHover={{ scale: 1.05 }}
                  className="text-center"
                >
                  <div className="text-2xl md:text-3xl font-bold text-primary-foreground">
                    <AnimatedCounter value={stat.value} />
                    {stat.suffix || ""}
                  </div>
                  <div className="text-sm text-primary-foreground/70">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-xs text-primary-foreground/60 uppercase tracking-widest">Scroll</span>
            <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/40 flex justify-center pt-2">
              <motion.div
                animate={{ y: [0, 12, 0], opacity: [1, 0, 1] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2, ease: "easeInOut" }}
                className="w-1.5 h-3 rounded-full bg-primary-foreground/60"
              />
            </div>
          </motion.div>
        </motion.div>
      </motion.section>

      <section className="py-24 bg-background relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-block text-accent text-sm font-medium tracking-wider uppercase mb-4"
            >
              Why Choose Us
            </motion.span>
            <h2
              className="text-3xl md:text-4xl font-bold text-foreground mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Speak Freely. <span className="text-primary">Be Heard.</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Lincoln student union voice provides students with a safe and anonymous platform to share their concerns, suggestions, feedback, and ideas. Your identity remains private, while your voice has the opportunity to reach the people who can make a difference.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="100% Anonymous"
              description="No login, no tracking, no personal data. Your identity is completely protected."
              delay={0.1}
            />
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="Two-Way Chat"
              description="Receive responses and follow up - all while staying anonymous."
              delay={0.3}
            />
            <FeatureCard
              icon={<Lock className="h-6 w-6" />}
              title="End-to-End Secure"
              description="Enterprise-grade encryption protects every submission."
              delay={0.4}
            />
          </div>
        </div>
      </section>

      <section className="py-24 bg-secondary/50 relative overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-30"
          initial={{ backgroundPosition: "0% 0%" }}
          animate={{ backgroundPosition: "100% 100%" }}
          transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
          style={{
            backgroundImage: "radial-gradient(circle at center, hsl(var(--accent) / 0.1) 0%, transparent 50%)",
            backgroundSize: "100% 100%",
          }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2
              className="text-3xl md:text-4xl font-bold text-foreground mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              How It Works
            </h2>
            <p className="text-muted-foreground">Simple, secure, and straightforward</p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-4 max-w-5xl mx-auto relative">
            {/* Animated connector line */}
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-border">
              <motion.div
                className="h-full bg-accent"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                style={{ transformOrigin: "left" }}
              />
            </div>
            <Step
              number={1}
              title="Choose Topic"
              description="Select a department and category for your feedback"
              delay={0.1}
            />
            <Step
              number={2}
              title="Write Message"
              description="Craft clear, constructive feedback"
              delay={0.3}
            />
            <Step
              number={3}
              title="Submit Securely"
              description="Your message is encrypted and sent anonymously"
              delay={0.5}
            />
            <Step
              number={4}
              title="Track & Respond"
              description="Use your code to check status and reply"
              delay={0.7}
            />
          </div>
        </div>
      </section>

      {/* Trending Section Preview */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <motion.div
              className="inline-flex items-center gap-2 text-accent mb-4"
              animate={{ y: [0, -3, 0] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">Community Voice</span>
            </motion.div>
            <h2
              className="text-3xl md:text-4xl font-bold text-foreground mb-4"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Trending Suggestions
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See what the community is talking about and vote for changes you want to see.
            </p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : trendingSubmissions.length > 0 ? (
              trendingSubmissions.map((submission, index) => (
                <TrendingCard
                  key={submission.id}
                  title={submission.subject}
                  votes={submission.upvotes || 0}
                  category={submission.category.charAt(0).toUpperCase() + submission.category.slice(1)}
                  delay={0.1 * (index + 1)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No trending suggestions yet. Be the first to share!
              </div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <MagneticButton>
              <Link href="/trending">
                <Button
                  variant="outline"
                  className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
                >
                  View All Trending
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </MagneticButton>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-black relative overflow-hidden">
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "radial-gradient(circle at 20% 80%, hsl(var(--accent) / 0.3) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 20%, hsl(var(--accent) / 0.3) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 80%, hsl(var(--accent) / 0.3) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2
              className="text-3xl md:text-4xl font-bold text-white mb-6"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Ready to Make Your Voice Heard?
            </h2>
            <p className="text-gray-300 mb-8 text-lg">
              Join the Lincoln College Science Management and Technology Abuja Student Union in making our school better through honest, anonymous feedback.
            </p>
            <MagneticButton>
              <Link href="/submit">
                <Button
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-xl shadow-accent/40 gap-2 px-8 relative overflow-hidden group"
                >
                  <motion.span
                    className="absolute inset-0 bg-white/20"
                    initial={{ x: "-100%", skewX: "-15deg" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                  <span className="relative z-10 flex items-center gap-2">
                    Start Now - It's Anonymous
                    <Zap className="h-4 w-4 group-hover:animate-pulse" />
                  </span>
                </Button>
              </Link>
            </MagneticButton>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-black">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col w-full">
                <span className="font-semibold text-white">Lincoln Student Union Voice</span>
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 mt-2 w-full">
                  <p className="text-xs text-gray-400 leading-relaxed max-w-md">Lincoln Campus Abuja, Nigeria, Along Jikwoyi-Karshi Road Azahata, Kuduru, Abuja, Nigeria</p>


                  <p className="text-sm text-gray-400 md:text-center md:px-6 flex-1 md:self-center">
                    Your privacy is our priority. We never collect or store identifying information.
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-400 flex-shrink-0 md:self-center">
                    <Link href="/privacy" className="hover:text-white transition-colors whitespace-nowrap">
                      Privacy
                    </Link>
                    <Link href="/terms" className="hover:text-white transition-colors whitespace-nowrap">
                      Terms
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
