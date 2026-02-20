"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { getCurrentStaff } from "@/lib/auth"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'moderator' | 'viewer'
}

export function ProtectedRoute({ children, requiredRole = 'admin' }: ProtectedRouteProps) {
  const router = useRouter()
  const hasCheckedRef = useRef(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [showRetry, setShowRetry] = useState(false)
  const [authStatus, setAuthStatus] = useState<"starting" | "verifying" | "handshaking" | "done">("starting")

  useEffect(() => {
    // Avoid re-checking if already authenticated or if check is in progress
    if (isAuthenticated !== null || hasCheckedRef.current) return
    hasCheckedRef.current = true
    setAuthStatus("verifying")

    let isMounted = true

    // Safety timer to show a manual override if it takes too long
    const retryTimeoutId = setTimeout(() => {
      if (isAuthenticated === null && isMounted) {
        setShowRetry(true)
      }
    }, 8000)

    const timeoutId = setTimeout(() => {
      if (isAuthenticated === null && isMounted) {
        console.warn('⚠️ [ProtectedRoute] Auth check taking too long (5s), redirecting to login...')
        router.push('/staff-portal/login')
      }
    }, 15000) // Increased threshold but added retry earlier

    const checkAuth = async () => {
      console.log('🔍 [ProtectedRoute] Starting checkAuth...')
      try {
        const staff = await getCurrentStaff()

        if (!isMounted) return

        if (!staff) {
          console.log('ℹ️ [ProtectedRoute] No staff found, redirecting to login')
          router.push('/staff-portal/login')
          return
        }

        // Check role permissions
        const roleHierarchy = {
          'viewer': 0,
          'moderator': 1,
          'admin': 2
        }

        const userLevel = roleHierarchy[staff.role as keyof typeof roleHierarchy] || 0
        const requiredLevel = roleHierarchy[requiredRole]

        if (userLevel < requiredLevel) {
          console.warn(`⚠️ [ProtectedRoute] Insufficient role: ${staff.role} < ${requiredRole}`)
          router.push('/staff-portal/login')
          return
        }

        console.log('✅ [ProtectedRoute] Auth verified successfully')
        setUserRole(staff.role)
        setAuthStatus("handshaking")
        setIsAuthenticated(true)
        clearTimeout(timeoutId)
        clearTimeout(retryTimeoutId)
      } catch (err) {
        console.error('❌ [ProtectedRoute] Fatal checkAuth error:', err)
        if (isMounted) router.push('/staff-portal/login')
      }
    }

    checkAuth()
    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      clearTimeout(retryTimeoutId)
    }
  }, [router, requiredRole])

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-muted-foreground font-medium">Initializing secure connection...</p>
          <p className="text-[10px] text-muted-foreground/50 mt-1 uppercase tracking-widest font-mono">
            Status: {authStatus}
          </p>
          {showRetry && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 space-y-3"
            >
              <p className="text-xs text-muted-foreground max-w-xs">
                This process is taking longer than expected. You might need to sign in again.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Retry
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  import("@/lib/auth").then(m => m.clearStaffSession())
                  window.location.href = "/staff-portal/login"
                }}>
                  Back to Login
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null
  return <>{children}</>
}
