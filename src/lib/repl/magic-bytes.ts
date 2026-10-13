/**
 * File signatures for the loading minigame: the first bytes of a file format,
 * which investigators check instead of trusting a file's extension.
 *
 * These are the formats' own published headers (each format's specification;
 * collected in Gary Kessler's File Signatures Table), not Mutant behaviour.
 * Several are the artefact types fsagen generates for the workshop datasets.
 */

export type Signature = {
	id: string;
	/** What the reader picks. Unique across the list. */
	label: string;
	/** The signature, from offset 0. */
	bytes: number[];
	/** Shown after an answer. */
	fact: string;
};

const ascii = (text: string) => Array.from(text, (ch) => ch.charCodeAt(0));

export const SIGNATURES: Signature[] = [
	{
		id: 'pe',
		label: 'Windows executable (PE)',
		bytes: ascii('MZ'),
		fact: '"MZ" opens every Windows executable and DLL: the initials of Mark Zbikowski, an MS-DOS developer.'
	},
	{
		id: 'zip',
		label: 'ZIP archive',
		bytes: [0x50, 0x4b, 0x03, 0x04],
		fact: '"PK" is for Phil Katz of PKZIP. A .docx, .xlsx or .jar is a ZIP archive too, so it starts the same way.'
	},
	{
		id: 'pdf',
		label: 'PDF document',
		bytes: ascii('%PDF-'),
		fact: '"%PDF-" is followed by the version number, such as 1.7.'
	},
	{
		id: 'png',
		label: 'PNG image',
		bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
		fact: 'The 0D 0A and 1A bytes are there to expose a transfer that rewrote line endings and damaged the file.'
	},
	{
		id: 'jpeg',
		label: 'JPEG image',
		bytes: [0xff, 0xd8, 0xff],
		fact: 'FF D8 is the Start Of Image marker; FF D9 ends the image.'
	},
	{
		id: 'gif',
		label: 'GIF image',
		bytes: ascii('GIF89a'),
		fact: '"GIF89a", or "GIF87a" for the older version of the format.'
	},
	{
		id: 'elf',
		label: 'ELF binary (Linux)',
		bytes: [0x7f, ...ascii('ELF')],
		fact: '7F then "ELF": the Executable and Linkable Format that Linux and most Unix systems run.'
	},
	{
		id: 'sqlite',
		label: 'SQLite database',
		bytes: [...ascii('SQLite format 3'), 0x00],
		fact: 'Chrome’s History file and Firefox’s places.sqlite are SQLite databases, so browser history starts like this.'
	},
	{
		id: 'regf',
		label: 'Windows registry hive',
		bytes: ascii('regf'),
		fact: 'NTUSER.DAT, SYSTEM and SOFTWARE all start with "regf". The Run keys that persistence abuses live inside them.'
	},
	{
		id: 'evtx',
		label: 'Windows event log (EVTX)',
		bytes: [...ascii('ElfFile'), 0x00],
		fact: 'An .evtx log opens with "ElfFile", then its records sit in 64 KiB chunks that start with "ElfChnk".'
	},
	{
		id: 'ole',
		label: 'OLE compound file (.doc, .xls, .msi)',
		bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
		fact: 'Legacy Office documents and .msi installers are OLE compound files. D0 CF 11 E0 is often read as "DOCFILE".'
	},
	{
		id: 'lnk',
		label: 'Windows shortcut (LNK)',
		bytes: [0x4c, 0x00, 0x00, 0x00, 0x01, 0x14, 0x02, 0x00],
		fact: 'A .lnk header begins with its own size, 0x4C (76 bytes), then the shell link class ID.'
	},
	{
		id: 'gzip',
		label: 'gzip archive',
		bytes: [0x1f, 0x8b, 0x08],
		fact: '1F 8B marks gzip; the 08 after it names deflate, the compression method gzip uses.'
	},
	{
		id: '7z',
		label: '7-Zip archive',
		bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c],
		fact: 'The first two bytes read "7z".'
	},
	{
		id: 'wasm',
		label: 'WebAssembly module',
		bytes: [0x00, ...ascii('asm')],
		fact: 'A zero byte, then "asm". The Mutant runtime this page is loading starts with these four bytes.'
	},
	{
		id: 'class',
		label: 'Java class file',
		bytes: [0xca, 0xfe, 0xba, 0xbe],
		fact: 'CAFEBABE. Mach-O universal binaries use the same four bytes, so tools read what follows to tell them apart.'
	}
];
