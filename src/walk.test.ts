import { assertEquals } from '@std/assert'
import { join } from '@std/path'
import { getNodes } from './walk.ts'
import { fixtures, FIXTURES_DIR } from './_fixtures.ts'
import { getNodesIncrementally } from './_testUtils.ts'

Deno.test(getNodes.name, async (t) => {
	for (const fixture of fixtures) {
		await t.step(fixture.fileName, async () => {
			const file = await Deno.readTextFile(join(FIXTURES_DIR, fixture.fileName))
			assertEquals(getNodes(file), fixture.expected)
		})
	}
})

Deno.test(getNodesIncrementally.name, async (t) => {
	for (const fixture of fixtures) {
		await t.step(fixture.fileName, async () => {
			const file = await Deno.readTextFile(join(FIXTURES_DIR, fixture.fileName))
			assertEquals(getNodesIncrementally(file), fixture.expected)
		})
	}
})
