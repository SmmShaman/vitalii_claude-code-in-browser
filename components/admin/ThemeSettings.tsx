'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { PALETTES, applyPalette, getActivePaletteId, setActivePaletteId, getActiveMode, setActiveMode, getPaletteById, type ColorPalette, type ColorMode } from '@/utils/theme'

function rgbToHexStr(rgb: string): string {
  const [r, g, b] = rgb.split(' ').map(Number)
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
}

function SwatchRow({ palette, compact = false, mode = 'dark' as ColorMode }: { palette: ColorPalette; compact?: boolean; mode?: ColorMode }) {
  const c = mode === 'light' ? palette.light : palette.colors
  const swatches = [
    { label: 'Surface', rgb: c['--surface-dark'] },
    { label: 'Elevated', rgb: c['--surface-elevated'] },
    { label: 'Brand', rgb: c['--accent-brand'] },
    { label: 'Brand Lt', rgb: c['--accent-brand-light'] },
    { label: 'Text', rgb: c['--text-primary'] },
    { label: 'Muted', rgb: c['--text-muted'] },
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

function PreviewCard({ palette, mode = 'dark' as ColorMode }: { palette: ColorPalette; mode?: ColorMode }) {
  const c = mode === 'light' ? palette.light : palette.colors
  const bg = `rgb(${c['--surface-dark']})`
  const elevated = `rgb(${c['--surface-elevated']})`
  const border = `rgb(${c['--surface-border']})`
  const text = `rgb(${c['--text-primary']})`
  const muted = `rgb(${c['--text-muted']})`
  const brand = `rgb(${c['--accent-brand']})`
  const brandLight = `rgb(${c['--accent-brand-light']})`

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
  const [mode, setMode] = useState<ColorMode>('dark')
  const [savedMode, setSavedMode] = useState<ColorMode>('dark')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    const id = getActivePaletteId()
    const m = getActiveMode()
    setActive(id)
    setSavedId(id)
    setMode(m)
    setSavedMode(m)
  }, [])

  const hasUnsavedChanges = activePaletteId !== savedPaletteId || mode !== savedMode

  // Preview only — apply CSS vars + localStorage, no DB save
  const handlePreview = (palette: ColorPalette) => {
    applyPalette(palette, mode)
    setActive(palette.id)
    setActivePaletteId(palette.id)
    setSaveResult(null)
  }

  // Toggle dark/light mode
  const handleModeToggle = () => {
    const newMode: ColorMode = mode === 'dark' ? 'light' : 'dark'
    setMode(newMode)
    setActiveMode(newMode)
    applyPalette(getPaletteById(activePaletteId), newMode)
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
      // Save mode too
      const modeKey = 'ACTIVE_COLOR_MODE'
      const { data: modeData } = await supabase
        .from('api_settings')
        .update({ key_value: mode })
        .eq('key_name', modeKey)
        .select()
      if (!modeData || modeData.length === 0) {
        await supabase.from('api_settings').insert({
          key_name: modeKey,
          key_value: mode,
          description: 'Color mode: dark or light',
          is_active: true,
        })
      }

      setSavedId(activePaletteId)
      setSavedMode(mode)
      setSaveResult({ ok: true, msg: `${getPaletteById(activePaletteId).name} (${mode}) saved!` })
    } catch (e: any) {
      setSaveResult({ ok: false, msg: e.message || 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  // Revert to saved palette + mode
  const handleRevert = () => {
    const palette = getPaletteById(savedPaletteId)
    applyPalette(palette, savedMode)
    setActive(savedPaletteId)
    setActivePaletteId(savedPaletteId)
    setMode(savedMode)
    setActiveMode(savedMode)
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

      {/* Dark / Light toggle */}
      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
        <span className="text-sm text-gray-400">Mode:</span>
        <button
          onClick={handleModeToggle}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'dark'
              ? 'bg-gray-800 text-white border border-white/20'
              : 'bg-amber-50 text-amber-900 border border-amber-200'
          }`}
        >
          {mode === 'dark' ? '🌙 Dark' : '☀️ Light'}
        </button>
        <span className="text-xs text-gray-500">
          {mode === 'dark' ? 'Dark backgrounds, light text' : 'Light backgrounds, dark text'}
        </span>
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
              <SwatchRow palette={palette} mode={mode} />
              <PreviewCard palette={palette} mode={mode} />
            </button>
          )
        })}
      </div>

      {/* Current palette detail */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <h4 className="text-sm font-medium text-white mb-3">Current Palette Tokens ({mode})</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
          {Object.entries((mode === 'light' ? PALETTES.find(p => p.id === activePaletteId)?.light : PALETTES.find(p => p.id === activePaletteId)?.colors) || {}).map(([key, rgb]) => (
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
