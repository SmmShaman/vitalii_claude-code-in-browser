'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { RSSSource, SourceState, TierConfig } from './types'
import { SortableSourceCard } from './SortableSourceCard'

interface SourceStats {
  total: number
  published: number
  lastArticle: Date | null
}

interface TierColumnProps {
  tier: TierConfig
  sources: RSSSource[]
  sourceStates: Map<string, SourceState>
  expandedSources: Set<string>
  sourceStats?: Map<string, SourceStats>
  onToggleSource: (id: string) => void
  onAddSource: (tier: number) => void
  onDeleteSource: (id: string) => void
  onToggleActive: (id: string) => void
  onTogglePreModeration?: (id: string) => void
  onRefreshSource: (id: string) => void
  onReorderSources?: (tier: number, orderedIds: string[]) => Promise<boolean>
}

export function TierColumn({
  tier,
  sources,
  sourceStates,
  expandedSources,
  sourceStats,
  onToggleSource,
  onAddSource,
  onDeleteSource,
  onToggleActive,
  onTogglePreModeration,
  onRefreshSource,
  onReorderSources,
}: TierColumnProps) {
  const tierSources = sources
    .filter(s => s.tier === tier.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id && onReorderSources) {
      const oldIndex = tierSources.findIndex(s => s.id === active.id)
      const newIndex = tierSources.findIndex(s => s.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        // Create new order
        const newOrder = [...tierSources]
        const [removed] = newOrder.splice(oldIndex, 1)
        newOrder.splice(newIndex, 0, removed)

        // Save new order to DB
        await onReorderSources(tier.id, newOrder.map(s => s.id))
      }
    }
  }, [tierSources, onReorderSources, tier.id])

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tierSources.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {tierSources.map(source => (
                <SortableSourceCard
                  key={source.id}
                  source={source}
                  state={sourceStates.get(source.id)}
                  stats={sourceStats?.get(source.id)}
                  isExpanded={expandedSources.has(source.id)}
                  onToggleExpand={() => onToggleSource(source.id)}
                  onDelete={onDeleteSource}
                  onToggleActive={onToggleActive}
                  onTogglePreModeration={onTogglePreModeration}
                  onRefresh={onRefreshSource}
                  isDraggable={!!onReorderSources}
                />
              ))}
            </SortableContext>
          </DndContext>
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
