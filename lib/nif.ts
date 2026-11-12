const LETRAS = 'TRWAGMYFPDXBNJZSQVHLCKE'

export function validarNif(raw: string): boolean {
  const v = raw.trim().toUpperCase()

  if (/^\d{8}[A-Z]$/.test(v)) {
    return LETRAS[parseInt(v.slice(0, 8), 10) % 23] === v[8]
  }

  if (/^[XYZ]\d{7}[A-Z]$/.test(v)) {
    const n = parseInt(String('XYZ'.indexOf(v[0])) + v.slice(1, 8), 10)
    return LETRAS[n % 23] === v[8]
  }

  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(v)) {
    const d = v.slice(1, 8)
    let par = 0
    let impar = 0
    for (let i = 0; i < 7; i++) {
      const n = parseInt(d[i], 10)
      if (i % 2 === 0) {
        const x = n * 2
        impar += Math.floor(x / 10) + (x % 10)
      } else {
        par += n
      }
    }
    const c = (10 - ((par + impar) % 10)) % 10
    const letra = 'JABCDEFGHI'[c]
    const ctrl = v[8]
    if ('PQRSNW'.includes(v[0])) return ctrl === letra
    if ('ABEH'.includes(v[0])) return ctrl === String(c)
    return ctrl === String(c) || ctrl === letra
  }

  return false
}