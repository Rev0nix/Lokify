import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import IssueModal from './components/IssueModal'
import { supabase } from './lib/supabase'
import type { Issue } from './types/issue'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(supabase))
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!supabase) {
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setIsAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let active = true

    async function loadIssues() {
      setError('')
      if (!user || !supabase) {
        setIssues([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      const { data, error: queryError } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false })

      if (!active) return
      if (queryError) setError(queryError.message)
      else setIssues((data ?? []) as Issue[])
      setIsLoading(false)
    }

    void loadIssues()
    return () => { active = false }
  }, [user])

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return

    setIsAuthenticating(true)
    setAuthMessage('')
    try {
      const result = isSigningUp
        ? await supabase.auth.signUp({ email: authEmail, password: authPassword })
        : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })

      if (result.error) {
        setAuthMessage(result.error.message)
      } else if (isSigningUp && !result.data.session) {
        setAuthMessage('Check your email to confirm your account, then sign in.')
      } else {
        setUser(result.data.user)
        setAuthPassword('')
      }
    } catch (authError) {
      setAuthMessage(authError instanceof Error ? authError.message : 'Unable to authenticate.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  function handleIssueCreated(issue: Issue) {
    setIssues((currentIssues) => [issue, ...currentIssues])
    setNotice('Issue reported. Sending confirmation email...')
  }

  function handleNotificationResult(emailSent: boolean | null) {
    setNotice(
      emailSent === false
        ? 'Issue reported. The confirmation email could not be sent.'
        : emailSent === null
          ? 'Issue reported. Configure EmailJS to enable email confirmations.'
          : 'Issue reported. A confirmation email was sent.',
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a aria-label="Lokify home" className="flex items-center gap-3 text-slate-950 no-underline" href="/">
            <span className="grid size-10 place-items-center rounded-lg bg-emerald-800 text-lg font-bold text-white">L</span>
            <span className="text-xl font-bold tracking-tight">lokify</span>
          </a>
          <div className="text-right">
            {user ? (
              <>
                <p className="text-sm font-medium text-slate-800">{user.email}</p>
                <button
                  className="mt-0.5 text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                  onClick={() => void supabase?.auth.signOut()}
                  type="button"
                >
                  Sign out
                </button>
              </>
            ) : <p className="text-sm text-slate-500">Community issue tracker</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col justify-between gap-6 border-b border-slate-200 pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-800">Your neighborhood, heard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Community issues</h1>
            <p className="mt-2 max-w-xl text-slate-600">Report local problems and follow the issues raised by your community.</p>
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!user || !supabase}
            onClick={() => { setNotice(''); setIsModalOpen(true) }}
            type="button"
          >
            Report issue
          </button>
        </div>

        {notice && <p className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{notice}</p>}
        {error && <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}

        <section aria-labelledby="issues-heading" className="pt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950" id="issues-heading">Recent reports</h2>
            {user && <span className="text-sm text-slate-500">{issues.length} {issues.length === 1 ? 'issue' : 'issues'}</span>}
          </div>

          {!supabase ? (
            <div className="border-y border-slate-200 py-10 text-sm text-slate-600">Supabase is not configured. Set the required environment variables to continue.</div>
          ) : isAuthLoading ? (
            <p className="border-y border-slate-200 py-10 text-sm text-slate-600">Checking your session...</p>
          ) : !user ? (
            <div className="grid gap-8 border-y border-slate-200 py-8 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] md:gap-12 md:py-10">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Sign in to get started</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">Your account keeps reports connected to you and lets the community follow local issues.</p>
              </div>
              <form className="space-y-4" onSubmit={handleAuthSubmit}>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-800">Email</span>
                  <input autoComplete="email" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" onChange={(event) => setAuthEmail(event.target.value)} required type="email" value={authEmail} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-800">Password</span>
                  <input autoComplete={isSigningUp ? 'new-password' : 'current-password'} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" minLength={6} onChange={(event) => setAuthPassword(event.target.value)} required type="password" value={authPassword} />
                </label>
                {authMessage && <p className="text-sm text-slate-700" role="status">{authMessage}</p>}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  <button className="rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60" disabled={isAuthenticating} type="submit">
                    {isAuthenticating ? 'Please wait...' : isSigningUp ? 'Create account' : 'Sign in'}
                  </button>
                  <button className="text-sm font-semibold text-emerald-900 underline underline-offset-2" onClick={() => { setIsSigningUp(!isSigningUp); setAuthMessage('') }} type="button">
                    {isSigningUp ? 'Already registered? Sign in' : 'Create an account'}
                  </button>
                </div>
              </form>
            </div>
          ) : isLoading ? (
            <p className="border-y border-slate-200 py-10 text-sm text-slate-600">Loading community reports...</p>
          ) : issues.length === 0 ? (
            <div className="border-y border-slate-200 py-10">
              <h3 className="font-semibold text-slate-900">No issues reported yet</h3>
              <p className="mt-1 text-sm text-slate-600">Be the first to report something that needs attention.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 border-y border-slate-200">
              {issues.map((issue) => (
                <li className="py-5 sm:py-6" key={issue.id}>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-950">{issue.title}</h3>
                        <span className="rounded-sm bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900">{issue.category}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{issue.description}</p>
                      {issue.latitude != null && issue.longitude != null && (
                        <p className="mt-2 text-xs text-slate-500">Location: {issue.latitude.toFixed(5)}, {issue.longitude.toFixed(5)}</p>
                      )}
                    </div>
                    <time className="shrink-0 text-xs text-slate-500" dateTime={issue.created_at}>
                      {issue.created_at ? new Date(issue.created_at).toLocaleDateString() : 'Recently reported'}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {isModalOpen && (
        <IssueModal
          onClose={() => setIsModalOpen(false)}
          onCreated={handleIssueCreated}
          onNotificationResult={handleNotificationResult}
        />
      )}
    </div>
  )
}

export default App
