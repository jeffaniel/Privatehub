"use client"

import type React from "react"
import { useRef } from "react"
import { motion, useTransform, useMotionValue } from "framer-motion"

export function FeatureCard({
    icon,
    title,
    description,
    delay,
}: { icon: React.ReactNode; title: string; description: string; delay: number }) {
    const ref = useRef<HTMLDivElement>(null)
    const x = useMotionValue(0)
    const y = useMotionValue(0)

    const rotateX = useTransform(y, [-100, 100], [10, -10])
    const rotateY = useTransform(x, [-100, 100], [-10, 10])

    const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = ref.current?.getBoundingClientRect()
        if (rect) {
            x.set(e.clientX - rect.left - rect.width / 2)
            y.set(e.clientY - rect.top - rect.height / 2)
        }
    }

    const reset = () => {
        x.set(0)
        y.set(0)
    }

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay, duration: 0.5 }}
            onMouseMove={handleMouse}
            onMouseLeave={reset}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="group perspective-1000"
        >
            <div className="rounded-2xl border border-border bg-card p-6 h-full transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/30 relative overflow-hidden">
                <motion.div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div
                    className="inline-flex items-center justify-center rounded-xl bg-primary/10 p-3 text-primary mb-4 group-hover:bg-accent/15 group-hover:text-accent transition-all duration-300 group-hover:scale-110"
                    style={{ transform: "translateZ(20px)" }}
                >
                    {icon}
                </div>
                <h3 className="font-semibold text-lg text-card-foreground mb-2" style={{ transform: "translateZ(10px)" }}>
                    {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
        </motion.div>
    )
}
