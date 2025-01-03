import { encodeHex } from '@std/encoding/hex'
import { crypto } from '@std/crypto'
import { consume, initialState, serializable } from './walk.ts'
import { Eml } from './eml.ts'
import { stub } from '@std/testing/mock'

export async function hash(bytes: Uint8Array) {
	return encodeHex(await crypto.subtle.digest('MD5', bytes))
}

export function stubByEnvVar() {
	const condition = Boolean(Deno.env.get('USE_INCREMENTAL_STUB'))

	if (!condition) return

	return stub(
		Eml,
		'parseToNodes',
		(source) => getNodesIncrementally(typeof source === 'string' ? source : new TextDecoder().decode(source)),
	)
}

export function getNodesIncrementally(str: string) {
	const state = initialState()
	for (const char of str) consume(char, state)
	state.isEof = true
	consume('', state)
	return serializable(state.root)
}
