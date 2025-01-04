import { assertEquals } from '@std/assert'
import { join } from '@std/path'
import { getNodes } from './walk.ts'
import { fixtures, FIXTURES_DIR } from './_fixtures.ts'
import { serializable } from './_testUtils.ts'

Deno.test(getNodes.name, async (t) => {
	for (const fixture of fixtures) {
		await t.step(fixture.fileName, async () => {
			const file = await Deno.readFile(join(FIXTURES_DIR, fixture.fileName))
			assertEquals(serializable(getNodes(file)), fixture.expected)
		})
	}
})
