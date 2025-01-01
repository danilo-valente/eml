import { decodeBase64 } from '@std/encoding/base64'

export function decodeQuotedPrintable(str: string) {
	return str.replaceAll(/=\?(?<charset>[a-z0-9\-]+)\?(?<encoding>[bq]+)\?(?<content>.+)\?=/gi, (...args) => {
		const groups = args[args.findIndex((x) => typeof x === 'number') + 2]
		const { charset, encoding, content } = groups

		switch (encoding.toLowerCase() as 'b' | 'q') {
			case 'b': {
				const decoder = new TextDecoder(charset)
				return decoder.decode(decodeBase64(content))
			}
			case 'q': {
				const decoder = new TextDecoder(charset)
				return decoder.decode(Uint8Array.from(
					[...content.matchAll(/=\p{AHex}{2}|./gu)].flat(),
					(s) => {
						if (s === '_') return 0x20
						if (s.startsWith('=')) return parseInt(s.slice(1), 16)
						return s.codePointAt(0)!
					},
				))
			}
		}
	})
}
