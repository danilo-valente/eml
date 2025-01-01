import { assertEquals } from '@std/assert'
import { join } from '@std/path'
import { parse, parseIncrementally } from './eml.ts'
import { fixtures, FIXTURES_DIR } from './fixtures.ts'

Deno.test(parse.name, async (t) => {
	for (const fixture of fixtures) {
		await t.step(fixture.fileName, async () => {
			const file = await Deno.readTextFile(join(FIXTURES_DIR, fixture.fileName))
			assertEquals(parse(file), fixture.expected)
		})
	}
})

Deno.test(parseIncrementally.name, async (t) => {
	for (const fixture of fixtures) {
		await t.step(fixture.fileName, async () => {
			const file = await Deno.readTextFile(join(FIXTURES_DIR, fixture.fileName))
			assertEquals(parseIncrementally(file), fixture.expected)
		})
	}
})
