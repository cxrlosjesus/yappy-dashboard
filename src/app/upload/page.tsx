import UploadClient from './UploadClient'

export const dynamic = 'force-dynamic'

export default async function UploadPage() {
  let archivoActual: { nombre: string; fecha: string } | null = null

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/upload-movimientos`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    if (data.archivo) {
      archivoActual = {
        nombre: data.archivo.nombre.split('/').pop() ?? data.archivo.nombre,
        fecha:  new Date(data.archivo.fecha).toLocaleDateString('es-PA', {
          day: '2-digit', month: 'short', year: 'numeric',
        }),
      }
    }
  } catch {
    // no importa si falla la consulta inicial
  }

  return <UploadClient archivoActual={archivoActual} />
}
