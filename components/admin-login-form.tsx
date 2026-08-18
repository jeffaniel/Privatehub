"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Eye, EyeOff, Loader2, Shield, UserPlus } from "lucide-react"
import { adminSignIn, adminSignUp } from "@/lib/actions"

// Remote ADMIN_CREDENTIALS for security

export function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [mfaStep, setMfaStep] = useState(false)
  const [mfaUserId, setMfaUserId] = useState("")
  const [mfaAccessToken, setMfaAccessToken] = useState("")
  const [mfaRefreshToken, setMfaRefreshToken] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    adminCode: "",
    mfaCode: "",
  })

  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam === "session_expired") {
      setError("Your session has expired. Please sign in again.")
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccessMessage("")

    if (mfaStep) {
      return handleMfaSubmit()
    }

    // Validation
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields")
      return
    }

    if (isSignUp && formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // ... (keep regex validation)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/
    if (isSignUp && !passwordRegex.test(formData.password)) {
      setError("Password must be at least 12 characters long and include uppercase, lowercase, numbers, and symbols.")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      const data = new FormData()
      data.append("email", formData.email)
      data.append("password", formData.password)
      if (isSignUp) {
        data.append("confirmPassword", formData.confirmPassword)
        data.append("adminCode", formData.adminCode)
      }

      if (isSignUp) {
        const result = await adminSignUp(data)

        if (result?.error) {
          setError(result.error)
        } else {
          setSuccessMessage(result?.message || "Account created successfully!")
        }
      } else {
        const result: any = await adminSignIn(data)

        if (result?.error) {
          setError(result.error)
        } else if (result?.require_mfa) {
          setMfaStep(true)
          setMfaUserId(result.userId)
          setMfaAccessToken(result.access_token || "")
          setMfaRefreshToken(result.refresh_token || "")
          setSuccessMessage("Authenticator code required")
        } else {
          setSuccessMessage("Login successful! Redirecting...")
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message === "NEXT_REDIRECT") {
        setSuccessMessage("Login successful! Redirecting...")
        // Hard redirect to ensure cookies are picked up and state is fresh
        window.location.href = "/staff-portal/dashboard"
        return
      }
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      setError(`Unexpected error: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMfaSubmit = async () => {
    if (!formData.mfaCode) {
      setError("Please enter your verification code")
      return
    }

    setIsLoading(true)
    try {
      const data = new FormData()
      data.append("userId", mfaUserId)
      data.append("email", formData.email)
      data.append("code", formData.mfaCode)
      data.append("access_token", mfaAccessToken)
      data.append("refresh_token", mfaRefreshToken)

      const { verifyMfa } = await import("@/lib/actions")
      const result = await verifyMfa(data)

      if (result?.error) {
        setError(result.error)
      } else {
        setSuccessMessage("MFA verified! Redirecting...")
      }
    } catch (err) {
      if (err instanceof Error && err.message === "NEXT_REDIRECT") {
        setSuccessMessage("MFA verified! Redirecting...")
        window.location.href = "/staff-portal/dashboard"
        return
      }
      setError("An error occurred during MFA verification")
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleMode = () => {
    setIsSignUp(!isSignUp)
    setMfaStep(false)
    setError("")
    setSuccessMessage("")
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      adminCode: "",
      mfaCode: "",
    })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="glass-strong border-primary/20 shadow-2xl max-w-md mx-auto">
        <CardHeader className="text-center pb-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20"
          >
            {mfaStep ? (
              <Shield className="h-7 w-7 text-accent animate-pulse" />
            ) : isSignUp ? (
              <UserPlus className="h-7 w-7 text-accent" />
            ) : (
              <Shield className="h-7 w-7 text-accent" />
            )}
          </motion.div>
          <CardTitle className="text-foreground">
            {mfaStep ? "Two-Factor Auth" : isSignUp ? "Create Staff Account" : "Staff Portal Login"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {mfaStep
              ? "Enter the code from your authenticator app"
              : isSignUp
                ? "Register for staff access to the organization dashboard"
                : "Sign in to access the staff portal dashboard"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-destructive/20 px-4 py-3 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="break-words font-medium">{error}</span>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-green-500/20 px-4 py-3 text-sm text-green-600 dark:text-green-400"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="break-words">{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {!mfaStep ? (
              <>
                {isSignUp && (
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <Label htmlFor="adminCode" className="text-foreground">
                      Admin Invitation Code
                    </Label>
                    <Input
                      id="adminCode"
                      type="text"
                      placeholder="Enter the secret code"
                      value={formData.adminCode}
                      onChange={(e) => setFormData({ ...formData, adminCode: e.target.value })}
                      className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-accent"
                      required
                    />
                  </motion.div>
                )}

                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Label htmlFor="email" className="text-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="staff@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-accent"
                    required
                  />
                </motion.div>

                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Label htmlFor="password" className="text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={isSignUp ? "Min. 16 chars + complexity" : "Enter your password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-accent pr-10"
                      required
                      minLength={isSignUp ? 16 : undefined}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                    </Button>
                  </div>
                </motion.div>

                {isSignUp && (
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Label htmlFor="confirmPassword" className="text-foreground">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-accent pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showConfirmPassword ? "Hide password" : "Show password"}</span>
                      </Button>
                    </div>
                  </motion.div>
                )}
              </>
            ) : (
              <motion.div
                className="space-y-4 py-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="space-y-2">
                  <Label htmlFor="mfaCode" className="text-foreground">
                    Verification Code
                  </Label>
                  <Input
                    id="mfaCode"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={formData.mfaCode}
                    onChange={(e) => setFormData({ ...formData, mfaCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    className="bg-background border-input text-foreground text-center text-2xl tracking-[0.5em] h-14 focus:border-accent"
                    required
                    autoFocus
                  />
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => setMfaStep(false)}
                >
                  Back to login
                </Button>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              <Button
                type="submit"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/25"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mfaStep ? "Verifying..." : isSignUp ? "Creating..." : "Signing in..."}
                  </span>
                ) : (
                  mfaStep ? "Verify MFA Code" : isSignUp ? "Create Staff Account" : "Sign In"
                )}
              </Button>
            </motion.div>

            {!mfaStep && (
              <div className="text-center pt-2">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleToggleMode}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isSignUp
                    ? "Already have an account? Sign in"
                    : "Need an account? Sign up here"}
                </Button>
              </div>
            )}

            {!isSignUp && (
              <p className="text-center text-xs text-muted-foreground pt-2 border-t">
                Secure authentication powered by Supabase
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </motion.div >
  )
}
