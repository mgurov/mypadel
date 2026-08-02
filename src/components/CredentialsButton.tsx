import { useState } from 'react'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'

export interface Credentials {
  authKey: string
  email: string
  password: string
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

  const missing: string[] = []
  if (authKey === '') missing.push('auth key')
  if (email === '') missing.push('email')
  if (password === '') missing.push('password')
  const complete = missing.length === 0

  const openDialog = () => {
    setDraftAuthKey(authKey)
    setDraftEmail(email)
    setDraftPassword(password)
    setOpen(true)
  }

  const save = () => {
    onSave({ authKey: draftAuthKey, email: draftEmail, password: draftPassword })
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="outlined"
        onClick={openDialog}
        title={complete ? 'All credentials set' : `Missing: ${missing.join(', ')}`}
      >
        {complete ? 'Credentials Set' : 'Set Credentials'}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Credentials</DialogTitle>
        <DialogContent>
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
