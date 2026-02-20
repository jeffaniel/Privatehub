"use client"

import { motion } from "framer-motion"

export function Step({
    number,
    title,
    description,
    delay,
}: { number: number; title: string; description: string; delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.5 }}
            className="text-center relative z-10"
        >
            <motion.div
                whileHover={{ scale: 1.15, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold mb-4 shadow-lg shadow-accent/25 relative"
            >
                <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: delay + 0.2, type: "spring" }}
                >
                    {number}
                </motion.span>
                <motion.div
                    className="absolute inset-0 rounded-full border-2 border-accent"
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay }}
                />
            </motion.div>
            <h3 className="font-semibold text-lg text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </motion.div>
    )
}
