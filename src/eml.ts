import { escape as regexpEscape } from '@std/regexp'
import { unreachable } from '@std/assert/unreachable'
import { decodeQuotedPrintable } from './quotedPrintable.ts'

const STATUS = Symbol('status')
const PARENT = Symbol('parent')

type Headers = Record<Lowercase<string>, string>
type Status = 'header' | 'body'

type NodeProps = {
	[PARENT]?: CompoundNode | null
	[STATUS]?: Status
}

type SimpleNode = {
	kind: 'simple'
	headers: Headers
	body: string | null
} & NodeProps

type CompoundNode = {
	kind: 'compound'
	headers: Headers
	boundary: string
	children: Node[]
} & NodeProps

function convertToCompound(node: Node, boundary: string): void {
	delete (node as { body?: null }).body

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
		body: null,
		[PARENT]: parent,
		[STATUS]: 'header',
	}
}

function initialState(): State {
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

function parseHeaders(headers: string) {
	const n = null as string | null

	const props = {
		boundary: n,
		filename: n,
		encoding: n,
		contentType: n,
	}

	const re = /[\s\S]+?(?:\n(?!\s)|$)/g

	const h = [...headers.matchAll(re)]
		.map((x) => ({
			line: x[0],
			index: x.index,
		})).map(({ line }) => {
			const colonIdx = line.indexOf(':')
			if (colonIdx === -1) return null

			const key = lowerCase(line.slice(0, colonIdx).trim())
			const value = decodeQuotedPrintable(line.slice(colonIdx + 1).trim().replaceAll(/[\r\n]/g, ''))

			switch (key) {
				case 'content-type': {
					// TODO
					// const [type, subtype] = value.split('/')
					props.boundary = value.match(/boundary="?([^"]+)"?/i)?.[1] ?? null
					break
				}
				case 'content-disposition': {
					props.filename = value.match(/filename="?([^"]+)"?/i)?.[1] ?? null

					// const [_, _, filename] = value.match(/filename="?([^"]+)"?/i) ?? []
					// if (filename) filename = filename.replaceAll(/[\r\n]/g, '')
					break
				}
				default: {
					break
				}
			}

			return { kind: 'header' as const, key, value }
		}).filter((x) => x != null)

	return {
		headers: h,
		...props,
	}
}

function lowerCase<T extends string>(str: T): Lowercase<T> {
	return str.toLowerCase() as Lowercase<T>
}

function serializable(node: Node): Node {
	// strip all non-serializable (symbol) properties
	return JSON.parse(JSON.stringify(node))
}

export function parse(str: string) {
	const state = initialState()
	consume(str, state)
	state.isEof = true
	consume('', state)
	return serializable(state.root)
}

export function parseIncrementally(str: string) {
	const state = initialState()
	for (const char of str) consume(char, state)
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

function consume(chunk: string, state: State) {
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

				const { headers, boundary } = parseHeaders(before)

				for (const header of headers) {
					state.currentNode.headers[header.key] = header.value
				}

				if (boundary != null) {
					convertToCompound(state.currentNode, boundary)
				}

				state.currentNode[STATUS] = 'body'
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

						if (before === '' && state.isEof) {
							return
						}

						state.currentNode.body ??= ''
						state.currentNode.body += before
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
