import { assert } from '@std/assert/assert'
import { getNodes } from './walk.ts'
import type { CompoundNode, Node, SimpleNode } from './walk.ts'
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

class Body {
	#plain: string | undefined
	#html: string | undefined

	get plain() {
		return this.#plain ??= htmlToPlainText(this.#html ?? '')
	}
	get html() {
		return this.#html ??= plainTextToHtml(this.#plain ?? '')
	}

	constructor({ plain, html }: { plain?: string; html?: string }) {
		this.#plain = plain
		this.#html = html
	}

	toJSON() {
		return {
			plain: this.plain,
			html: this.html,
		}
	}
}

const ISO = Symbol('iso')

/**
 * Minimal interface for forward-compatibility with `Temporal.ZonedDateTime`.
 * - Example string representation: `2014-01-29T11:10:06+01:00[+01:00]`
 * - To convert to a real `Temporal.ZonedDateTime`, use `Temporal.ZonedDateTime.from(zonedDateTime.toString())`
 * - To convert to a `Temporal.Instant` (without time zone/offset information), use
 *   `Temporal.Instant.fromEpochMilliseconds(zonedDateTime.epochMilliseconds)`
 * - To convert to a `Date` (without time zone/offset information), use `new Date(zonedDateTime.epochMilliseconds)`
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

	const offset = tz.replace(/\d{2}$/, ':$&')

	const isoSansTz = `${year}-${
		String(MONTH_NAMES.indexOf(month as typeof MONTH_NAMES[number]) + 1).padStart(2, '0')
	}-${day}T${hour}:${minute}:${second}${offset}`

	const date = new Date(isoSansTz)
	const pseudoTz = `[${offset}]`

	const iso = isoSansTz + pseudoTz

	return {
		// @ts-expect-error Better `console.log` inspectability
		[ISO]: iso,
		epochMilliseconds: date.valueOf(),
		toString: () => iso,
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

function walkAndFindMatchingNodes<T extends Node>(
	node: Node,
	predicate: (node: Node) => node is T,
	acc: Node[] = [],
): T[] {
	switch (node.kind) {
		case 'simple': {
			if (predicate(node)) acc.push(node)
			break
		}
		case 'compound': {
			if (predicate(node)) acc.push(node)
			for (const child of node.children) {
				walkAndFindMatchingNodes(child, predicate, acc)
			}
			break
		}
	}

	return acc as T[]
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
		const root = Eml.parseToNodes(source)

		this.from = nonEmptyWithAssertion(parseMailboxList(root.headers.from))
		this.replyTo = parseMailboxList(root.headers['reply-to'])

		this.to = nonEmptyWithAssertion(parseMailboxList(root.headers.to))
		this.cc = parseMailboxList(root.headers.cc)
		this.bcc = parseMailboxList(root.headers.bcc)

		this.subject = decodeQuotedPrintable(root.headers.subject ?? '')
		this.date = parseDateHeader(root.headers.date ?? '')

		let plain: string | undefined
		let html: string | undefined

		switch (root.kind) {
			case 'simple': {
				switch (root.meta.contentType) {
					case 'text/html': {
						html = root.body
						break
					}
					default: {
						// assume text/plain
						plain = root.body
						break
					}
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

				this.attachments = getAttachments(root)

				break
			}
			default:
				unreachable()
		}

		this.body = new Body({ plain, html })
	}

	static parseToNodes(source: string | Uint8Array) {
		let root = getNodes(typeof source === 'string' ? source : new TextDecoder().decode(source))

		// TODO (perf): parse header sans body first to check charset; only parse body once charset is known
		if (isNonUtf8Binary(root)) {
			if (typeof source === 'string') {
				throw new Error('Non-UTF8 charsets are not supported for string input')
			}

			root = getNodes(new TextDecoder(root.meta.charset).decode(source))
		}

		return root
	}
}

function isNonUtf8Binary({ meta: { charset, encoding } }: Node) {
	return charset != null && charset !== 'utf-8' && encoding !== 'quoted-printable' && encoding !== 'base64'
}

function parseMailboxList(str: string | undefined): Mailbox[] {
	if (!str) return []

	return str.split(',').map((x) => x.trim()).filter(Boolean)
		.map((x) => {
			x = decodeQuotedPrintable(x.trim())

			const m = x.match(/^"?(?<name>[^"]*)"?\s*<(?<address>.*)>$/)

			if (m) {
				const { name, address } = m.groups!
				return { name: name.trim(), address: address.trim() }
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
				charset,
				content: body.trimEnd(),
			})
		}
		default: {
			return body
		}
	}
}

function getAttachments(root: CompoundNode): Attachment[] {
	return walkAndFindMatchingNodes(
		root,
		(x): x is SimpleNode => x.kind === 'simple' && x.meta.disposition === 'attachment',
	)
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
