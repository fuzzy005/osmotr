import { useEffect, useRef, useState } from 'react'

export function useCamera(active) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (active) return undefined
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setReady(false)
    return undefined
  }, [active])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  async function start() {
    setError('')
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Камера открывается только по защищённому адресу, https. На телефоне откройте ссылку, которую показывает компьютер, и подтвердите сертификат.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream
      const video = videoRef.current
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play()
      setReady(true)
    } catch (err) {
      setReady(false)
      setError(
        err?.name === 'NotAllowedError'
          ? 'Разрешите камеру в настройках Safari для этого сайта и обновите страницу.'
          : 'Камера не включилась. Закройте её в других приложениях и попробуйте снова.',
      )
    }
  }

  return { videoRef, ready, error, start }
}
