"use client"

import { TrackingForm } from "@/components/tracking-form"
import { Shield, ArrowLeft, Search } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

export default function TrackPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
        <div className="max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-4"
            >
              <Search className="h-7 w-7 text-accent" />
            </motion.div>
            <h1
              className="text-3xl md:text-4xl font-bold text-foreground mb-3"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Track Your <span className="text-accent">Submission</span>
            </h1>
            <p className="text-muted-foreground">Enter your tracking code to view status and responses.</p>
          </motion.div>

          <TrackingForm />
        </div>
      </main>
    </div>
  )
}
