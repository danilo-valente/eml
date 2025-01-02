import { assertEquals } from '@std/assert'
import { htmlToPlainText, plainTextToHtml } from './html.ts'

Deno.test(htmlToPlainText.name, () => {
	assertEquals(
		htmlToPlainText(`
            <h1>heading</h1>

            <p>hello world</p>

            <p>
                para
                <br>
                with
                <span>
                    break
                </span>
            </p>
        `),
		'heading\n\nhello world\n\npara\nwith break',
	)

	assertEquals(
		htmlToPlainText(`<h1>heading</h1><p>hello world</p><p>para<br>with <span>break</span></p>`),
		'heading\n\nhello world\n\npara\nwith break',
	)

	assertEquals(
		htmlToPlainText(`<h1>hello &gt;&lt;&quot;&#39;&apos;&nbsp;</h1>`),
		`hello ><"''\xa0`,
	)
})

Deno.test(plainTextToHtml.name, () => {
	assertEquals(
		plainTextToHtml(`hello ><"''\xa0\r\nworld`),
		`<p>hello &gt;&lt;&quot;&#39;&#39;\xa0<br>\nworld</p>`,
	)

	assertEquals(
		plainTextToHtml(`hello ><"''\xa0\r\n\r\nworld`),
		`<p>hello &gt;&lt;&quot;&#39;&#39;\xa0</p>\n\n<p>world</p>`,
	)
})
