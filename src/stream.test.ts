import { assertEquals } from '@std/assert'
import { join } from '@std/path'
import { fixtures, FIXTURES_DIR } from './_test/fixtures.ts'
import { serializable } from './_test/testUtils.ts'
import { getNodesFromReadable } from './stream.ts'

Deno.test(getNodesFromReadable.name, async (t) => {
	for (const fixture of fixtures) {
		if (fixture.fileName !== 'cc.eml') continue

		await t.step(fixture.fileName, async () => {
			const file = await Deno.open(join(FIXTURES_DIR, fixture.fileName))
			assertEquals(serializable(await getNodesFromReadable(file.readable)), fixture.expected)
		})
	}
})
