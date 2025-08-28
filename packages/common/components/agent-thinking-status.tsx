"use client"

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from "motion/react"
import { IconCheck, IconCircleDashed } from '@tabler/icons-react'

interface ThinkingStep {
    id: string
    text: string
    status: 'pending' | 'active' | 'complete'
}

const thinkingSteps: ThinkingStep[] = [
    { id: 'read', text: 'Reading request context', status: 'pending' },
    { id: 'apollo', text: 'Searching Apollo.io for executive contacts', status: 'pending' },
    { id: 'avainode', text: 'Checking Avainode for aircraft availability', status: 'pending' },
    { id: 'analyze', text: 'Analyzing fleet utilization metrics', status: 'pending' },
    { id: 'market', text: 'Evaluating market opportunities', status: 'pending' },
    { id: 'campaign', text: 'Preparing outreach campaigns', status: 'pending' },
    { id: 'response', text: 'Crafting a comprehensive response', status: 'pending' },
]

interface AgentThinkingStatusProps {
    isThinking: boolean
    startTime?: number
}

export default function AgentThinkingStatus({ isThinking, startTime }: AgentThinkingStatusProps) {
    const [steps, setSteps] = useState<ThinkingStep[]>(thinkingSteps)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [elapsedTime, setElapsedTime] = useState(0)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (!isThinking) {
            // Reset steps when not thinking
            setSteps(thinkingSteps.map(s => ({ ...s, status: 'pending' })))
            setCurrentStepIndex(0)
            setElapsedTime(0)
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            return
        }

        // Start the timer
        const startTimestamp = startTime || Date.now()
        intervalRef.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTimestamp) / 1000))
        }, 100)

        // Progress through steps
        const stepInterval = setInterval(() => {
            setCurrentStepIndex(prev => {
                const next = prev + 1
                if (next >= thinkingSteps.length) {
                    clearInterval(stepInterval)
                    return prev
                }
                return next
            })
        }, 2000)

        return () => {
            clearInterval(stepInterval)
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [isThinking, startTime])

    useEffect(() => {
        // Update step statuses based on current index
        setSteps(prev => prev.map((step, idx) => ({
            ...step,
            status: idx < currentStepIndex ? 'complete' : idx === currentStepIndex ? 'active' : 'pending'
        })))
    }, [currentStepIndex])

    if (!isThinking) return null

    return (
        <div className="w-full">
            {/* Thinking header with pulsing animation */}
            <div className="flex items-center gap-2 mb-4">
                <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-sm text-gray-600 font-medium"
                >
                    Thinking...
                </motion.div>
                {elapsedTime > 0 && (
                    <span className="text-xs text-gray-400">
                        {elapsedTime}s
                    </span>
                )}
            </div>

            {/* Steps list */}
            <div className="space-y-2">
                <AnimatePresence mode="sync">
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ 
                                opacity: step.status === 'pending' ? 0.4 : 1,
                                x: 0 
                            }}
                            transition={{ 
                                delay: index * 0.1,
                                duration: 0.3
                            }}
                            className="flex items-start gap-2"
                        >
                            {/* Status indicator */}
                            <div className="mt-0.5">
                                {step.status === 'complete' ? (
                                    <IconCheck 
                                        size={16} 
                                        className="text-green-500"
                                    />
                                ) : step.status === 'active' ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <IconCircleDashed 
                                            size={16} 
                                            className="text-purple-500"
                                        />
                                    </motion.div>
                                ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                                )}
                            </div>

                            {/* Step text */}
                            <motion.span 
                                className={`text-sm ${
                                    step.status === 'complete' 
                                        ? 'text-gray-600' 
                                        : step.status === 'active'
                                        ? 'text-gray-900 font-medium'
                                        : 'text-gray-400'
                                }`}
                            >
                                {step.text}
                            </motion.span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Optional context message */}
            {currentStepIndex > 2 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-xs text-gray-500 leading-relaxed"
                >
                    I'm analyzing your request and coordinating with JetVision's systems to provide the most comprehensive response. 
                    This includes real-time data from Apollo.io for lead generation and Avainode for aircraft availability.
                </motion.div>
            )}
        </div>
    )
}