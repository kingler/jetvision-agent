"use client"

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, Variants } from "motion/react"
import LoadingThreeDotsJumping from './loading-dots'

const statusMessages = [
    "🔍 Analyzing your request...",
    "🤖 Connecting to JetVision Agent...",
    "📊 Accessing Apollo.io database...",
    "✈️ Checking Avinode for aircraft availability...",
    "📧 Preparing outreach campaigns...",
    "🎯 Identifying high-value prospects...",
    "📈 Analyzing market data...",
    "🔄 Processing information...",
    "💼 Compiling executive assistant contacts...",
    "🌐 Searching private jet charter options...",
    "📝 Generating personalized recommendations...",
    "🚀 Finalizing response..."
]

interface AgentLoadingStatusProps {
    isLoading: boolean
    customMessage?: string
    progress?: number
    currentStep?: string
    elapsed?: number
}

export default function AgentLoadingStatus({ isLoading, customMessage, progress: externalProgress, currentStep, elapsed }: AgentLoadingStatusProps) {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
    const [progress, setProgress] = useState(externalProgress || 0)

    useEffect(() => {
        if (!isLoading) {
            setCurrentMessageIndex(0)
            setProgress(externalProgress || 0)
            return
        }

        // Use external progress if provided, otherwise use auto-increment
        if (externalProgress !== undefined) {
            setProgress(externalProgress)
        } else {
            const messageInterval = setInterval(() => {
                setCurrentMessageIndex((prev) => (prev + 1) % statusMessages.length)
            }, 2500)

            const progressInterval = setInterval(() => {
                setProgress((prev) => Math.min(prev + 1, 95))
            }, 300)

            return () => {
                clearInterval(messageInterval)
                clearInterval(progressInterval)
            }
        }
    }, [isLoading, externalProgress])

    const messageVariants: Variants = {
        enter: {
            opacity: 0,
            y: 20,
        },
        center: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.3,
                ease: "easeOut"
            }
        },
        exit: {
            opacity: 0,
            y: -20,
            transition: {
                duration: 0.2,
                ease: "easeIn"
            }
        }
    }

    if (!isLoading) return null

    return (
        <div className="w-full space-y-4 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
            <div className="flex flex-col items-center space-y-4">
                <LoadingThreeDotsJumping />
                
                <AnimatePresence mode="wait">
                    <motion.div
                        key={customMessage || statusMessages[currentMessageIndex]}
                        variants={messageVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="text-center"
                    >
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {customMessage || statusMessages[currentMessageIndex]}
                        </p>
                    </motion.div>
                </AnimatePresence>

                {/* Progress bar */}
                <div className="w-full max-w-xs">
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            initial={{ width: "0%" }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                        <p>Processing... {Math.round(progress)}%</p>
                        {elapsed && (
                            <p>{Math.round(elapsed / 1000)}s elapsed</p>
                        )}
                        {currentStep && (
                            <p className="capitalize">{currentStep} step</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}