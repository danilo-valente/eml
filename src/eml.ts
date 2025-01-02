import { assert } from '@std/assert/assert'
import { type CompoundNode, getNodes, type SimpleNode } from './walk.ts'
import { decodeQuotedPrintable, decodeQuotedPrintableContent } from './quotedPrintable.ts'
import { unreachable } from '@std/assert/unreachable'
import { htmlToPlainText, plainTextToHtml } from './html.ts'
import { decodeBase64 } from '@std/encoding/base64'

type Mailbox = {
	name?: string
	address: string
}

type Attachment = {
	filename: string
	contentType: string
	content: Uint8Array
}

type Body = {
	plain: string
	html: string
}

/**
 * Minimal `Temporal.ZonedDateTime`-compatible interface
 *
 * To convert to a real `Temporal.ZonedDateTime`, use `Temporal.ZonedDateTime.from(zonedDateTime.toString())`
 */
type ZonedDateTime = {
	toString(): string
	epochMilliseconds: number
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

function parseDateHeader(dateStr: string): ZonedDateTime {
	const re = new RegExp(
		String.raw`^(?:(?<dow>${DAY_NAMES.join('|')}),\s+)?(?<day>\d{1,2})\s+(?<month>${
			MONTH_NAMES.join('|')
		})\s+(?<year>\d{4})\s+(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})\s+(?<tz>[\-+]\d{4})$`,
		'i',
	)

	const m = dateStr.match(re)

	if (!m) unreachable()

	const { day, month, year, hour, minute, second, tz } = m.groups!

	const zone = tz.replace(/\d{2}$/, ':$&')

	const iso = `${year}-${
		String(MONTH_NAMES.indexOf(month as typeof MONTH_NAMES[number]) + 1).padStart(2, '0')
	}-${day}T${hour}:${minute}:${second}${zone}`

	const date = new Date(iso)

	return {
		epochMilliseconds: date.valueOf(),
		toString: () => iso + `[${zone}]`,
	}
}

function getBodyNodes(root: CompoundNode): {
	html: SimpleNode | null
	plain: SimpleNode | null
} {
	const alternativeNode = root.children.find((x) =>
		x.kind === 'compound' && x.meta.contentType === 'multipart/alternative'
	)

	if (alternativeNode != null) {
		assert(alternativeNode.kind === 'compound')
	}

	const simpleNodes = (alternativeNode ?? root).children.filter((x) => x.kind === 'simple')

	const html = simpleNodes.find((x) => x.kind === 'simple' && x.meta.contentType === 'text/html') ?? null
	const plain = simpleNodes.find((x) => x.kind === 'simple' && x.meta.contentType === 'text/plain') ?? null

	return { html, plain }
}

export class Eml {
	from: [Mailbox, ...Mailbox[]]
	replyTo: Mailbox[]

	to: [Mailbox, ...Mailbox[]]
	cc: Mailbox[]
	bcc: Mailbox[]

	subject: string
	body: Body

	date: ZonedDateTime

	attachments: Attachment[]

	constructor(source: string | Uint8Array) {
		if (typeof source !== 'string') {
			source = new TextDecoder().decode(source)
		}

		const root = getNodes(source)

		this.from = nonEmptyWithAssertion(parseMailboxList(root.headers.from))
		this.replyTo = parseMailboxList(root.headers['reply-to'])

		this.to = nonEmptyWithAssertion(parseMailboxList(root.headers.to))
		this.cc = parseMailboxList(root.headers.cc)
		this.bcc = parseMailboxList(root.headers.bcc)
		this.subject = root.headers.subject ?? ''
		this.date = parseDateHeader(root.headers.date ?? '')

		let plain: string
		let html: string

		switch (root.kind) {
			case 'simple': {
				switch (root.meta.contentType) {
					case 'text/plain': {
						plain = root.body ?? ''
						html = plainTextToHtml(plain)
						break
					}
					case 'text/html': {
						html = root.body ?? ''
						plain = htmlToPlainText(html)
						break
					}
					default:
						unreachable()
				}

				this.attachments = []
				break
			}
			case 'compound': {
				const nodes = getBodyNodes(root)

				if (nodes.html) {
					html = getNodeBodyText(nodes.html)
				}
				if (nodes.plain) {
					plain = getNodeBodyText(nodes.plain)
				}

				plain ??= htmlToPlainText(html! ?? '')
				html ??= plainTextToHtml(plain! ?? '')

				this.attachments = getAttachments(root)

				break
			}
			default:
				unreachable()
		}

		this.body = { plain, html }
	}
}

function parseMailboxList(str: string | undefined): Mailbox[] {
	if (!str) return []

	return str.split(',').map((x) => x.trim()).filter(Boolean)
		.map((x) => {
			const m = x.match(/^"?(?<name>[^"]*)"?\s*<(?<address>.*)>$/)

			if (m) {
				const { name, address } = m.groups!
				return { name: decodeQuotedPrintable(name.trim()), address: address.trim() }
			} else {
				return { address: x }
			}
		})
}

function nonEmptyWithAssertion<T>(arr: T[]): [T, ...T[]] {
	assert(arr.length)
	return arr as [T, ...T[]]
}

function getNodeBodyText(node: SimpleNode): string {
	const { meta: { encoding, charset }, body } = node

	switch (encoding) {
		case 'quoted-printable':
		case 'base64': {
			return decodeQuotedPrintableContent({
				encoding: encoding === 'base64' ? 'B' : 'Q',
				charset: charset,
				content: body.trimEnd(),
			})
		}
		default: {
			return body
		}
	}
}

function getAttachments(root: CompoundNode): Attachment[] {
	return root.children
		.filter((x) => x.kind === 'simple')
		.filter((x) => x.meta.disposition === 'attachment')
		.map((x) => {
			const { meta: { contentType, filename, encoding, charset }, body } = x

			switch (encoding) {
				case 'base64': {
					return {
						filename: filename ?? '',
						contentType: contentType ?? '',
						content: decodeBase64(body ?? ''),
					}
				}
				case 'quoted-printable': {
					return {
						filename: filename ?? '',
						contentType: contentType ?? '',
						content: new TextEncoder().encode(decodeQuotedPrintableContent({
							encoding: 'Q',
							charset,
							content: body ?? '',
						})),
					}
				}
				default: {
					return {
						filename: filename ?? '',
						contentType: contentType ?? '',
						content: new TextEncoder().encode(body ?? ''),
					}
				}
			}
		})
}
