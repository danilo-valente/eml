import { encodeHex } from '@std/encoding/hex'
import { crypto } from '@std/crypto'
import { Eml } from '../eml.ts'
import { FixedChunkStream } from '@std/streams/unstable-fixed-chunk-stream'

export async function hash(bytes: Uint8Array) {
	return encodeHex(await crypto.subtle.digest('MD5', bytes))
}

export async function emlFromFilePath(path: string): Promise<Eml> {
	const streamChunkSize = Number(Deno.env.get('STREAM_CHUNK_SIZE')) | 0

	if (streamChunkSize > 0) {
		const { readable } = await Deno.open(path)
		return await Eml.read(readable.pipeThrough(new FixedChunkStream(streamChunkSize)))
	} else {
		return new Eml(await Deno.readFile(path))
	}
}

export function serializable<T>(x: T): T {
	return JSON.parse(JSON.stringify(x))
}
