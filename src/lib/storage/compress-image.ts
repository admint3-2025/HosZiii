/**
 * Compresión de imágenes en el cliente usando Canvas API.
 * Redimensiona y comprime imágenes antes de subirlas al servidor.
 * Ideal para fotos de móvil que suelen pesar 3-15MB.
 *
 * Resultado típico: 200-500KB (JPEG calidad 0.75, max 1920px)
 */

const MAX_DIMENSION = 1920
const JPEG_QUALITY = 0.75

/**
 * Comprime una imagen File/Blob usando Canvas.
 * Retorna un nuevo Blob (JPEG) mucho más liviano.
 *
 * - Redimensiona a max 1920px (manteniendo aspect ratio)
 * - Comprime a JPEG 75% calidad
 * - Si la imagen es más pequeña que 500KB, la retorna sin cambios
 *
 * @param file - La imagen original (File o Blob)
 * @returns Blob comprimido en formato JPEG
 */
export async function compressImage(file: File | Blob): Promise<Blob> {
  // Si el archivo es pequeño (<500KB), no comprimir
  if (file.size < 500 * 1024) {
    return file
  }

  // Verificar que es una imagen (no comprimir PDFs, etc.)
  const type = file instanceof File ? file.type : file.type
  if (!type.startsWith('image/')) {
    return file
  }

  // No intentar comprimir HEIC/HEIF (Canvas no lo soporta directamente)
  if (type.includes('heic') || type.includes('heif')) {
    return file
  }

  return new Promise<Blob>((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      try {
        let { width, height } = img

        // Calcular nuevas dimensiones manteniendo aspect ratio
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round(height * (MAX_DIMENSION / width))
            width = MAX_DIMENSION
          } else {
            width = Math.round(width * (MAX_DIMENSION / height))
            height = MAX_DIMENSION
          }
        }

        // Crear canvas y dibujar imagen redimensionada
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file) // Fallback: retornar original
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        // Convertir a JPEG comprimido
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file) // Fallback
              return
            }

            // Si el resultado comprimido es más grande que el original, usar original
            if (blob.size >= file.size) {
              resolve(file)
              return
            }

            console.log(
              `[compressImage] ${formatSize(file.size)} → ${formatSize(blob.size)} ` +
              `(${Math.round((1 - blob.size / file.size) * 100)}% reducción)`
            )

            resolve(blob)
          },
          'image/jpeg',
          JPEG_QUALITY
        )
      } catch (err) {
        console.warn('[compressImage] Error comprimiendo, usando original:', err)
        resolve(file) // Fallback: retornar original sin comprimir
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      console.warn('[compressImage] No se pudo cargar imagen, usando original')
      resolve(file) // Fallback: retornar original
    }

    img.src = url
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
