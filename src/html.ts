import { escape, unescape } from '@std/html'

export function htmlToPlainText(html: string) {
	const bodyStart = html.indexOf('<body')
	if (bodyStart !== -1) {
		html = html.slice(bodyStart)
	}
	html = html.replaceAll(/<style[\s\w\W]+<\/style>/g, '')

	// we use `[ \t\r\n]` instead of `\s` to preserve non-breaking spaces
	return unescape(
		html
			.replaceAll(/[ \t\r\n]+/g, ' ')
			.replaceAll(/[ \t\r\n]*<br[^>]*>[ \t\r\n]*/gi, '\n')
			.replaceAll(/[ \t\r\n]*<\/?(?:p|div|h[1-6]|th|td)[^>]*>[ \t\r\n]*/gi, '\n\n')
			.replaceAll(/<[^>]*>/g, '')
			.replaceAll(/(\n *){3,}/g, '\n\n')
			.replaceAll(/ {2,}/g, ' ')
			.replaceAll(/^[ \t\r\n]+|[ \t\r\n]+$/g, ''),
	)
}

export function plainTextToHtml(text: string) {
	return `<p>${
		escape(text.trim())
			.replaceAll('\r', '')
			.replaceAll(/\n+/g, (m) => m.length > 1 ? '</p>\n\n<p>' : '<br>\n')
	}</p>`
}
