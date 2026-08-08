import { useState } from 'react'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'

export interface Credentials {
  authKey: string
  email: string
  password: string
}

const FIELD_LABELS: Record<keyof Credentials, string> = {
  authKey: 'x-myko-auth',
  email: 'email',
  password: 'password',
}

interface CredentialsButtonProps {
  authKey: string
  email: string
  password: string
  onSave: (credentials: Credentials) => void
}

export function CredentialsButton({ authKey, email, password, onSave }: CredentialsButtonProps) {
  const [open, setOpen] = useState(false)
  const [draftAuthKey, setDraftAuthKey] = useState(authKey)
  const [draftEmail, setDraftEmail] = useState(email)
  const [draftPassword, setDraftPassword] = useState(password)
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [pasteWarning, setPasteWarning] = useState<string | null>(null)

  const complete = authKey !== '' && email !== '' && password !== ''
  const anyValueSet = draftAuthKey !== '' || draftEmail !== '' || draftPassword !== ''

  const openDialog = () => {
    setDraftAuthKey(authKey)
    setDraftEmail(email)
    setDraftPassword(password)
    setPasteError(null)
    setPasteWarning(null)
    setOpen(true)
  }

  const save = () => {
    onSave({ authKey: draftAuthKey, email: draftEmail, password: draftPassword })
    setOpen(false)
  }

  const copyCredentials = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify({ authKey: draftAuthKey, email: draftEmail, password: draftPassword }),
    )
  }

  const pasteCredentials = async () => {
    setPasteError(null)
    setPasteWarning(null)
    let text: string
    try {
      text = await navigator.clipboard.readText()
    } catch {
      setPasteError('Could not read the clipboard.')
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      setPasteError('Clipboard does not contain valid JSON.')
      return
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setPasteError('Clipboard JSON does not contain any credential fields.')
      return
    }
    const obj = parsed as Record<string, unknown>
    const fields: [keyof Credentials, (value: string) => void][] = [
      ['authKey', setDraftAuthKey],
      ['email', setDraftEmail],
      ['password', setDraftPassword],
    ]
    if (!fields.some(([key]) => key in obj)) {
      setPasteError('Clipboard JSON does not contain any credential fields.')
      return
    }
    const missing: string[] = []
    for (const [key, setter] of fields) {
      const value = obj[key]
      if (typeof value === 'string' && value !== '') {
        setter(value)
      } else {
        missing.push(FIELD_LABELS[key])
      }
    }
    if (missing.length > 0) {
      setPasteWarning(`Missing credential fields: ${missing.join(', ')}. Previous values kept.`)
    }
  }

  return (
    <>
      <Button
        data-testid="credentials-button"
        variant={complete ? 'outlined' : 'contained'}
        onClick={openDialog}
      >
        {complete ? 'Auth' : 'Set Auth'}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Credentials</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button size="small" variant="outlined" onClick={copyCredentials} disabled={!anyValueSet}>
              Copy
            </Button>
            <Button size="small" variant="outlined" onClick={pasteCredentials}>
              Paste
            </Button>
          </Box>
          {pasteError && (
            <Alert severity="error" sx={{ mb: 2 }}>{pasteError}</Alert>
          )}
          {pasteWarning && (
            <Alert severity="warning" sx={{ mb: 2 }}>{pasteWarning}</Alert>
          )}
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="x-myko-auth"
            value={draftAuthKey}
            onChange={(e) => setDraftAuthKey(e.target.value)}
            variant="outlined"
          />
          <TextField
            fullWidth
            label="Email"
            value={draftEmail}
            onChange={(e) => setDraftEmail(e.target.value)}
            variant="outlined"
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            type="password"
            label="Password"
            value={draftPassword}
            onChange={(e) => setDraftPassword(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
