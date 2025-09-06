'use client';

import { motion, Variants } from 'motion/react';

function LoadingThreeDotsJumping() {
    const dotVariants: Variants = {
        jump: {
            y: -30,
            transition: {
                duration: 0.8,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: 'easeInOut',
            },
        },
    };

    return (
        <motion.div
            animate="jump"
            transition={{ staggerChildren: -0.2, staggerDirection: -1 }}
            className="flex items-center justify-center gap-2.5"
        >
            <motion.div
                className="h-5 w-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 will-change-transform"
                variants={dotVariants}
            />
            <motion.div
                className="h-5 w-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 will-change-transform"
                variants={dotVariants}
            />
            <motion.div
                className="h-5 w-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 will-change-transform"
                variants={dotVariants}
            />
        </motion.div>
    );
}

export default LoadingThreeDotsJumping;
