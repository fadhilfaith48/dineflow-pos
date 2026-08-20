import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { api } from '@/services/httpApi'

interface ChangePasswordModalProps {
  open: boolean
  onClose: () => void
  onChanged: () => void
}

export function ChangePasswordModal({ open, onClose, onChanged }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError('')
      setSuccess(false)
      setSubmitting(false)
    }
  }, [open])

  if (!open) return null

  async function handleSubmit() {
    if (submitting) return
    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak sama.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      setSuccess(true)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengubah password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-bg-surface p-6 shadow-modal">
        <div className="flex items-center justify-between">
          <h2 className="text-heading font-semibold text-text-primary">Ganti Password</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="text-text-secondary transition-colors hover:text-text-primary"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="mt-4">
            <p className="rounded-lg bg-status-ready/10 px-4 py-3 text-body font-semibold text-status-ready">
              Password berhasil diubah.
            </p>
            <div className="mt-4">
              <Button size="sm" onClick={onClose}>
                Tutup
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-caption font-semibold uppercase tracking-wider text-text-secondary">
                  Password saat ini
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border-subtle px-3 py-2 text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
                />
              </div>
              <div>
                <label className="text-caption font-semibold uppercase tracking-wider text-text-secondary">
                  Password baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="mt-1 w-full rounded-lg border border-border-subtle px-3 py-2 text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
                />
              </div>
              <div>
                <label className="text-caption font-semibold uppercase tracking-wider text-text-secondary">
                  Konfirmasi password baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border-subtle px-3 py-2 text-body focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-tint"
                />
              </div>
            </div>

            {error && <p className="mt-3 text-caption text-status-danger">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}