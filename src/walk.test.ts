import { assertEquals } from '@std/assert'
import { join } from '@std/path'
import { consume, getNodes, initialState, serializable } from './walk.ts'
import { fixtures, FIXTURES_DIR } from './_fixtures.ts'

Deno.test(getNodes.name, async (t) => {
	for (const fixture of fixtures) {
		await t.step(fixture.fileName, async () => {
			const file = await Deno.readTextFile(join(FIXTURES_DIR, fixture.fileName))
			assertEquals(getNodes(file), fixture.expected)
		})
	}
})

function getNodesIncrementally(str: string) {
	const state = initialState()
	for (const char of str) consume(char, state)
	state.isEof = true
	consume('', state)
	return serializable(state.root)
}

Deno.test(getNodesIncrementally.name, async (t) => {
	for (const fixture of fixtures) {
		await t.step(fixture.fileName, async () => {
			const file = await Deno.readTextFile(join(FIXTURES_DIR, fixture.fileName))
			assertEquals(getNodesIncrementally(file), fixture.expected)
		})
	}
})
