import { assertEquals } from '@std/assert'
import { Eml } from './eml.ts'
import { hash } from './_testUtils.ts'
import { concat } from '@std/bytes/concat'
import { decodeBase64 } from '@std/encoding/base64'

Deno.test('Parse message', async () => {
	const eml = new Eml(await Deno.readFile('./src/_fixtures/nodemailer.eml'))

	assertEquals(eml.attachments.length, 3)
	assertEquals(await hash(eml.attachments[1].content), '2822cbcf68de083b96ac3921d0e308a2')

	assertEquals(eml.attachments[0].filename, 'image.png')
	assertEquals(eml.attachments[1].filename, 'nyan cat ✔.gif')
	assertEquals(eml.attachments[2].filename, 'nyan cat ✔.txt')

	assertEquals(eml.subject, 'Nodemailer is unicode friendly ✔ (1476358788189)')
	assertEquals(eml.to, [
		{
			address: 'andris+123@kreata.ee',
			name: 'Andris Reinman',
		},
		{
			address: 'andris.reinman@gmail.com',
		},
	])
})

Deno.test('Parse message with large plaintext content', async () => {
	const eml = new Eml(await Deno.readFile('./src/_fixtures/large_text.eml'))

	assertEquals(eml.body.plain.length, 1_164_213)
})

Deno.test('Parse spam message', async () => {
	const eml = new Eml(await Deno.readFile('./src/_fixtures/spam.eml'))

	assertEquals(eml.body.plain.length, 857)
})

Deno.test('Japanese charset', () => {
	const source = concat([
		new TextEncoder().encode(`Date: Wed, 29 Jan 2014 11:10:06 +0100
From: test@example.com
To: recipient@example.com
Content-Type: text/plain; charset=ISO-2022-JP
Subject: =?ISO-2022-JP?B?GyRCM1g5OzU7PVEwdzgmPSQ4IUYkMnFKczlwGyhC?=

`),
		decodeBase64('GyRCM1g5OzU7PVEwdzgmPSQ4IUYkMnFKczlwGyhC'),
	])

	const eml = new Eml(source)

	const expected = '学校技術員研修検討会報告'
	assertEquals(eml.subject, expected)
	assertEquals(eml.body.plain, expected)
})

Deno.test('Parse encoded address string', (t) => {
	const source = `Date: Wed, 29 Jan 2014 11:10:06 +0100
From: test@example.com
To: =?utf-8?B?IlJ5ZGVsIiA8UnlkZWxrYWxvdEAxN2d1YWd1YS5jb20+?=, andris@tr.ee

test`
	const eml = new Eml(source)

	assertEquals(eml.to, [
		{ address: 'Rydelkalot@17guagua.com', name: 'Rydel' },
		{ address: 'andris@tr.ee' },
	])
})

Deno.test('Parse encoded content-disposition', (t) => {
	const source = `Date: Wed, 29 Jan 2014 11:10:06 +0100
From: test@example.com
To: recipient@example.com
Content-Disposition: =?utf-8?Q?inline?=
Subject: test

test`

	const eml = new Eml(source)

	assertEquals(eml.body.plain, 'test')

	const node = Eml.parseToNodes(source)
	assertEquals(node.meta.disposition, 'inline')
})
