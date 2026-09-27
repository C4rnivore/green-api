import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { errorText, normalizeCredentials } from '../api/apiUtils.ts'
import { connectInstance } from '../api/greenApi.ts'
import { useMessengerStore } from '../store/messengerStore.ts'
import { CredentialFields, type CredentialValues } from './CredentialFields.tsx'
import { Modal } from './Modal.tsx'

interface SettingsDialogProps {
  onClose: () => void
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const credentials = useMessengerStore((state) => state.credentials)
  const setCredentials = useMessengerStore((state) => state.setCredentials)
  const clearCredentials = useMessengerStore((state) => state.clearCredentials)
  const [values, setValues] = useState<CredentialValues>({
    idInstance: credentials?.idInstance ?? '',
    apiTokenInstance: credentials?.apiTokenInstance ?? '',
    apiUrl: credentials?.apiUrl ?? '',
  })
  const [localError, setLocalError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (next: CredentialValues) => connectInstance(normalizeCredentials(next)),
    onSuccess: (_result, next) => {
      setCredentials(normalizeCredentials(next))
      onClose()
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!values.idInstance.trim() || !values.apiTokenInstance.trim()) {
      setLocalError('Заполните idInstance и apiTokenInstance')
      return
    }
    setLocalError(null)
    mutation.mutate(values)
  }

  const error = localError ?? (mutation.error ? errorText(mutation.error) : null)

  return (
    <Modal title="Настройки" onClose={onClose}>
      <form onSubmit={onSubmit}>
        <p className="hint">Данные хранятся только в этом браузере. Перед сохранением инстанс снова проверяется.</p>
        <CredentialFields idPrefix="settings" values={values} onChange={setValues} />
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="modal-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              clearCredentials()
              onClose()
            }}
          >
            Выйти
          </button>
          <button className="primary-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Проверяем...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
