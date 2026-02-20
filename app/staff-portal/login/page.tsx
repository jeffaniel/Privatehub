"use client"

import { AdminLoginForm } from "@/components/admin-login-form"
import { Shield, Loader2 } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Suspense } from "react"

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 animated-gradient opacity-95" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-accent/20 via-transparent to-transparent" />

      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 border-b border-primary-foreground/10"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary-foreground" />
            <span className="font-semibold text-lg text-primary-foreground">
              Lincoln<span className="text-accent">Voice</span>
            </span>
          </Link>
        </div>
      </motion.header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1
              className="text-3xl font-bold text-primary-foreground mb-2"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Admin Portal
            </h1>
            <p className="text-primary-foreground/70">Sign in to access your dashboard</p>
          </div>
          <Suspense fallback={
            <div className="flex items-center justify-center p-8 bg-background/50 backdrop-blur-md rounded-xl border border-primary/20">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          }>
            <AdminLoginForm />
          </Suspense>
        </motion.div>
      </main>
    </div>
  )
}


// login and signup logic here to the admin table 
