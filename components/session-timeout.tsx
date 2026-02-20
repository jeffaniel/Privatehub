"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes

export function SessionTimeout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const lastActivityRef = useRef(Date.now())

    useEffect(() => {
        // Reset timer on user activity without triggering re-renders
        const updateLastActivity = () => {
            lastActivityRef.current = Date.now()
        }

        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"]
        events.forEach(event => {
            window.addEventListener(event, updateLastActivity)
        })

        // Check for inactivity periodically
        const intervalId = setInterval(async () => {
            if (Date.now() - lastActivityRef.current > INACTIVITY_TIMEOUT) {
                console.log("Session timed out due to inactivity")
                try {
                    await supabase.auth.signOut()
                    router.push("/staff-portal/login?timeout=true")
                } catch (err) {
                    console.error("Logout error on timeout:", err)
                    window.location.href = "/staff-portal/login?timeout=true"
                }
            }
        }, 30 * 1000) // Check every 30 seconds

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, updateLastActivity)
            })
            clearInterval(intervalId)
        }
    }, [router])

    return <>{children}</>
}
