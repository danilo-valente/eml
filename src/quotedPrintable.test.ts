import { assertEquals } from '@std/assert'
import { decodeQuotedPrintable } from './quotedPrintable.ts'

Deno.test(decodeQuotedPrintable.name, async (t) => {
	await t.step('quoted printable', () => {
		assertEquals(decodeQuotedPrintable('=?utf-8?Q?=C3=A9=3F?='), 'é?')
		assertEquals(decodeQuotedPrintable('=?iso-8859-1?Q?=A3=2020?='), '£ 20')
	})

	await t.step('base64', () => {
		assertEquals(decodeQuotedPrintable('=?gb2312?B?zsTX1s7E19Y=?='), '文字文字')
	})
})
