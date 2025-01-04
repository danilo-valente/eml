import { concat } from '@std/bytes/concat'
import { consume, endOfDoubleNewLineIndex, initialState, State } from './walk.ts'
import { STATUS } from './_symbols.ts'

type Options = {
	flush?: boolean
}

function handleChunk(chunk: Uint8Array, state: State, { flush }: Options = {}) {
	switch (state.root[STATUS]) {
		case 'header': {
			const subChunk = chunk
			if (state.queuedChunks.length) {
				chunk = concat([...state.queuedChunks, subChunk])
			}

			const headerEndIdx = endOfDoubleNewLineIndex(chunk)

			if (headerEndIdx === -1) {
				if (flush) {
					consume(state.decoder.decode(chunk), state, { isEof: true })
					state.queuedChunks = []
				} else {
					state.queuedChunks.push(subChunk)
				}

				return
			}

			state.queuedChunks = []
			const headerStr = state.decoder.decode(chunk.subarray(0, headerEndIdx))

			consume(headerStr, state, { stopAfterHeader: true })
			state.decoder = new TextDecoder(state.root.meta.charset)
			consume(state.decoder.decode(chunk.subarray(headerEndIdx), { stream: true }), state)

			break
		}
		case 'body': {
			consume(state.decoder.decode(chunk, { stream: true }), state)
			break
		}
	}
}

export async function getNodesFromReadable(readable: ReadableStream<Uint8Array>) {
	const state = initialState()

	let stream: AsyncIterable<Uint8Array> = readable

	if (!stream[Symbol.asyncIterator]) {
		// minimal ponyfill for `ReadableStream.@@asyncIterator`, which is missing in Safari as of 2025-01-03
		stream = (async function* () {
			const reader = readable.getReader()
			while (true) {
				const chunk = await reader.read()
				if (chunk.done) {
					await reader.cancel()
					reader.releaseLock()
					return
				}
				yield chunk.value
			}
		})()
	}

	for await (const chunk of readable) {
		handleChunk(chunk, state)
	}

	if (state.queuedChunks.length) {
		handleChunk(new Uint8Array(), state, { flush: true })
	} else {
		consume(state.decoder.decode(), state, { isEof: true })
	}

	return state.root
}
