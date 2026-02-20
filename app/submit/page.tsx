"use client"

import { SubmissionForm } from "@/components/submission-form"
import { Shield, ArrowLeft, Lock, MessageSquare } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with glassmorphism */}
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">
              Lincoln<span className="text-accent">Voice</span>
            </span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-24 pt-28">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1
              className="text-3xl md:text-4xl font-bold text-foreground mb-3"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Submit <span className="text-accent">Anonymous</span> Feedback
            </h1>
            <p className="text-muted-foreground">Your identity is protected. Share your thoughts freely.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex justify-center gap-3 mb-8"
          >
            <div className="flex items-center justify-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2 text-sm">
              <Lock className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground hidden sm:inline">Encrypted</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2 text-sm">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground hidden sm:inline">Two-Way</span>
            </div>
          </motion.div>

          <SubmissionForm />
        </div>
      </main>
    </div>
  )
}
