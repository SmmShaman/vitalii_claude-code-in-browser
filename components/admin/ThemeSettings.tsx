'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { PALETTES, applyPalette, getActivePaletteId, setActivePaletteId, getPaletteById, type ColorPalette } from '@/utils/theme'

function rgbToHexStr(rgb: string): string {
  const [r, g, b] = rgb.split(' ').map(Number)
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
}

function SwatchRow({ palette, compact = false }: { palette: ColorPalette; compact?: boolean }) {
  const swatches = [
    { label: 'Surface', rgb: palette.colors['--surface-dark'] },
    { label: 'Elevated', rgb: palette.colors['--surface-elevated'] },
    { label: 'Brand', rgb: palette.colors['--accent-brand'] },
    { label: 'Brand Lt', rgb: palette.colors['--accent-brand-light'] },
    { label: 'Text', rgb: palette.colors['--text-primary'] },
    { label: 'Muted', rgb: palette.colors['--text-muted'] },
  ]

  return (
    <div className="flex gap-1.5">
      {swatches.map(s => (
        <div key={s.label} className="flex flex-col items-center gap-0.5">
          <div
            className="rounded-md border border-white/10"
            style={{
              backgroundColor: `rgb(${s.rgb})`,
              width: compact ? 28 : 36,
              height: compact ? 28 : 36,
            }}
            title={`${s.label}: ${rgbToHexStr(s.rgb)}`}
          />
          {!compact && (
            <span className="text-[9px] text-gray-500 leading-none">{s.label}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function PreviewCard({ palette }: { palette: ColorPalette }) {
  const bg = `rgb(${palette.colors['--surface-dark']})`
  const elevated = `rgb(${palette.colors['--surface-elevated']})`
  const border = `rgb(${palette.colors['--surface-border']})`
  const text = `rgb(${palette.colors['--text-primary']})`
  const muted = `rgb(${palette.colors['--text-muted']})`
  const brand = `rgb(${palette.colors['--accent-brand']})`
  const brandLight = `rgb(${palette.colors['--accent-brand-light']})`

  return (
    <div className="rounded-lg p-3 mt-2" style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: brand }} />
        <span className="text-xs font-medium" style={{ color: text }}>Preview Title</span>
      </div>
      <p className="text-[10px] mb-2" style={{ color: muted }}>
        This is how content looks with this palette
      </p>
      <div className="flex gap-1.5">
        <div className="text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: elevated, color: brandLight }}>
          Tag
        </div>
        <div className="text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: brand, color: text }}>
          Active
        </div>
      </div>
    </div>
  )
}

export function ThemeSettings() {
  const [activePaletteId, setActive] = useState('neutral-dark')
  const [savedPaletteId, setSavedId] = useState('neutral-dark')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    const id = getActivePaletteId()
    setActive(id)
    setSavedId(id)
  }, [])

  const hasUnsavedChanges = activePaletteId !== savedPaletteId

  // Preview only — apply CSS vars + localStorage, no DB save
  const handlePreview = (palette: ColorPalette) => {
    applyPalette(palette)
    setActive(palette.id)
    setActivePaletteId(palette.id)
    setSaveResult(null)
  }

  // Save to DB — persists across sessions for all visitors
  const handleSave = async () => {
    setSaving(true)
    setSaveResult(null)
    try {
      const { data } = await supabase
        .from('api_settings')
        .update({ key_value: activePaletteId })
        .eq('key_name', 'ACTIVE_COLOR_PALETTE')
        .select()

      if (!data || data.length === 0) {
        await supabase.from('api_settings').insert({
          key_name: 'ACTIVE_COLOR_PALETTE',
          key_value: activePaletteId,
          description: 'Active color palette for the site',
          is_active: true,
        })
      }
      setSavedId(activePaletteId)
      setSaveResult({ ok: true, msg: `${getPaletteById(activePaletteId).name} saved!` })
    } catch (e: any) {
      setSaveResult({ ok: false, msg: e.message || 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  // Revert to saved palette
  const handleRevert = () => {
    const palette = getPaletteById(savedPaletteId)
    applyPalette(palette)
    setActive(savedPaletteId)
    setActivePaletteId(savedPaletteId)
    setSaveResult(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Color Palette</h3>
          <p className="text-sm text-gray-400">Click to preview, then Save to apply for all visitors</p>
        </div>
        <div className="flex items-center gap-2">
          {saveResult && (
            <span className={`text-sm px-3 py-1 rounded-full ${saveResult.ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {saveResult.msg}
            </span>
          )}
          {hasUnsavedChanges && (
            <button
              onClick={handleRevert}
              className="px-4 py-2 text-sm rounded-lg border border-white/20 text-gray-300 hover:bg-white/5 transition-colors"
            >
              Revert
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
              hasUnsavedChanges
                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20'
                : 'bg-white/5 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : hasUnsavedChanges ? '💾 Save' : 'Saved'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PALETTES.map(palette => {
          const isActive = palette.id === activePaletteId
          const isSaved = palette.id === savedPaletteId
          const isPreview = isActive && !isSaved
          return (
            <button
              key={palette.id}
              onClick={() => handlePreview(palette)}
              disabled={saving}
              className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                isActive
                  ? isPreview
                    ? 'border-amber-500 bg-white/5 shadow-lg shadow-amber-500/10'
                    : 'border-green-500 bg-white/5 shadow-lg shadow-green-500/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold text-white">{palette.name}</span>
                  {isActive && isSaved && (
                    <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">
                      Saved
                    </span>
                  )}
                  {isPreview && (
                    <span className="ml-2 text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">
                      Preview
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3">{palette.description}</p>
              <SwatchRow palette={palette} />
              <PreviewCard palette={palette} />
            </button>
          )
        })}
      </div>

      {/* Current palette detail */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h4 className="text-sm font-medium text-white mb-3">Current Palette Tokens</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
          {Object.entries(PALETTES.find(p => p.id === activePaletteId)?.colors || {}).map(([key, rgb]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded border border-white/10 flex-shrink-0"
                style={{ backgroundColor: `rgb(${rgb})` }}
              />
              <div className="min-w-0">
                <div className="text-gray-400 truncate">{key.replace('--', '')}</div>
                <div className="text-gray-500 font-mono text-[10px]">{rgbToHexStr(rgb)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
