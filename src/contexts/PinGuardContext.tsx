import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { PinGuardModal, isSessionUnlocked } from '@/components/PinGuardModal'

interface PinGuardContextValue {
  /**
   * Request PIN confirmation before executing an action.
   * If the session is already unlocked (PIN entered < 30 min ago), executes immediately.
   * @param description Human-readable description of the action (shown to the user)
   * @param onSuccess Callback executed after successful PIN confirmation
   */
  requestPin: (description: string, onSuccess: () => void) => void
  /** True if the session is currently unlocked (PIN confirmed recently) */
  isUnlocked: boolean
}

const PinGuardContext = createContext<PinGuardContextValue>({
  requestPin: (_desc, cb) => cb(),
  isUnlocked: true,
})

export function usePinGuard() {
  return useContext(PinGuardContext)
}

interface PendingAction {
  description: string
  onSuccess: () => void
}

export function PinGuardProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingAction | null>(null)

  const requestPin = useCallback((description: string, onSuccess: () => void) => {
    if (isSessionUnlocked()) {
      // Session already unlocked — execute immediately, no modal needed
      onSuccess()
      return
    }
    setPending({ description, onSuccess })
  }, [])

  function handleSuccess() {
    const action = pending
    setPending(null)
    action?.onSuccess()
  }

  function handleCancel() {
    setPending(null)
  }

  return (
    <PinGuardContext.Provider value={{ requestPin, isUnlocked: isSessionUnlocked() }}>
      {children}
      {pending && (
        <PinGuardModal
          description={pending.description}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      )}
    </PinGuardContext.Provider>
  )
}
