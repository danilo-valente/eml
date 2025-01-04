import { escape as regexpEscape } from '@std/regexp'
import { unreachable } from '@std/assert/unreachable'
import { decodeQuotedPrintable } from './quotedPrintable.ts'
import { assert } from '@std/assert/assert'
import { IS_NODE, PARENT, STATUS } from './_symbols.ts'

export type Status = 'header' | 'body'

type Headers = Partial<Record<Lowercase<string>, string>>

type MetaProps = {
	contentType?: string
	filename?: string
	encoding?: string
	charset?: string
	disposition?: string
	fileNameIsRfc5987?: boolean
}

type NodeProps = {
	[PARENT]?: CompoundNode | null
	[STATUS]?: Status
	[IS_NODE]?: true
}

export type SimpleNode = {
	kind: 'simple'
	headers: Headers
	meta: MetaProps
	body: string
} & NodeProps

export type CompoundNode = {
	kind: 'compound'
	headers: Headers
	meta: MetaProps
	boundary: string
	children: Node[]
} & NodeProps

function convertToCompound(node: Node, boundary: string): void {
	delete (node as { body?: string }).body

	const newProps: CompoundNode = {
		...node,
		kind: 'compound',
		boundary,
		children: [],
	}

	Object.assign(node, newProps)
}

export type Node = SimpleNode | CompoundNode

export type State = {
	root: Node
	currentNode: Node
	buf: string
	decoder: TextDecoder
	queuedChunks: Uint8Array[]
}

function createSimpleNode(parent: CompoundNode | null): Node {
	return {
		[IS_NODE]: true,
		kind: 'simple',
		headers: {},
		body: '',
		[PARENT]: parent,
		[STATUS]: 'header',
		meta: {},
	}
}

export function initialState(): State {
	const buf = ''
	const root = createSimpleNode(null)

	return { buf, root, currentNode: root, decoder: new TextDecoder(), queuedChunks: [] }
}

function splitBy(buf: string, boundary: RegExp): [before: string, boundary: string, after: string] | null {
	const { source, flags } = boundary instanceof RegExp
		? {
			source: boundary.source,
			flags: boundary.flags.replaceAll(/[gy]+/g, ''),
		}
		: {
			source: regexpEscape(boundary),
			flags: '',
		}

	const m = buf.match(new RegExp(source, flags))

	if (!m) return null

	const { index, 0: match } = m

	const before = buf.slice(0, index!)
	const b = buf.slice(index!, index! + match.length)
	const after = buf.slice(index! + match.length)

	return [before, b, after]
}

function parseHeaders(input: string): {
	headers: Partial<Record<Lowercase<string>, string>>
	meta: MetaProps
	boundary?: string
} {
	const re = /[\s\S]+?(?:\n(?!\s)|$)/g

	const h = [...input.matchAll(re)]
		.map((x) => ({
			line: x[0],
			index: x.index,
		})).map(({ line }) => {
			const colonIdx = line.indexOf(':')
			if (colonIdx === -1) return null

			const key = lowerCase(line.slice(0, colonIdx).trim())
			const value = line.slice(colonIdx + 1).trim()

			return { key, value }
		}).filter((x) => x != null)

	const headers: Partial<Record<Lowercase<string>, string>> = Object.fromEntries(h.map((x) => [x.key, x.value]))

	const boundary = headers['content-type']?.match(/boundary="?([^";]+)"?/i)?.[1]
	const meta: MetaProps = {}

	meta.contentType = decodeQuotedPrintable(headers['content-type']?.split(';')[0])?.toLowerCase()
	meta.charset = decodeQuotedPrintable(headers['content-type']?.match(/charset="?([^";]+)"?/i)?.[1])?.toLowerCase()
	if (meta.charset === 'utf8') meta.charset = 'utf-8'

	meta.disposition = decodeQuotedPrintable(headers['content-disposition']?.split(';')[0])?.toLowerCase()
	meta.encoding = decodeQuotedPrintable(headers['content-transfer-encoding']?.split(';')[0])?.trim()

	meta.filename = getProp(headers['content-disposition'], 'filename') ?? getProp(headers['content-type'], 'name')

	return {
		headers,
		meta,
		boundary,
	}
}

function lowerCase<T extends string>(str: T): Lowercase<T> {
	return str.toLowerCase() as Lowercase<T>
}

export function endOfDoubleNewLineIndex(bytes: Uint8Array): number {
	const CR = 0x0D
	const LF = 0x0A

	let isCrlf = false
	let count = 0

	for (let i = 0; i < bytes.length; ++i) {
		const byte = bytes[i]!
		if (byte === LF) ++count
		else if (byte === CR) isCrlf = true
		else count = 0

		if (count === 2) {
			const idx = i + (isCrlf ? 2 : 1)
			if (idx <= bytes.length) return idx
		}
	}

	return -1
}

export function getNodes(source: Uint8Array) {
	const state = initialState()

	const headerEndIdx = endOfDoubleNewLineIndex(source)

	if (headerEndIdx === -1) {
		// only header, no body
		consume(state.decoder.decode(source), state, { isEof: true })
		return state.root
	}

	const headerStr = state.decoder.decode(source.subarray(0, headerEndIdx))

	consume(headerStr, state, { stopAfterHeader: true })

	state.decoder = new TextDecoder(state.root.meta.charset)

	const bodyStr = state.decoder.decode(source.subarray(headerEndIdx))

	consume(bodyStr, state)
	consume('', state, { isEof: true })
	return state.root
}

