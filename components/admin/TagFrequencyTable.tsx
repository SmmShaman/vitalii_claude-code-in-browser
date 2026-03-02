'use client'

import { useState, useEffect } from 'react'
import { getTagFrequencies } from '@/integrations/supabase/client'
import type { TagFrequency } from '@/integrations/supabase/client'
import { Loader2, RefreshCw, Hash } from 'lucide-react'

export function TagFrequencyTable() {
  const [newsTags, setNewsTags] = useState<TagFrequency[]>([])
  const [blogTags, setBlogTags] = useState<TagFrequency[]>([])
  const [loading, setLoading] = useState(true)

  const loadTags = async () => {
    setLoading(true)
    try {
      const [news, blog] = await Promise.all([
        getTagFrequencies('news'),
        getTagFrequencies('blog'),
      ])
      setNewsTags(news)
      setBlogTags(blog)
    } catch (error) {
      console.error('Failed to load tag frequencies:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTags()
  }, [])

  // Merge news and blog tags into a combined view
  const newsMap = new Map(newsTags.map(t => [t.tag_name, t.article_count]))
  const blogMap = new Map(blogTags.map(t => [t.tag_name, t.article_count]))
  const allTagNames = new Set([...newsMap.keys(), ...blogMap.keys()])

  const combined = Array.from(allTagNames).map(tag => ({
    tag,
    news: newsMap.get(tag) || 0,
    blog: blogMap.get(tag) || 0,
    total: (newsMap.get(tag) || 0) + (blogMap.get(tag) || 0),
  })).sort((a, b) => b.total - a.total)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Hash className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Tag Frequencies</h2>
          <span className="text-sm text-gray-400">({combined.length} tags)</span>
        </div>
        <button
          onClick={loadTags}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5 text-left text-sm text-gray-400">
              <th className="px-4 py-3 w-12">#</th>
              <th className="px-4 py-3">Tag</th>
              <th className="px-4 py-3 text-right">News</th>
              <th className="px-4 py-3 text-right">Blog</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {combined.map((row, index) => (
              <tr key={row.tag} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-2.5 text-sm text-gray-500">{index + 1}</td>
                <td className="px-4 py-2.5">
                  <span className="text-sm font-medium text-white">{row.tag}</span>
                </td>
                <td className="px-4 py-2.5 text-right text-sm text-gray-300">{row.news || '-'}</td>
                <td className="px-4 py-2.5 text-right text-sm text-gray-300">{row.blog || '-'}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300">
                    {row.total}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
