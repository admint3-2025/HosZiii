/**
 * Utilidad para generar códigos QR reales y escaneables
 */

import QRCode from 'qrcode'

export interface QROptions {
  size?: number
  margin?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
}

/**
 * Genera un código QR como Data URL (base64)
 * @param text Texto a codificar en el QR
 * @param options Opciones de generación
 * @returns Promise con data URL del QR
 */
export async function generateQRCode(
  text: string,
  options: QROptions = {}
): Promise<string> {
  const {
    size = 300,
    margin = 2,
    errorCorrectionLevel = 'H'
  } = options

  try {
    // Usar librería qrcode con alta calidad
    return await QRCode.toDataURL(text, {
      width: size,
      margin,
      errorCorrectionLevel,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  } catch (error) {
    console.error('Error generando QR:', error)
    throw new Error('No se pudo generar el código QR')
  }
}

/**
 * Genera URL completa para escaneo de activo
 */
export function getAssetQRUrl(assetCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/admin/assets/scan/${encodeURIComponent(assetCode)}`
}

/**
 * Genera contenido del QR (puede incluir más datos en formato JSON si es necesario)
 */
export function getAssetQRContent(assetCode: string): string {
  // Simple: solo la URL
  return getAssetQRUrl(assetCode)
  
  // Alternativa: JSON con más datos
  // return JSON.stringify({
  //   type: 'asset',
  //   code: assetCode,
  //   url: getAssetQRUrl(assetCode),
  //   timestamp: Date.now()
  // })
}