function getBoundaryKind(boundary: string) {
	if (boundary.startsWith('--')) {
		return boundary.endsWith('--') ? 'final' : 'medial'
	}

	return boundary === '' ? 'eof' : 'other'
}

type PropGroups = {
	idx?: string
	star: string
	content: string
}

function decodeRfc5987(str: string) {
	const [encoding, content] = str.split(/'[a-z\-]*'/i)

	if (!content) return str

	const bytes = Uint8Array.from(
		content.match(/%\p{AHex}{2}|./gsu) ?? [],
		(x) => x.startsWith('%') ? parseInt(x.slice(1), 16) : x.codePointAt(0)!,
	)

	return new TextDecoder(encoding).decode(bytes)
}

function getPropPart({ groups }: { groups: PropGroups }, i: number) {
	if (groups.idx != null && Number(groups.idx) !== i) throw new RangeError('Wrong index')

	return groups.content
}

function getProp(header: string | undefined, propKey: string): string | undefined {
	if (!header) return

	const regex = new RegExp(String.raw`${propKey}(?:\*(?<idx>\d+))?(?<star>\*)?="?(?<content>[^";]+)"?`, 'gi')
	const matches = [...header.matchAll(regex)]

	if (!matches.length) return

	let useRfc5987 = true

	let prev = matches
	let current = matches

	function filter(predicate: Parameters<typeof matches['filter']>[0]) {
		prev = current
		current = current.filter(predicate)
	}

	function revert() {
		current = prev
	}

	// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition#as_a_response_header_for_the_main_body
	// > When both filename and filename* are present in a single header field value, filename* is preferred over filename when both are understood
	filter((x) => x.groups!.star)
	if (!current.length) {
		revert()
		useRfc5987 = false
	}

	if (current.length !== 1) {
		filter((x) => !x.groups!.idx)
		if (current.length !== 1) {
			revert()
			filter((x) => x.groups!.idx)
			if (!current.length) return
		}
	}

	const filenameParts = current.map((x, i) => getPropPart({ groups: x.groups as PropGroups }, i))

	if (useRfc5987) {
		return filenameParts.map(decodeRfc5987).join('')
	}

	return decodeQuotedPrintable(filenameParts.join(''))
}

type Options = {
	isEof?: boolean
	stopAfterHeader?: boolean
}

export function consume(chunk: string, state: State, options: Options = {}) {
	state.buf += chunk

	while (true) {
		const status = state.currentNode[STATUS]

		switch (status) {
			case 'header': {
				let source = /(?<=\S\s*)(\r?\n){2}/.source
				if (options.stopAfterHeader || options.isEof) source = String.raw`(?:${source})|$`

				const headerResult = splitBy(state.buf, new RegExp(source, ''))
				if (headerResult == null) return
				const [before, _match, after] = headerResult

				const { headers, meta, boundary } = parseHeaders(before)

				state.currentNode.headers = headers

				if (boundary != null) {
					convertToCompound(state.currentNode, boundary)
				}

				state.currentNode[STATUS] = 'body'
				state.currentNode.meta = meta
				state.buf = after

				if (options.stopAfterHeader) return

				break
			}
			case 'body': {
				const parent = state.currentNode[PARENT] ?? null

				switch (state.currentNode.kind) {
					case 'simple': {
						let source = parent == null
							? String.raw`^\b$`
							// negative lookahead to `$` or `-$` to ensure partial final not misinterpreted as medial
							: `--${regexpEscape(parent.boundary)}(?!-?$)(?:--)?`
						if (options.isEof) source = String.raw`(?:${source})|$`

						const bodyResult = splitBy(state.buf, new RegExp(source, ''))
						if (bodyResult == null) return
						const [before, match, after] = bodyResult

						if (before === '') {
							return
						}

						state.currentNode.body = before
						state.buf = after

						switch (getBoundaryKind(match)) {
							case 'final': {
								// go up one level (if parent is root) or two levels otherwise
								if (parent![PARENT] != null) state.currentNode = parent![PARENT]
								else state.currentNode = parent!

								break
							}
							case 'medial': {
								// add sibling node after
								const node = createSimpleNode(parent!)
								parent!.children.push(node)
								state.currentNode = node

								break
							}
							case 'eof':
								return
							default:
								unreachable()
						}

						break
					}
					case 'compound': {
						// negative lookahead to `$` or `-$` to ensure partial final not misinterpreted as medial
						let source = `--${regexpEscape(state.currentNode.boundary)}(?!-?$)(?:--)?`
						if (options.isEof) source = String.raw`(?:${source})|$`

						const partResult = splitBy(state.buf, new RegExp(source, ''))
						if (partResult == null) return
						const [_before, match, after] = partResult

						switch (getBoundaryKind(match)) {
							case 'final': {
								// go up one level
								if (parent != null) state.currentNode = parent

								break
							}
							case 'medial': {
								// add child node
								const node = createSimpleNode(state.currentNode)
								state.currentNode.children.push(node)
								state.currentNode = node
								break
							}
							case 'eof':
								return
							default:
								unreachable()
						}

						state.buf = after

						break
					}
				}

				break
			}
		}
	}
}

export function getBodyNodes(root: CompoundNode): {
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

export function walkAndFindMatchingNodes<T extends Node>(
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
