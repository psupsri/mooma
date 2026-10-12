// Showtimes are stored in a Postgres TIMESTAMP (no time zone) column, so the
// value is the cinema's wall-clock time; Go just labels it "Z". Format in UTC
// so "10:30:00Z" displays as 10:30 instead of being shifted to the viewer's
// time zone.
const TIME_ZONE = 'UTC'

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE })
const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
})

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

export function formatDay(iso: string): string {
  return dayFormat.format(new Date(iso))
}

// YYYY-MM-DD of the showtime's wall-clock date, used to group by day.
export function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

// A backend time with the cinema's offset ("2026-10-13T10:14:00+07:00") as the
// same wall-clock form as showtimes ("...10:14:00Z"), so it formats in cinema
// time like every other time on the page.
export function cinemaWallClock(isoWithOffset: string): string {
  return `${isoWithOffset.slice(0, 19)}Z`
}

const bookedAtFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

// created_at is a real instant, so it is shown in the viewer's time zone.
export function formatBookedAt(iso: string): string {
  return bookedAtFormat.format(new Date(iso))
}

export function byShowtime<T extends { showtime: string }>(a: T, b: T): number {
  return Date.parse(a.showtime) - Date.parse(b.showtime)
}
