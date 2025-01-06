import { assert } from '@std/assert/assert'
import { type AnyNode, getBodyNodes, getNodes, walkAndFindMatchingNodes } from './walk.ts'
import { CompoundNode, Node, SimpleNode } from './walk.ts'
import { decodeQuotedPrintable, decodeQuotedPrintableContent } from './quotedPrintable.ts'
import { htmlToPlainText, plainTextToHtml } from './html.ts'
import { decodeBase64 } from '@std/encoding/base64'
import { parseDateHeader, type ZonedDateTime } from './date.ts'
import { type Mailbox, parseMailboxList } from './mailbox.ts'
import { getNodesFromReadable } from './stream.ts'

type Attachment = {
	filename: string
	contentType: string
	content: Uint8Array
}

class Body {
	#plain: string | undefined
	#html: string | undefined

	get plain(): string {
		return this.#plain ??= htmlToPlainText(this.#html ?? '')
	}
	get html(): string {
		return this.#html ??= plainTextToHtml(this.#plain ?? '')
	}

	constructor({ plain, html }: { plain?: string; html?: string }) {
		this.#plain = plain
		this.#html = html
	}

	toJSON(): { plain: string; html: string } {
		return {
			plain: this.plain,
			html: this.html,
		}
	}
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

	constructor(bytes: Uint8Array) {
		const input = bytes as Uint8Array | Node
		const root: Node = input instanceof Node ? input : getNodes(input)

		this.from = nonEmptyWithAssertion(parseMailboxList(root.headers.from))
		this.replyTo = parseMailboxList(root.headers['reply-to'])

		this.to = nonEmptyWithAssertion(parseMailboxList(root.headers.to))
		this.cc = parseMailboxList(root.headers.cc)
		this.bcc = parseMailboxList(root.headers.bcc)

		this.subject = decodeQuotedPrintable(root.headers.subject ?? '')
		this.date = parseDateHeader(root.headers.date ?? '')

		let plain: string | undefined
		let html: string | undefined

		if (root instanceof SimpleNode) {
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
		} else {
			assert(root instanceof CompoundNode)

			const nodes = getBodyNodes(root)

			if (nodes.html) {
				html = getNodeBodyText(nodes.html)
			}
			if (nodes.plain) {
				plain = getNodeBodyText(nodes.plain)
			}

			this.attachments = getAttachments(root)
		}

		this.body = new Body({ plain, html })
	}

	static async read(readable: ReadableStream<Uint8Array>): Promise<Eml> {
		// @ts-expect-error - passing Node to ctor is only supported internally
		return new Eml(await getNodesFromReadable(readable))
	}
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
		(x): x is SimpleNode => x instanceof SimpleNode && x.meta.disposition === 'attachment',
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
