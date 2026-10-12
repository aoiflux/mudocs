// Helpers shared by the scripts that consume Mutant release assets.

import { createHash } from 'node:crypto';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';

export function sha256(buf) {
	return createHash('sha256').update(buf).digest('hex');
}

/**
 * Reads every entry of a zip archive. Supports the two methods release zips
 * use (stored, deflate); anything else is refused rather than guessed at.
 */
export function readZip(buf) {
	const EOCD = 0x06054b50;
	let eocd = -1;
	for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i -= 1) {
		if (buf.readUInt32LE(i) === EOCD) {
			eocd = i;
			break;
		}
	}
	if (eocd < 0) throw new Error('not a zip archive (no end-of-central-directory record)');

	const count = buf.readUInt16LE(eocd + 10);
	let at = buf.readUInt32LE(eocd + 16);
	const entries = new Map();

	for (let n = 0; n < count; n += 1) {
		if (buf.readUInt32LE(at) !== 0x02014b50) throw new Error('corrupt zip central directory');
		const method = buf.readUInt16LE(at + 10);
		const compSize = buf.readUInt32LE(at + 20);
		const size = buf.readUInt32LE(at + 24);
		const nameLen = buf.readUInt16LE(at + 28);
		const extraLen = buf.readUInt16LE(at + 30);
		const commentLen = buf.readUInt16LE(at + 32);
		const local = buf.readUInt32LE(at + 42);
		const name = buf.toString('utf8', at + 46, at + 46 + nameLen);
		at += 46 + nameLen + extraLen + commentLen;

		if (name.endsWith('/')) continue;
		if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error(`corrupt zip local header for ${name}`);
		const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
		const raw = buf.subarray(start, start + compSize);

		let data;
		if (method === 0) data = Buffer.from(raw);
		else if (method === 8) data = inflateRawSync(raw);
		else throw new Error(`${name}: unsupported zip compression method ${method}`);
		if (data.length !== size) throw new Error(`${name}: inflated to ${data.length} bytes, header says ${size}`);

		entries.set(name, data);
	}
	return entries;
}

/** The files the archive's own SHA256SUMS vouches for, keyed by base name. */
export function parseSums(text) {
	const sums = new Map();
	for (const line of text.split(/\r?\n/)) {
		const m = /^([0-9a-f]{64})\s+\*?(.+)$/.exec(line.trim());
		if (m) sums.set(path.posix.basename(m[2]), m[1]);
	}
	return sums;
}
