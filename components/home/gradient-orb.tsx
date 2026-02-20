"use client"

import { motion } from "framer-motion"

export function GradientOrb({ className, delay = 0 }: { className: string; delay?: number }) {
    return (
        <motion.div
            className={`absolute rounded-full blur-3xl ${className}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
                opacity: [0.3, 0.5, 0.3],
                scale: [1, 1.2, 1],
                x: [0, 30, 0],
                y: [0, -20, 0],
            }}
            transition={{
                duration: 8,
                delay,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
            }}
        />
    )
}
