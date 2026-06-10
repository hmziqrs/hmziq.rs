/**
 * Date utility functions
 */

const months: Record<string, string> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
}

/** Parse "MMM YYYY - MMM YYYY" or "MMM YYYY - Present" to ISO datetime range */
export function periodToDatetime(period: string): string | undefined {
  const [start, end] = period.split(' - ')
  if (!start) return undefined
  const [, sMon, sYear] = start.match(/^(\w{3})\s(\d{4})$/) ?? []
  if (!sMon || !sYear || !months[sMon]) return undefined
  const startISO = `${sYear}-${months[sMon]}`
  if (!end || end === 'Present') return startISO
  const [, eMon, eYear] = end.match(/^(\w{3})\s(\d{4})$/) ?? []
  if (!eMon || !eYear || !months[eMon]) return startISO
  return `${startISO}/${eYear}-${months[eMon]}`
}
