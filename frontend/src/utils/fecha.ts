// Zona horaria oficial de Honduras (UTC-6, sin cambio de horario estacional)
const TZ = 'America/Tegucigalpa';

/**
 * Retorna la fecha de hoy en Honduras como string YYYY-MM-DD.
 * Evita el desfase de un día que ocurre al usar toISOString() (UTC).
 */
export function fechaHoyHonduras(): string {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Retorna la hora actual en Honduras (0-23).
 */
export function horaHonduras(): number {
  const partes = new Intl.DateTimeFormat('es-HN', {
    timeZone: TZ,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const h = partes.find(p => p.type === 'hour');
  return h ? parseInt(h.value) : new Date().getHours();
}

/**
 * Formatea una fecha YYYY-MM-DD para mostrarla en español.
 */
export function formatearFechaLarga(fechaISO: string): string {
  // Parsear como fecha local sin conversión de zona
  const [y, m, d] = fechaISO.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  return fecha.toLocaleDateString('es-HN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
