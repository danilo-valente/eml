import { decodeQuotedPrintable } from './quotedPrintable.ts'

export type Mailbox = {
	name?: string
	address: string
}

export function parseMailboxList(str: string | undefined): Mailbox[] {
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
