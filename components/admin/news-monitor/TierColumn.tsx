'use client'

import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { RSSSource, SourceState, TierConfig } from './types'
import { SourceCard } from './SourceCard'

interface TierColumnProps {
  tier: TierConfig
  sources: RSSSource[]
  sourceStates: Map<string, SourceState>
  onAddSource: (tier: number) => void
  onDeleteSource: (id: string) => void
  onToggleActive: (id: string) => void
  onRefreshSource: (id: string) => void
}

export function TierColumn({
  tier,
  sources,
  sourceStates,
  onAddSource,
  onDeleteSource,
  onToggleActive,
  onRefreshSource,
}: TierColumnProps) {
  const tierSources = sources.filter(s => s.tier === tier.id)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: tier.id * 0.1 }}
      className={`flex flex-col rounded-xl border ${tier.borderColor} ${tier.bgColor} overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div>
          <h3 className={`font-bold text-lg ${tier.color}`}>
            Tier {tier.id}
          </h3>
          <p className="text-gray-400 text-sm">
            {tier.description}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onAddSource(tier.id)}
          className={`p-2 rounded-lg ${tier.bgColor} ${tier.color} hover:bg-white/10 transition-colors`}
          title="Add Source"
        >
          <Plus className="h-5 w-5" />
        </motion.button>
      </div>

      {/* Sources */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[600px]">
        {tierSources.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No sources in this tier</p>
            <button
              onClick={() => onAddSource(tier.id)}
              className={`mt-2 text-sm ${tier.color} hover:underline`}
            >
              Add your first source
            </button>
          </div>
        ) : (
          tierSources.map(source => (
            <SourceCard
              key={source.id}
              source={source}
              state={sourceStates.get(source.id)}
              onDelete={onDeleteSource}
              onToggleActive={onToggleActive}
              onRefresh={onRefreshSource}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 bg-black/20">
        <p className="text-xs text-gray-500 text-center">
          {tierSources.length} source{tierSources.length !== 1 ? 's' : ''} |{' '}
          {tierSources.filter(s => s.isActive).length} active
        </p>
      </div>
    </motion.div>
  )
}
