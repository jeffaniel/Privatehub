"use client"

import { motion } from "framer-motion"
import { TrendingUp } from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"

export function TrendingCard({
    title,
    votes,
    category,
    delay,
}: { title: string; votes: number; category: string; delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay }}
            whileHover={{ y: -8, scale: 1.02 }}
            className="group cursor-pointer"
        >
            <div className="rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-xl hover:shadow-accent/10 hover:border-accent/30 relative overflow-hidden">
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "0%" }}
                    transition={{ duration: 0.3 }}
                />
                <div className="relative z-10">
                    <span className="text-xs font-medium text-accent">{category}</span>
                    <h4 className="font-medium text-foreground mt-1 group-hover:text-accent transition-colors">{title}</h4>
                    <div className="flex items-center gap-2 mt-3">
                        <motion.div className="flex items-center gap-1 text-sm text-muted-foreground" whileHover={{ scale: 1.1 }}>
                            <TrendingUp className="h-4 w-4 text-accent" />
                            <AnimatedCounter value={votes} />
                            <span>votes</span>
                        </motion.div>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
