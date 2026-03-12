import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Solo mostrar si el usuario no lo ha descartado antes
      const dismissed = localStorage.getItem('pwa-install-dismissed')
      if (!dismissed) setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setVisible(false)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-4 flex items-center gap-3">
        <div className="bg-blue-600 rounded-xl p-2 shrink-0">
          <img src="/logo.svg" alt="NutriRiesgo" className="w-8 h-8" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Instalar NutriRiesgo</p>
          <p className="text-xs text-gray-500 truncate">Accede sin internet desde tu celular</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-700 transition-colors"
        >
          <Download size={13} />
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
