import { assertEquals, assertInstanceOf } from '@std/assert'
import { basename } from '@std/path'
import { concat } from '@std/bytes'
import { Eml as Eml } from './eml.ts'

const fixtures = {
	sample: './src/_fixtures/sample.eml',
	sample_sans_html: './src/_fixtures/sample_sans_html.eml',
	sample_sans_plain: './src/_fixtures/sample_sans_plain.eml',
	cc: './src/_fixtures/cc.eml',
	multipart: './src/_fixtures/multipart.eml',
	attachment_filenames: './src/_fixtures/attachment_filenames.eml',
}

Deno.test(Eml.name, async (t) => {
	await t.step(basename(fixtures.sample), async (t) => {
		const eml = new Eml(await Deno.readFile('./src/_fixtures/sample.eml'))

		await t.step('subject', () => {
			const actual = eml.subject
			assertEquals(actual, 'Winter promotions')
		})

		await t.step('date', () => {
			const actual = eml.date
			assertEquals(actual.toString(), '2014-01-29T11:10:06+01:00[+01:00]')
			assertEquals(actual.epochMilliseconds, new Date('2014-01-29T10:10:06.000Z').valueOf())
		})

		await t.step('from', () => {
			const [actual] = eml.from
			assertEquals(actual, {
				address: 'no-reply@example.com',
				name: 'Online Shop',
			})
		})

		await t.step('to', () => {
			const [actual] = eml.to
			assertEquals(actual, {
				address: 'foo.bar@example.com',
				name: 'Foo Bar',
			})
		})

		await t.step('cc', () => {
			const [actual] = eml.cc
			assertEquals(actual, undefined)
		})

		await t.step('bcc', () => {
			const [actual] = eml.bcc
			assertEquals(actual, undefined)
		})

		await t.step('replyTo', () => {
			const [actual] = eml.replyTo
			assertEquals(actual, undefined)
		})

		await t.step('messageText', () => {
			const actual = eml.body.plain
			assertEquals(
				actual,
				'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris enim orci, semper vel egestas nec, tempor sit amet nunc. Quisque pulvinar eleifend massa, sit amet posuere lorem vehicula et. Nam elementum nulla eget nisl ultrices vulputate. Sed molestie ipsum at neque molestie tempor vel et augue. Nam magna velit, cursus sed lectus eu, bibendum viverra orci. Morbi quis risus sed nunc pharetra mattis. Suspendisse ut consectetur risus. Donec in suscipit purus, eget aliquet dui. In vitae suscipit est. Suspendisse sollicitudin, nisl sed scelerisque pulvinar, nibh mi viverra diam, et convallis nibh urna id sem. Nunc eros ante, semper sed ex vitae, iaculis tristique sapien. Maecenas molestie leo a iaculis viverra. Vivamus tristique enim vel ligula semper tristique et congue ex. Praesent auctor egestas augue ut molestie. Integer vulputate tortor quis tempor faucibus.\r\nCurabitur sed accumsan od\nio. Integer vestibulum in sem nec vestibulum. Donec imperdiet turpis a faucibus volutpat. Suspendisse varius rhoncus eros, non rutrum justo pellentesque sit amet. In risus lectus, blandit sit amet magna a, porttitor pulvinar justo. Curabitur tincidunt metus at luctus fermentum. Cras vehicula dui eget semper vulputate. Ut sed leo non arcu imperdiet ultrices et eu dolor. Vestibulum aliquet sed elit a gravida. Aenean vitae est nec tellus molestie fringilla in eget enim. Morbi sodales auctor erat, eget posuere nisl condimentum aliquet. Phasellus commodo metus aliquet vestibulum ultricies. Quisque eleifend in mi vitae imperdiet. Quisque sit amet luctus nisl, vel sagittis mi. Etiam tellus tortor, blandit ut eros quis, iaculis eros.\r\n',
			)
		})

		await t.step('messageHtml', () => {
			const actual = eml.body.html
			assertEquals(
				actual,
				'<!DOCTYPE html>\n<html lang="en">\n<head>\n<title>Lorem ipsum</title>\n\t<meta name="description" content="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris enim orci, semper vel egestas nec, tempor sit amet nunc. Quisque pulvinar eleifend massa, sit amet posuere lorem vehicula et." />\n\t<meta name="viewport" content="width=device-width; initial-scale=1.0">\n\t<meta http-equiv="content-type" content="text/html; charset=utf-8" />\n</head>\n<body>\n\t<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris enim orci, semper vel egestas nec, tempor sit amet nunc. Quisque pulvinar eleifend massa, sit amet posuere lorem vehicula et. Nam elementum nulla eget nisl ultrices vulputate. Sed molestie ipsum at neque molestie tempor vel et augue. Nam magna velit, cursus sed lectus eu, bibendum viverra orci. Morbi quis risus sed nunc pharetra mattis. Suspendisse ut consectetur risus. Donec in suscipit purus, eget aliquet dui. In vitae suscipit est. Suspendisse sollicitudin, nisl sed scelerisque pulvinar, nibh mi viverra diam, et convallis nibh urna id sem. Nunc eros ante, semper sed ex vitae, iaculis tristique sapien. Maecenas molestie leo a iaculis viverra. Vivamus tristique enim vel ligula semper tristique et congue ex. Praesent auctor egestas augue ut molestie. Integer vulputate tortor quis tempor faucibus.</p>\n\t<p>Curabitur sed accumsan odio. Integer vestibulum in sem nec vestibulum. Donec imperdiet turpis a faucibus volutpat. Suspendisse varius rhoncus eros, non rutrum justo pellentesque sit amet. In risus lectus, blandit sit amet magna a, porttitor pulvinar justo. Curabitur tincidunt metus at luctus fermentum. Cras vehicula dui eget semper vulputate. Ut sed leo non arcu imperdiet ultrices et eu dolor. Vestibulum aliquet sed elit a gravida. Aenean vitae est nec tellus molestie fringilla in eget enim. Morbi sodales auctor erat, eget posuere nisl condimentum aliquet. Phasellus commodo metus aliquet vestibulum ultricies. Quisque eleifend in mi vitae imperdiet. Quisque sit amet luctus nisl, vel sagittis mi. Etiam tellus tortor, blandit ut eros quis, hendrerit iaculis eros.</p>\n</body>\n</html>',
			)
		})
	})

	await t.step(basename(fixtures.sample_sans_html), async (t) => {
		const eml = new Eml(await Deno.readFile(fixtures.sample_sans_html))

		await t.step('messageText', () => {
			assertEquals(
				eml.body.html,
				'<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris enim orci, semper vel egestas nec, tempor sit amet nunc. Quisque pulvinar eleifend massa, sit amet posuere lorem vehicula et. Nam elementum nulla eget nisl ultrices vulputate. Sed molestie ipsum at neque molestie tempor vel et augue. Nam magna velit, cursus sed lectus eu, bibendum viverra orci. Morbi quis risus sed nunc pharetra mattis. Suspendisse ut consectetur risus. Donec in suscipit purus, eget aliquet dui. In vitae suscipit est. Suspendisse sollicitudin, nisl sed scelerisque pulvinar, nibh mi viverra diam, et convallis nibh urna id sem. Nunc eros ante, semper sed ex vitae, iaculis tristique sapien. Maecenas molestie leo a iaculis viverra. Vivamus tristique enim vel ligula semper tristique et congue ex. Praesent auctor egestas augue ut molestie. Integer vulputate tortor quis tempor faucibus.<br>\nCurabitur sed accumsan od<br>\nio. Integer vestibulum in sem nec vestibulum. Donec imperdiet turpis a faucibus volutpat. Suspendisse varius rhoncus eros, non rutrum justo pellentesque sit amet. In risus lectus, blandit sit amet magna a, porttitor pulvinar justo. Curabitur tincidunt metus at luctus fermentum. Cras vehicula dui eget semper vulputate. Ut sed leo non arcu imperdiet ultrices et eu dolor. Vestibulum aliquet sed elit a gravida. Aenean vitae est nec tellus molestie fringilla in eget enim. Morbi sodales auctor erat, eget posuere nisl condimentum aliquet. Phasellus commodo metus aliquet vestibulum ultricies. Quisque eleifend in mi vitae imperdiet. Quisque sit amet luctus nisl, vel sagittis mi. Etiam tellus tortor, blandit ut eros quis, iaculis eros.</p>',
			)
		})
	})

	await t.step(basename(fixtures.sample_sans_plain), async (t) => {
		const eml = new Eml(await Deno.readFile(fixtures.sample_sans_plain))

		await t.step('messageText', () => {
			assertEquals(
				eml.body.plain,
				'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris enim orci, semper vel egestas nec, tempor sit amet nunc. Quisque pulvinar eleifend massa, sit amet posuere lorem vehicula et. Nam elementum nulla eget nisl ultrices vulputate. Sed molestie ipsum at neque molestie tempor vel et augue. Nam magna velit, cursus sed lectus eu, bibendum viverra orci. Morbi quis risus sed nunc pharetra mattis. Suspendisse ut consectetur risus. Donec in suscipit purus, eget aliquet dui. In vitae suscipit est. Suspendisse sollicitudin, nisl sed scelerisque pulvinar, nibh mi viverra diam, et convallis nibh urna id sem. Nunc eros ante, semper sed ex vitae, iaculis tristique sapien. Maecenas molestie leo a iaculis viverra. Vivamus tristique enim vel ligula semper tristique et congue ex. Praesent auctor egestas augue ut molestie. Integer vulputate tortor quis tempor faucibus.\n\nCurabitur sed accumsan odio. Integer vestibulum in sem nec vestibulum. Donec imperdiet turpis a faucibus volutpat. Suspendisse varius rhoncus eros, non rutrum justo pellentesque sit amet. In risus lectus, blandit sit amet magna a, porttitor pulvinar justo. Curabitur tincidunt metus at luctus fermentum. Cras vehicula dui eget semper vulputate. Ut sed leo non arcu imperdiet ultrices et eu dolor. Vestibulum aliquet sed elit a gravida. Aenean vitae est nec tellus molestie fringilla in eget enim. Morbi sodales auctor erat, eget posuere nisl condimentum aliquet. Phasellus commodo metus aliquet vestibulum ultricies. Quisque eleifend in mi vitae imperdiet. Quisque sit amet luctus nisl, vel sagittis mi. Etiam tellus tortor, blandit ut eros quis, hendrerit iaculis eros.',
			)
		})
	})

	await t.step(basename(fixtures.cc), async (t) => {
		const eml = new Eml(await Deno.readFile(fixtures.cc))

		await t.step('to', () => {
			assertEquals(eml.to, [
				{
					name: 'Foo Bar',
					address: 'foo.bar@example.com',
				},
				{
					address: 'info@example.com',
				},
			])
		})

		await t.step('cc', () => {
			assertEquals(eml.cc, [{
				address: 'foo@example.com',
			}, {
				name: 'Bar',
				address: 'bar@example.com',
			}])
		})

		await t.step('from', () => {
			assertEquals(eml.from, [{
				name: 'Foo Bar',
				address: 'foo.bar@example.com',
			}])
		})
	})

	await t.step(basename(fixtures.multipart), async (t) => {
		const eml = new Eml(await Deno.readFile(fixtures.multipart))

		await t.step('attachments', async () => {
			const { attachments } = eml

			assertEquals(attachments.length, 1)
			assertEquals(attachments[0].filename, 'tired_boot.FJ010019.jpeg')
			assertEquals(attachments[0].contentType, 'image/jpeg')

			const content = attachments[0].content
			const expectedByteLength = 10442

			assertInstanceOf(content, Uint8Array)
			assertEquals(content.byteLength, expectedByteLength)

			const jpegMagicBytes = concat([
				new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]),
				new TextEncoder().encode('JFIF'),
				new Uint8Array([0x00, 0x01]),
			])

			assertEquals(content.slice(0, jpegMagicBytes.length), jpegMagicBytes)
			assertEquals(content, await Deno.readFile('./src/_fixtures/tired_boot.FJ010019.jpeg'))
		})
	})

	await t.step(basename(fixtures.attachment_filenames), async (t) => {
		const eml = new Eml(await Deno.readFile(fixtures.attachment_filenames))

		await t.step('attachments', () => {
			const { attachments } = eml

			const expectedFilenames = [
				'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz012345.txt',
				'文字'.repeat(100) + '.txt',
				'a.txt',
				'b.txt',
				'c.txt',
			]

			assertEquals(attachments.length, expectedFilenames.length)

			for (const [idx, filename] of expectedFilenames.entries()) {
				const attachment = attachments[idx]
				assertEquals(attachment.filename, filename)
				assertEquals(attachment.contentType, 'text/plain')
			}
		})
	})
})
