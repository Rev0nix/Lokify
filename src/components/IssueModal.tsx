import emailjs from '@emailjs/browser'
import { useEffect, useState, type FormEvent } from 'react'
import { issueCategories, type Issue, type IssueCategory } from '../types/issue'
import { supabase } from '../lib/supabase'

interface IssueModalProps {
  onClose: () => void
  onCreated: (issue: Issue) => void
  onNotificationResult: (emailSent: boolean | null) => void
}

type LocationState = 'loading' | 'ready' | 'unavailable'

function IssueModal({ onClose, onCreated, onNotificationResult }: IssueModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<IssueCategory>(issueCategories[0])
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationState, setLocationState] = useState<LocationState>(
    navigator.geolocation ? 'loading' : 'unavailable',
  )
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ latitude: coords.latitude, longitude: coords.longitude })
        setLocationState('ready')
      },
      () => setLocationState('unavailable'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSubmitting, onClose])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) {
      setError('Supabase is not configured. Add its URL and anon key to your environment.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Sign in before reporting a civic issue.')
      }

      const { data: issue, error: insertError } = await supabase
        .from('issues')
        .insert({
          title: title.trim(),
          description: description.trim(),
          category,
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
          user_id: user.id,
        })
        .select('*')
        .single()

      if (insertError) throw insertError

      onCreated(issue as Issue)
      onClose()

      const emailServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
      const emailTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
      const emailPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

      if (user.email && emailServiceId && emailTemplateId && emailPublicKey) {
        void emailjs.send(
            emailServiceId,
            emailTemplateId,
            {
              to_email: user.email,
              issue_title: title.trim(),
              issue_category: category,
              issue_description: description.trim(),
              issue_id: String(issue.id),
            },
            { publicKey: emailPublicKey },
          )
          .then(() => onNotificationResult(true))
          .catch(() => onNotificationResult(false))
      } else {
        onNotificationResult(null)
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to report this issue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
    >
      <section
        aria-labelledby="issue-modal-title"
        aria-modal="true"
        className="max-h-[min(90vh,760px)] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl sm:p-8"
        role="dialog"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Community report</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950" id="issue-modal-title">Report an issue</h2>
            <p className="mt-1 text-sm text-slate-600">Share what needs attention in your neighborhood.</p>
          </div>
          <button
            aria-label="Close report form"
            className="rounded-md p-2 text-2xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-800">Issue title</span>
            <input
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Large pothole on Cedar Avenue"
              required
              value={title}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-800">Category</span>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
              onChange={(event) => setCategory(event.target.value as IssueCategory)}
              value={category}
            >
              {issueCategories.map((issueCategory) => (
                <option key={issueCategory} value={issueCategory}>{issueCategory}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-800">Description</span>
            <textarea
              className="min-h-32 w-full resize-y rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the issue and any details that could help resolve it."
              required
              value={description}
            />
          </label>

          <div aria-live="polite" className="rounded-md bg-slate-50 px-3.5 py-3 text-sm">
            <p className="font-medium text-slate-800">Location</p>
            <p className="mt-1 text-slate-600">
              {locationState === 'loading' && 'Requesting your device location...'}
              {locationState === 'unavailable' && 'Location unavailable. You can still submit without coordinates.'}
              {locationState === 'ready' && coordinates && `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`}
            </p>
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">{error}</p>}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button
              className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Submitting...' : 'Submit report'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default IssueModal