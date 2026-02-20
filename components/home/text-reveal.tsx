"use client"

import { motion } from "framer-motion"

export function TextReveal({ children, delay = 0 }: { children: string; delay?: number }) {
    const words = children.split(" ")
    return (
        <span className="inline-flex flex-wrap justify-center gap-x-2">
            {words.map((word, i) => (
                <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 50, rotateX: -90 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{
                        duration: 0.8,
                        delay: delay + i * 0.08,
                        ease: [0.215, 0.61, 0.355, 1],
                    }}
                    className="inline-block"
                >
                    {word}
                </motion.span>
            ))}
        </span>
    )
}
