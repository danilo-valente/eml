import { assertEquals } from '@std/assert'
import { decodeQuotedPrintable } from './quotedPrintable.ts'

Deno.test(decodeQuotedPrintable.name, async (t) => {
	await t.step('quoted printable', () => {
		assertEquals(decodeQuotedPrintable('=?utf-8?Q?=C3=A9=3F?='), 'é?')
		assertEquals(decodeQuotedPrintable('=?iso-8859-1?Q?=A3=2020?='), '£ 20')
		assertEquals(
			decodeQuotedPrintable('=?UTF-8?Q?Foo_Bar?= <foo.bar@example.com>'),
			'Foo Bar <foo.bar@example.com>',
		)
	})

	await t.step('base64', () => {
		assertEquals(decodeQuotedPrintable('=?gb2312?B?zsTX1s7E19Y=?='), '文字文字')
		assertEquals(decodeQuotedPrintable('=?gb2312?B?zsTX1s7E19Y=?=\n =?gb2312?B?zsTX1s7E19Y=?='), '文字文字文字文字')
	})

	await t.step('mixed', () => {
		assertEquals(decodeQuotedPrintable('=?utf-8?Q?=C3=A9=3F?=\n =?gb2312?B?zsTX1s7E19Y=?='), 'é?文字文字')
	})
})
