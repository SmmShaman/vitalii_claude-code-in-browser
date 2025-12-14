'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Plus, Trash2, RefreshCw, Save, GripVertical, Sparkles } from 'lucide-react'
import {
  Skill,
  SkillCategory,
  categoryColors,
  categoryLabels,
  getStoredSkills,
  saveSkills,
  resetSkillsToDefault,
  generateSkillId,
} from '@/utils/skillsStorage'

export const SkillsManager = () => {
  const [skills, setSkills] = useState<Skill[]>([])
  const [mounted, setMounted] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>('development')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Load skills on mount
  useEffect(() => {
    setMounted(true)
    setSkills(getStoredSkills())
  }, [])

  // Track changes
  useEffect(() => {
    if (mounted) {
      const stored = getStoredSkills()
      const changed = JSON.stringify(skills) !== JSON.stringify(stored)
      setHasChanges(changed)
    }
  }, [skills, mounted])

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return

    const newSkill: Skill = {
      id: generateSkillId(),
      name: newSkillName.trim(),
      category: newSkillCategory,
    }

    setSkills([...skills, newSkill])
    setNewSkillName('')
  }

  const handleDeleteSkill = (id: string) => {
    setSkills(skills.filter(skill => skill.id !== id))
  }

  const handleCategoryChange = (id: string, category: SkillCategory) => {
    setSkills(skills.map(skill =>
      skill.id === id ? { ...skill, category } : skill
    ))
  }

  const handleNameChange = (id: string, name: string) => {
    setSkills(skills.map(skill =>
      skill.id === id ? { ...skill, name } : skill
    ))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      saveSkills(skills)
      setSaveSuccess(true)
      setHasChanges(false)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      console.error('Error saving skills:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset to default skills? This will remove all your changes.')) {
      const defaultSkills = resetSkillsToDefault()
      setSkills(defaultSkills)
      setHasChanges(false)
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  // Group skills by category for display
  const skillsByCategory = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) {
      acc[skill.category] = []
    }
    acc[skill.category].push(skill)
    return acc
  }, {} as Record<SkillCategory, Skill[]>)

  if (!mounted) {
    return (
      <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <div className="animate-pulse h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Skills Manager</h2>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReset}
              className="flex items-center gap-2 px-3 py-2 bg-gray-600/50 hover:bg-gray-600/70 text-gray-300 rounded-lg transition-colors text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Reset to Default
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                hasChanges
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
            </motion.button>
          </div>
        </div>

        <p className="text-gray-400 text-sm">
          Manage your skills displayed in the Skills section. Each skill has a name and category
          which determines its color. Changes are saved to local storage.
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-sm">
          <span className="text-gray-500">Total skills: <span className="text-white">{skills.length}</span></span>
          {hasChanges && (
            <span className="text-yellow-500">Unsaved changes</span>
          )}
        </div>
      </div>

      {/* Add New Skill */}
      <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <h3 className="text-white font-medium mb-4">Add New Skill</h3>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
            placeholder="Skill name..."
            className="flex-1 min-w-[200px] px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <select
            value={newSkillCategory}
            onChange={(e) => setNewSkillCategory(e.target.value as SkillCategory)}
            className="px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            {(Object.keys(categoryLabels) as SkillCategory[]).map((cat) => (
              <option key={cat} value={cat} className="bg-slate-800">
                {categoryLabels[cat]}
              </option>
            ))}
          </select>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddSkill}
            disabled={!newSkillName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Add Skill
          </motion.button>
        </div>

        {/* Preview */}
        {newSkillName.trim() && (
          <div className="mt-4">
            <span className="text-gray-500 text-sm">Preview: </span>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${categoryColors[newSkillCategory].bg} ${categoryColors[newSkillCategory].text}`}
            >
              {newSkillName}
            </span>
          </div>
        )}
      </div>

      {/* Category Legend */}
      <div className="bg-black/20 backdrop-blur-lg rounded-xl p-4 border border-white/10">
        <h3 className="text-white font-medium mb-3 text-sm">Category Colors</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(categoryLabels) as SkillCategory[]).map((cat) => (
            <div
              key={cat}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${categoryColors[cat].bg} ${categoryColors[cat].text}`}
            >
              {categoryLabels[cat]}
            </div>
          ))}
        </div>
      </div>

      {/* Skills List by Category */}
      <div className="space-y-4">
        {(Object.keys(categoryLabels) as SkillCategory[]).map((category) => {
          const categorySkills = skillsByCategory[category] || []
          if (categorySkills.length === 0) return null

          return (
            <div
              key={category}
              className="bg-black/20 backdrop-blur-lg rounded-xl p-4 border border-white/10"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-3 h-3 rounded-full`}
                  style={{ backgroundColor: categoryColors[category].bgHex }}
                />
                <h3 className="text-white font-medium text-sm">
                  {categoryLabels[category]}
                  <span className="text-gray-500 ml-2">({categorySkills.length})</span>
                </h3>
              </div>

              <Reorder.Group
                axis="y"
                values={categorySkills}
                onReorder={(newOrder) => {
                  const otherSkills = skills.filter(s => s.category !== category)
                  setSkills([...otherSkills, ...newOrder])
                }}
                className="space-y-2"
              >
                <AnimatePresence mode="popLayout">
                  {categorySkills.map((skill) => (
                    <Reorder.Item
                      key={skill.id}
                      value={skill}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="flex items-center gap-2 p-2 bg-black/20 rounded-lg group"
                    >
                      <GripVertical className="h-4 w-4 text-gray-600 cursor-grab active:cursor-grabbing" />

                      {/* Skill Badge Preview */}
                      <div
                        className={`px-2.5 py-1 rounded-full text-xs font-medium min-w-[80px] text-center ${categoryColors[skill.category].bg} ${categoryColors[skill.category].text}`}
                      >
                        {skill.name}
                      </div>

                      {/* Name Input */}
                      <input
                        type="text"
                        value={skill.name}
                        onChange={(e) => handleNameChange(skill.id, e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-black/30 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                      />

                      {/* Category Select */}
                      <select
                        value={skill.category}
                        onChange={(e) => handleCategoryChange(skill.id, e.target.value as SkillCategory)}
                        className="px-2 py-1.5 bg-black/30 border border-white/10 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                      >
                        {(Object.keys(categoryLabels) as SkillCategory[]).map((cat) => (
                          <option key={cat} value={cat} className="bg-slate-800">
                            {categoryLabels[cat]}
                          </option>
                        ))}
                      </select>

                      {/* Delete Button */}
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </Reorder.Item>
                  ))}
                </AnimatePresence>
              </Reorder.Group>
            </div>
          )
        })}
      </div>

      {/* All Skills Preview */}
      <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
        <h3 className="text-white font-medium mb-4">Preview (as shown on website)</h3>
        <div
          className="flex flex-wrap items-center justify-center gap-2 p-4 rounded-lg"
          style={{ backgroundColor: '#fde5e5' }} // Skills section background color
        >
          {skills.map((skill) => (
            <span
              key={skill.id}
              className={`px-3 py-1 rounded-full text-sm font-semibold ${categoryColors[skill.category].bg} ${categoryColors[skill.category].text}`}
            >
              {skill.name}
            </span>
          ))}
        </div>
      </div>

      {/* Refresh Notice */}
      {hasChanges && (
        <div className="bg-yellow-500/10 backdrop-blur-lg rounded-xl p-6 border border-yellow-500/30">
          <div className="flex items-start gap-3">
            <RefreshCw className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-yellow-500 font-medium mb-2">Page Refresh Required</h3>
              <p className="text-gray-400 text-sm mb-4">
                After saving your changes, refresh the page to see updated skills on the main website.
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Page Now
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
