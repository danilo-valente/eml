import { assertEquals } from '@std/assert/equals'
import { parseDateHeader } from './date.ts'

Deno.test(parseDateHeader.name, () => {
	const date = parseDateHeader('Wed, 29 Jan 2014 11:10:06 +0100')

	assertEquals(date.toString(), '2014-01-29T11:10:06+01:00[+01:00]')
	assertEquals(date.epochMilliseconds, new Date('2014-01-29T10:10:06.000Z').valueOf())
})
