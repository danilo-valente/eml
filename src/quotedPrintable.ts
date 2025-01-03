import { decodeBase64 } from '@std/encoding/base64'

type QuotedPrintableProps = {
	encoding: 'B' | 'Q'
	charset?: string
	content: string
	// leadingWhitespace?: string
}

export function decodeQuotedPrintableContent({ charset, encoding, content }: QuotedPrintableProps) {
	content = content.replaceAll(/=\r?\n/g, '')

	switch (encoding.toUpperCase() as 'B' | 'Q') {
		case 'B': {
			const decoder = new TextDecoder(charset)
			return decoder.decode(decodeBase64(content))
		}
		case 'Q': {
			const decoder = new TextDecoder(charset)
			return decoder.decode(Uint8Array.from(
				[...content.matchAll(/(?<hex>[=]\p{AHex}{2}(?:\r?\n)?)|./gsu)],
				(x) => {
					const [s] = x
					return x.groups!.hex ? parseInt(s.slice(1), 16) : s === '_' ? 0x20 : s.codePointAt(0)!
				},
			))
		}
	}
}

export function decodeQuotedPrintable<T extends string | null | undefined>(input: T): T {
	if (input == null) return input

	return input
		.replaceAll(/\r?\n/g, '')
		.replaceAll(/\?=\s+=\?/g, '?==?')
		.replaceAll(
			/=\?(?<charset>[a-z0-9\-]+)\?(?<encoding>[bq]+)\?(?<content>.+?)\?=/gi,
			(...args) => {
				const groups = args[args.findIndex((x) => typeof x === 'number') + 2]
				return decodeQuotedPrintableContent(groups)
			},
		) as T
}
