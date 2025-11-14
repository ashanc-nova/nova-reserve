import { useEffect, useState } from 'react'

export function useTypewriter(text: string, speedMs = 18) {
  const [output, setOutput] = useState('')

  useEffect(() => {
    setOutput('')
    let i = 0
    const id = setInterval(() => {
      if (i >= text.length) { clearInterval(id); return }
      setOutput(text.substring(0, i + 1))
      i++
    }, speedMs)
    return () => clearInterval(id)
  }, [text, speedMs])

  return output
}


