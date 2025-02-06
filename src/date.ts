import { unreachable } from '@std/assert/unreachable'

const ISO = Symbol('iso')

/**
 * Minimal interface for forward-compatibility with `Temporal.ZonedDateTime`.
 * - Example string representation: `2014-01-29T11:10:06+01:00[+01:00]`
 * - To convert to a real `Temporal.ZonedDateTime`, use `Temporal.ZonedDateTime.from(zonedDateTime.toString())`
 * - To convert to a `Temporal.Instant` (without time zone/offset information), use
 *   `Temporal.Instant.fromEpochMilliseconds(zonedDateTime.epochMilliseconds)`
 * - To convert to a `Date` (without time zone/offset information), use `new Date(zonedDateTime.epochMilliseconds)`
 */
export type ZonedDateTime = {
	toString(): string
	epochMilliseconds: number
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

export function parseDateHeader(dateStr: string): ZonedDateTime {
	const re = new RegExp(
		String.raw`^(?:(?<dow>${DAY_NAMES.join('|')}),\s+)?(?<day>\d{1,2})\s+(?<month>${
			MONTH_NAMES.join('|')
		})\s+(?<year>\d{4})\s+(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})\s+(?<tz>[\-+]\d{4})$`,
		'i',
	)

	const m = dateStr.match(re)

	if (!m) {
		const date = new Date(dateStr);
		const iso = date.toISOString();
		return {
			// @ts-expect-error Better logging inspectability
			[ISO]: iso,
			epochMilliseconds: date.valueOf(),
			toString: () => iso,
		}
	}

	const { day, month, year, hour, minute, second, tz } = m.groups!

	const offset = tz.replace(/\d{2}$/, ':$&')

	const isoSansTz = `${year}-${
		String(MONTH_NAMES.indexOf(month as typeof MONTH_NAMES[number]) + 1).padStart(2, '0')
	}-${day.padStart(2, '0')}T${hour}:${minute}:${second}${offset}`

	const date = new Date(isoSansTz)
	const pseudoTz = `[${offset}]`

	const iso = isoSansTz + pseudoTz

	return {
		// @ts-expect-error Better logging inspectability
		[ISO]: iso,
		epochMilliseconds: date.valueOf(),
		toString: () => iso,
	}
}
