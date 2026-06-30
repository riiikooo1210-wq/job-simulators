import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface SceneTransitionProps {
  nodeId: string
  children: ReactNode
}

export default function SceneTransition({ nodeId, children }: SceneTransitionProps) {
  return (
    <motion.div
      key={nodeId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full min-h-[100dvh] flex flex-col"
    >
      {children}
    </motion.div>
  )
}
