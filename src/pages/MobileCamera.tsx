import { useState, useRef, useCallback } from 'react'
import { useParams } from 'wouter'
import { supabase } from '@/lib/supabase'

type Step = 'ready' | 'uploading' | 'done' | 'error' | 'expired'

export default function MobileCamera() {
  const { token } = useParams<{ token: string }>()
  const [step, setStep] = useState<Step>('ready')
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!token) return
    setStep('uploading')

    try {
      // Check session is still valid
      const { data: session } = await supabase
        .from('camera_sessions')
        .select('id,status,expires_at')
        .eq('session_token', token)
        .single()

      if (!session) {
        setStep('error')
        setErrorMsg('Session not found.')
        return
      }
      if (session.status !== 'waiting' || new Date(session.expires_at) < new Date()) {
        setStep('expired')
        return
      }

      // Upload to Supabase Storage
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `camera/${token}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('camera-photos')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('camera-photos')
        .getPublicUrl(path)

      // Update session with photo URL
      const { error: updateError } = await supabase
        .from('camera_sessions')
        .update({ photo_url: urlData.publicUrl, status: 'photo_taken' })
        .eq('session_token', token)

      if (updateError) throw updateError

      setStep('done')
    } catch (err) {
      console.error(err)
      setStep('error')
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed')
    }
  }, [token])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white">
      {step === 'ready' && (
        <div className="text-center space-y-8 w-full max-w-sm">
          <div className="space-y-2">
            <div className="text-5xl">📷</div>
            <h1 className="text-2xl font-bold">RevTech Camera</h1>
            <p className="text-gray-400 text-sm">Take a photo of the device to analyse it with AI</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'image/*'
                  fileInputRef.current.capture = 'environment'
                  fileInputRef.current.click()
                }
              }}
              className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-lg font-semibold transition-colors flex items-center justify-center gap-3"
            >
              📷 Take Photo
            </button>

            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'image/*'
                  fileInputRef.current.removeAttribute('capture')
                  fileInputRef.current.click()
                }
              }}
              className="w-full py-4 rounded-2xl border border-gray-700 text-gray-300 hover:bg-gray-800 active:bg-gray-700 text-base font-medium transition-colors flex items-center justify-center gap-3"
            >
              🗂️ Choose from Gallery
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
          />

          <p className="text-gray-600 text-xs">This page expires in 10 minutes</p>
        </div>
      )}

      {step === 'uploading' && (
        <div className="text-center space-y-6">
          <div className="text-5xl animate-pulse">⬆️</div>
          <div>
            <h2 className="text-xl font-semibold">Uploading photo...</h2>
            <p className="text-gray-400 text-sm mt-1">Please wait</p>
          </div>
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

      {step === 'done' && (
        <div className="text-center space-y-6">
          <div className="text-6xl">✅</div>
          <div>
            <h2 className="text-2xl font-bold text-green-400">Photo sent!</h2>
            <p className="text-gray-400 mt-2">The AI is now analysing the device.</p>
            <p className="text-gray-500 text-sm mt-1">You can close this window.</p>
          </div>
        </div>
      )}

      {step === 'expired' && (
        <div className="text-center space-y-6">
          <div className="text-6xl">⏰</div>
          <div>
            <h2 className="text-xl font-semibold text-yellow-400">Session expired</h2>
            <p className="text-gray-400 text-sm mt-1">Generate a new QR code in RevTech.</p>
          </div>
        </div>
      )}

      {step === 'error' && (
        <div className="text-center space-y-6">
          <div className="text-6xl">❌</div>
          <div>
            <h2 className="text-xl font-semibold text-red-400">Error</h2>
            <p className="text-gray-500 text-sm mt-1">{errorMsg}</p>
          </div>
          <button
            onClick={() => setStep('ready')}
            className="px-6 py-3 rounded-xl bg-gray-800 text-white text-sm hover:bg-gray-700 transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
