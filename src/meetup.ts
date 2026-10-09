import type { MeetupEvent } from './api'

export const WOLFGANG_MEMBER_ID = '456811393'
export const MY_MEMBER_ID = '176325322'
export const FLORIDSDORF_VENUE_ID = '28170985'

export const RSVP_STATE_JOIN_OPEN = 'JOIN_OPEN'
export const RSVP_STATE_NOT_OPEN_YET = 'NOT_OPEN_YET'

export const ATTENDANCE_CERTAINTY_MAX = 5

export function formatRsvpState(state: string): string {
  return state.toLowerCase().replaceAll('_', ' ')
}

export function isHostedByWolfgang(event: MeetupEvent): boolean {
  return event.eventHosts.some((host) => host.memberId === WOLFGANG_MEMBER_ID)
}

export function isVisibleMeetup(event: MeetupEvent): boolean {
  return event.status !== 'CANCELLED' && event.venue.id !== FLORIDSDORF_VENUE_ID
}

export function isFloridsdorfEvent(event: MeetupEvent): boolean {
  return event.status !== 'CANCELLED' && event.venue.id === FLORIDSDORF_VENUE_ID
}

export function isMyRsvp(event: MeetupEvent): boolean {
  return event.rsvps.edges.some((edge) => edge.node.member.id === MY_MEMBER_ID)
}

export type AttendanceState = 'yes' | 'no' | 'uncertain'

export function attendanceState(event: MeetupEvent): AttendanceState {
  if (isMyRsvp(event)) return 'yes'
  if (event.rsvps.totalCount > ATTENDANCE_CERTAINTY_MAX) return 'uncertain'
  return 'no'
}

export function formatAttendance(event: MeetupEvent): string {
  const max = event.maxTickets
  const going = event.going.totalCount
  if (max === going) return 'full'
  if (max < going) return `overbooked (${max})`
  return `${max - going} free of ${max}`
}
