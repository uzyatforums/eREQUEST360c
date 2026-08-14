import * as React from 'react'
import { Shield, Lock, User, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/auth-context'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export const LoginPage: React.FC = () => {
  const { login, sessionExpiredMessage } = useAuth()

  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [errors, setErrors] = React.useState<{ username?: string; password?: string }>({})

  const validate = () => {
    const errs: { username?: string; password?: string } = {}
    if (!username.trim()) {
      errs.username = 'Username is required'
    }
    if (!password) {
      errs.password = 'Password is required'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!validate()) return

    setIsSubmitting(true)
    try {
      await login(username.trim(), password)
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid username or password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Banking Gradient & Grid Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-slate-900 opacity-90" />
      <div className="absolute inset-0 bg-[radial-gradient(#1e40af_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />

      {/* Decorative Glow Circles */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-600/30 border border-blue-400/30">
            e360
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            eREQUEST<span className="text-blue-500">360</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium max-w-xs">
            Enterprise Multi-Tenant Card Request & Lifecycle Management Platform
          </p>
        </div>

        {/* Login Card Container */}
        <div className="mt-8 bg-slate-900/80 backdrop-blur-md py-8 px-6 shadow-2xl border border-slate-800 rounded-2xl sm:px-10">
          <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">System Sign In</h2>
              <p className="text-xs text-slate-400">Enter your banking credentials to authenticate</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Shield className="h-3.5 w-3.5" />
              <span>JWT Session</span>
            </div>
          </div>

          {/* Session Inactivity Timeout Banner */}
          {sessionExpiredMessage && !errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 p-3.5 bg-amber-950/60 border border-amber-700/80 rounded-lg flex items-start gap-3 text-xs text-amber-200 animate-in fade-in"
            >
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold text-amber-300 block">Session Expired</span>
                <span>{sessionExpiredMessage}</span>
              </div>
            </div>
          )}

          {/* Global Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 p-3.5 bg-red-950/60 border border-red-800/80 rounded-lg flex items-start gap-3 text-xs text-red-200 animate-in fade-in"
            >
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold text-red-300 block">Authentication Failed</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Username Input */}
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username / Operator ID
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }))
                  }}
                  placeholder="Enter username"
                  className="pl-9 bg-slate-950/60 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500"
                  aria-invalid={!!errors.username}
                />
              </div>
              {errors.username && <p className="mt-1 text-xs text-red-400 font-medium">{errors.username}</p>}
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
                  }}
                  placeholder="••••••••"
                  className="pl-9 pr-10 bg-slate-950/60 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500"
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400 font-medium">{errors.password}</p>}
            </div>

            {/* Submit Button */}
            <div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg shadow-lg shadow-blue-600/25 transition-all text-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating against SQL Server...
                  </span>
                ) : (
                  'Sign In to Dashboard'
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Security Notice Footer */}
        <div className="mt-6 text-center text-[11px] text-slate-500 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Authorized access only. All activities are logged to audit trail.
          </p>
          <p>eREQUEST360 Platform • Security Version 1.1</p>
        </div>
      </div>
    </div>
  )
}
