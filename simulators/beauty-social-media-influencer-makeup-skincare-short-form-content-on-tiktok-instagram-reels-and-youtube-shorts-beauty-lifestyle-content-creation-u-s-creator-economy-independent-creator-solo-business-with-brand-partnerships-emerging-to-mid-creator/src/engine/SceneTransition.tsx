import { AnimatePresence, motion } from 'framer-motion'
import { ReactNode } from 'react'

interface SceneTransitionProps {
  nodeId: string
  children: ReactNode
}

export default function SceneTransition({ nodeId, children }: SceneTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={nodeId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="w-full min-h-[100dvh] flex flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
