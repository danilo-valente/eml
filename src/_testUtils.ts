import { encodeHex } from '@std/encoding/hex'
import { crypto } from '@std/crypto'
import { Eml } from './eml.ts'
import { FixedChunkStream } from '@std/streams/unstable-fixed-chunk-stream'
import { PARSE_TO_NODES } from './_symbols.ts'

export async function hash(bytes: Uint8Array) {
	return encodeHex(await crypto.subtle.digest('MD5', bytes))
}

export async function emlFromFilePath(path: string): Promise<Eml> {
	const streamChunkSize = Number(Deno.env.get('STREAM_CHUNK_SIZE')) | 0

	if (streamChunkSize < 0) {
		const chunkSize = Math.abs(streamChunkSize)

		const { initialState, consume } = await import('./walk.ts')
		const { stub } = await import('@std/testing/mock')

		using _ = stub(Eml, PARSE_TO_NODES, function getNodesIncrementallyPerChar(bytes) {
			const state = initialState()

			const str = new TextDecoder().decode(bytes)
			const matcher = new RegExp(String.raw`.{${chunkSize}}|.+`, 'gsu')

			for (const chunk of str.match(matcher) ?? []) {
				consume(chunk, state)
			}

			consume('', state, { isEof: true })
			return serializable(state.root)
		})

		return new Eml(await Deno.readFile(path))
	} else if (streamChunkSize > 0) {
		const { readable } = await Deno.open(path)
		return await Eml.read(readable.pipeThrough(new FixedChunkStream(streamChunkSize)))
	} else {
		return new Eml(await Deno.readFile(path))
	}
}

export function serializable<T>(x: T): T {
	return JSON.parse(JSON.stringify(x))
}
