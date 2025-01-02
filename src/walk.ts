import { escape as regexpEscape } from '@std/regexp'
import { unreachable } from '@std/assert/unreachable'
import { decodeQuotedPrintable } from './quotedPrintable.ts'

const STATUS = Symbol('status')
const PARENT = Symbol('parent')

type Headers = Partial<Record<Lowercase<string>, string>>
type Status = 'header' | 'body'

type MetaProps = {
	contentType?: string
	filename?: string
	encoding?: string
	charset?: string
	disposition?: string
}

type NodeProps = {
	[PARENT]?: CompoundNode | null
	[STATUS]?: Status
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

type State = {
	root: Node
	currentNode: Node
	buf: string
	isEof: boolean
}

function simpleNode(parent: CompoundNode | null): Node {
	return {
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
	const root = simpleNode(null)

	return { buf, root, currentNode: root, isEof: false }
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

	meta.contentType = headers['content-type']?.split(';')[0].toLowerCase()
	meta.charset = headers['content-type']?.match(/charset="?([^";]+)"?/i)?.[1].toLowerCase()

	meta.disposition = headers['content-disposition']?.split(';')[0].toLowerCase()
	meta.encoding = headers['content-transfer-encoding']?.trim()

	const filename = getProp(headers['content-disposition'], 'filename') ?? getProp(headers['content-type'], 'name')
	if (filename) meta.filename = decodeQuotedPrintable(filename)

	return {
		headers,
		meta,
		boundary,
	}
}

function lowerCase<T extends string>(str: T): Lowercase<T> {
	return str.toLowerCase() as Lowercase<T>
}

export function serializable(node: Node): Node {
	// strip all non-serializable (symbol) properties
	return JSON.parse(JSON.stringify(node))
}

export function getNodes(str: string) {
	const state = initialState()
	consume(str, state)
	state.isEof = true
	consume('', state)
	return serializable(state.root)
}

function getBoundaryKind(boundary: string) {
	if (boundary.startsWith('--')) {
		return boundary.endsWith('--') ? 'final' : 'medial'
	}

	return boundary === '' ? 'eof' : 'other'
}

function getProp(header: string | undefined, propKey: string): string | null {
	if (!header) return null
	const regex = new RegExp(String.raw`${propKey}(?:\*(?<idx>\d+))?="?(?<content>[^";]+)"?`, 'gi')
	const matches = [...header.matchAll(regex)]

	if (!matches.length) return null

	let filtered: typeof matches = []

	filtered = matches.filter((x) => !x.groups!.idx)

	if (filtered.length === 1) {
		return filtered[0].groups!.content
	}

	filtered = matches.filter((x) => x.groups!.idx)

	return filtered.map((x) => x.groups!.content).join('')
}

export function consume(chunk: string, state: State) {
	state.buf += chunk

	while (true) {
		const status = state.currentNode[STATUS]

		switch (status) {
			case 'header': {
				let source = /(?<=\S\s*)(\r?\n){2}/.source
				if (state.isEof) source = String.raw`(?:${source})|$`

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
						if (state.isEof) source = String.raw`(?:${source})|$`

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
								state.currentNode = parent![PARENT]! ?? parent!

								break
							}
							case 'medial': {
								// add sibling node after
								const node = simpleNode(parent!)
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
						if (state.isEof) source = String.raw`(?:${source})|$`
						else source += '(?!$)'

						const partResult = splitBy(state.buf, new RegExp(source, ''))
						if (partResult == null) return
						const [_before, match, after] = partResult

						switch (getBoundaryKind(match)) {
							case 'final': {
								// do nothing
								break
							}
							case 'medial': {
								// add child node
								const node = simpleNode(state.currentNode)
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
