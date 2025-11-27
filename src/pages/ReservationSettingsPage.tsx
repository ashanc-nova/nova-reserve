import { useEffect, useMemo, useState } from 'react'
import { getRestaurant, updateRestaurantSettings, getTimeSlots, createTimeSlot, updateTimeSlot, deleteTimeSlot } from '../lib/supabase-data'
import type { TimeSlot } from '../lib/supabase'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

export default function ReservationSettingsPage() {
  const [leadTimeHours, setLeadTimeHours] = useState(2)
  const [cutoffTime, setCutoffTime] = useState('21:00')
  const [autoConfirm, setAutoConfirm] = useState(true)
  const [allowSpecialNotes, setAllowSpecialNotes] = useState(false)
  const [specialOccasions, setSpecialOccasions] = useState<string[]>([])
  const [day, setDay] = useState(new Date().getDay())
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [editing, setEditing] = useState<Partial<TimeSlot> | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { 
    // Check if settings are already cached in sessionStorage
    const cachedSettings = sessionStorage.getItem('reservation_settings')
    if (cachedSettings) {
      try {
        const s = JSON.parse(cachedSettings)
        setLeadTimeHours(s.lead_time_hours ?? 2)
        setCutoffTime(s.cutoff_time ?? '21:00')
        setAutoConfirm(s.auto_confirm ?? true)
        setAllowSpecialNotes(s.allow_special_notes ?? false)
        setSpecialOccasions(s.special_occasions ?? [])
        return // Use cached settings, don't fetch
      } catch (e) {
        // If cache is invalid, continue to fetch
      }
    }
    
    (async () => {
      const r = await getRestaurant()
      const s = r.settings?.reservation_settings || {}
      setLeadTimeHours(s.lead_time_hours ?? 2)
      setCutoffTime(s.cutoff_time ?? '21:00')
      setAutoConfirm(s.auto_confirm ?? true)
      setAllowSpecialNotes(s.allow_special_notes ?? false)
      setSpecialOccasions(s.special_occasions ?? [])
      // Cache settings
      sessionStorage.setItem('reservation_settings', JSON.stringify(s))
    })().catch(() => undefined) 
  }, [])

  const loadSlots = useMemo(() => async (d: number) => {
    const data = await getTimeSlots(d, undefined)
    setSlots(data)
  }, [])

  useEffect(() => { loadSlots(day).catch(() => undefined) }, [day, loadSlots])

  const saveSettings = async () => {
    setSaving(true)
    try {
      const r = await getRestaurant()
      const newSettings = {
        lead_time_hours: leadTimeHours,
        cutoff_time: cutoffTime,
        auto_confirm: autoConfirm,
        allow_special_notes: allowSpecialNotes,
        special_occasions: specialOccasions,
      }
      await updateRestaurantSettings({ ...r.settings, reservation_settings: newSettings })
      // Update cache with new settings
      sessionStorage.setItem('reservation_settings', JSON.stringify(newSettings))
      alert('Saved')
    } catch (e) {
      alert('Failed to save settings')
    } finally { setSaving(false) }
  }

  const upsertSlot = async () => {
    if (!editing) return
    const payload: any = {
      day_of_week: day,
      start_time: editing.start_time,
      end_time: editing.end_time,
      max_reservations: editing.max_reservations ?? 10,
      is_default: true,
      is_active: true,
    }
    if ((editing as any).id) await updateTimeSlot((editing as any).id, payload)
    else await createTimeSlot(payload)
    setEditing(null)
    await loadSlots(day)
  }

  return (
    <div className="space-y-8 px-8 md:px-16 lg:px-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reservation Settings</h2>
        <button onClick={saveSettings} disabled={saving} className="px-4 py-2 rounded-md bg-blue-500/20 border border-blue-500/30">Save</button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="relative">
          <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
          <div className="relative rounded-2xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">General</h3>
            <div className="space-y-4">
              <label className="block text-sm">Minimum Lead Time (hours)</label>
              <input type="number" className="w-full rounded-md bg-background/20 border border-border p-2" value={leadTimeHours} onChange={e => setLeadTimeHours(parseInt(e.target.value || '0'))} />
              <label className="block text-sm">Daily Cutoff Time</label>
              <input type="time" className="w-full rounded-md bg-background/20 border border-border p-2" value={cutoffTime} onChange={e => setCutoffTime(e.target.value)} />
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={autoConfirm} onChange={e => setAutoConfirm(e.target.checked)} /> Auto-confirm reservations</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={allowSpecialNotes} onChange={e => setAllowSpecialNotes(e.target.checked)} /> Allow special notes</label>
              <div>
                <div className="text-sm mb-2">Special Occasions</div>
                <div className="flex flex-wrap gap-2">
                  {['Birthday','Anniversary','First Date','Candlelight Dinner','Business Meeting','Family Gathering','Proposal','Celebration'].map(o => (
                    <button key={o} onClick={() => setSpecialOccasions(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])} className={`px-2 py-1 rounded-md border ${specialOccasions.includes(o) ? 'bg-primary/20 border-primary/30' : 'bg-background/20 border-border'}`}>{o}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-0.5 animate-pulse rounded-2xl bg-gradient-to-r from-primary/50 to-primary/20 opacity-50 blur-xl"></div>
          <div className="relative rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Time Slots</h3>
              <select value={day} onChange={e => setDay(parseInt(e.target.value))} className="rounded-md bg-background/20 border border-border p-2">
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              {slots.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div className="text-sm">{s.start_time} - {s.end_time} (max {s.max_reservations})</div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(s)} className="px-2 py-1 rounded-md border border-border bg-background/20">Edit</button>
                    <button onClick={() => deleteTimeSlot(s.id).then(() => loadSlots(day))} className="px-2 py-1 rounded-md border border-red-500/30 bg-red-500/20">Delete</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button onClick={() => setEditing({ day_of_week: day, start_time: '19:00', end_time: '21:00', max_reservations: 10 } as any)} className="px-3 py-2 rounded-md border border-primary/30 bg-primary/20">Add Slot</button>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-background/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
            <h4 className="text-lg font-semibold mb-4">{(editing as any).id ? 'Edit Slot' : 'Add Slot'}</h4>
            <div className="space-y-3">
              <label className="block text-sm">Start Time</label>
              <input type="time" value={editing.start_time || ''} onChange={e => setEditing({ ...editing, start_time: e.target.value })} className="w-full rounded-md bg-background/20 border border-border p-2" />
              <label className="block text-sm">End Time</label>
              <input type="time" value={editing.end_time || ''} onChange={e => setEditing({ ...editing, end_time: e.target.value })} className="w-full rounded-md bg-background/20 border border-border p-2" />
              <label className="block text-sm">Max Reservations</label>
              <input type="number" value={(editing.max_reservations as any) || 10} onChange={e => setEditing({ ...editing, max_reservations: parseInt(e.target.value || '0') } as any)} className="w-full rounded-md bg-background/20 border border-border p-2" />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-3 py-2 rounded-md border border-border bg-background/20">Cancel</button>
              <button onClick={upsertSlot} className="px-3 py-2 rounded-md border border-primary/30 bg-primary/20">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


