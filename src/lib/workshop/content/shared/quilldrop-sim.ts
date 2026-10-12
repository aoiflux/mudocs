/**
 * Simulated output for the programs that read the QUILLDROP evidence corpus.
 * The corpus is generated on the attendee's machine, so Mutant records no
 * output for them; the walkthroughs show these lines instead, labelled as a
 * simulation.
 *
 * Each list follows its program's own print statements, and the data follows
 * the case playbook (examples/workshop/evidence/quilldrop.playbook.yaml):
 * times, file names, the lure, the redirect hops, the cookies and the Run keys.
 * Hosts and addresses use the playbook's reserved example names. Digests are
 * placeholders of the right shape, not hashes of anything.
 *
 * Paths a program prints from its own source follow the program at the pin:
 * USER, IMPLANT and LURE_FILE below. Re-pin: match them to the new programs.
 */

const USER = 'r.mehta';
const HOME = `/Users/${USER}`;
const IMPLANT = 'MeridianSync';
const LURE_FILE = 'Invoice_MRD-88412.pdf.exe';
const LURE_HOST = 'corp-billing.example';
const CHROME = `${HOME}/AppData/Local/Google/Chrome`;
const DOCS = `${HOME}/Documents`;

const business = (n: number, time: string) => [
	`  2026-03-11T${time}Z macb ${DOCS}/finance/close/wk${n}_ledger.csv`,
	`  2026-03-11T${time}Z macb ${DOCS}/hr/onboarding/emp_${n}.docx`
];

const staging = Array.from({ length: 12 }, (_, i) => `${HOME}/AppData/Local/Temp/staging/stg_${i + 1}.tmp`);
const CRC = [
	'053ee9c1',
	'673b0f6e',
	'179d2bcc',
	'b1bfe568',
	'71263798',
	'9a0e0650',
	'844e7464',
	'53ed7a9f',
	'17842f1d',
	'e0e97ed8',
	'cb20b27f',
	'54fee24f'
];

export const SIMULATED: Record<string, string[]> = {
	'01_scene': [
		'QUILLDROP 1/10  the scene',
		'  high entropy: bkp_20260311.zip 7.996',
		'  high entropy: q1_close.xlsx.enc 7.997',
		'  high entropy: q2_close.xlsx.enc 7.997',
		'  high entropy: q3_close.xlsx.enc 7.997',
		'98 objects under examples/workshop/case'
	],
	'02_lure': [
		'QUILLDROP 2/10  the lure',
		`  from accounts@${LURE_HOST}`,
		'  subject OVERDUE: Invoice MRD-88412 - final notice before referral',
		`  links [https://${LURE_HOST}/inv/88412]`,
		`  attached ${LURE_FILE}`
	],
	'03_download': [
		'QUILLDROP 3/10  the download',
		'  magic pe application/vnd.microsoft.portable-executable',
		'  visited https://corp.example/ap/queue',
		'  visited https://search.example/?q=invoice+MRD-88412',
		'  visited https://clk.ads.test/c?ad=50513&q=MRD-88412',
		'  visited https://rtb.ads.test/r?ad=50513',
		`  visited https://${LURE_HOST}/inv/88412`,
		`  visited https://${LURE_HOST}/inv/88412/download`,
		`  [HostUrl=https://${LURE_HOST}/inv/88412/download]`
	],
	'04_binary': [
		'QUILLDROP 4/10  the binary',
		'  PE32+ AMD64 3 sections',
		'  built 1970-01-01T00:00:00Z',
		'  imphash 245c260b549bfcc06a1ec7a62aa3994e 3 dlls'
	],
	'05_timeline': [
		'QUILLDROP 5/10  the day',
		`  2024-07-02T11:00:00Z m... ${HOME}/AppData/Local/Temp/bkp_20260311.zip`,
		`  2025-11-04T10:12:00Z ma.b ${HOME}/AppData/Roaming/${IMPLANT}/updater.exe`,
		...business(1, '09:00:00'),
		`  2026-03-11T09:00:00Z .a.b ${HOME}/NTUSER.DAT`,
		`  2026-03-11T09:02:00Z macb ${HOME}/Finance/q1_close.xlsx.enc`,
		`  2026-03-11T09:03:00Z macb ${HOME}/Finance/q2_close.xlsx.enc`,
		`  2026-03-11T09:04:00Z macb ${HOME}/Finance/q3_close.xlsx.enc`,
		`  2026-03-11T09:14:00Z macb ${HOME}/Inbox/invoice.eml`,
		`  2026-03-11T09:16:00Z macb ${CHROME}/Cookies`,
		`  2026-03-11T09:16:00Z macb ${CHROME}/History`,
		`  2026-03-11T09:17:00Z macb ${HOME}/Downloads/${LURE_FILE}`,
		`  2026-03-11T09:17:00Z macb ${HOME}/Downloads/${LURE_FILE}:Zone.Identifier`,
		`  2026-03-11T09:20:00Z ..c. ${HOME}/AppData/Roaming/${IMPLANT}/updater.exe`,
		`  2026-03-11T09:22:00Z macb ${HOME}/AppData/Roaming/persistence.reg`,
		...business(2, '09:22:00'),
		`  2026-03-11T09:22:00Z m.c. ${HOME}/NTUSER.DAT`,
		`  2026-03-11T09:25:00Z ...b /ProgramData/${IMPLANT}/sync.log`,
		...business(3, '09:44:00'),
		...business(4, '10:06:00'),
		...business(5, '10:28:00'),
		'137 moments from 131 rows'
	],
	'06_lies': [
		'QUILLDROP 6/10  the contradictions',
		`  older than its own birth: ${HOME}/AppData/Local/Temp/bkp_20260311.zip`,
		...staging.map((name) => `  in the timeline, not on disk: ${name}`)
	],
	'07_inventory': [
		'QUILLDROP 7/10  the inventory',
		...CRC.map((crc, i) => `  2026-03-12T00:00:${String(i * 2).padStart(2, '0')}Z ${crc} stg_${i + 1}.tmp`),
		'12 entries, 393216 bytes, never decompressed',
		'  released zip-1'
	],
	'08_rules': [
		'QUILLDROP 8/10  the rules',
		'  medium 4 Executable written to a user Downloads folder',
		'  high 4 Executable living in AppData Roaming',
		'  high 4 Archive staged in a temporary folder',
		'  critical 0 Persistence written under a Run key',
		'12 hits over 524 events',
		'  fields no event carried: [CommandLine]'
	],
	'09_verdict': [
		'QUILLDROP 9/10  the verdict',
		`  Users/${USER}/Inbox/invoice.eml 1c5f9ea0b1ae3610a6b3baba9c5b587ad7ce4bbea4102dfc5f52688702cb2aaf`,
		`  Users/${USER}/AppData/Roaming/${IMPLANT}/updater.exe 4d093fe53e54186ed24084a6c1689e3b71f5825d3238c8a1611b57c30268a1d2`,
		`  Users/${USER}/AppData/Local/Temp/bkp_20260311.zip 9dc6e1518e16d5e7ce1434b6ef6b95b64b7d51ddb1e078e17ed1de5b8972f6e3`,
		'  handover examples/workshop/handover 4 files',
		'  manifest 61c57040f4547efa51e749bba665358dce93ed8bbe2a1d424e25c6ae6ba83136'
	],
	'10_seal': [
		'QUILLDROP 10/10  the seal',
		'  case QUILLDROP by workshop',
		'  hash_matches true signature_valid true',
		'  report.md 574e12b0ba29d55abe1df1a29cc238382d2a1ae9f68f48a47cc08288721d105c',
		'  report.html b29533d1ce62d7c97b33975bbfb488c23bde23905e7fc4e684b841c65b1e53a9'
	],
	stomp_two_clocks: [
		'QUILLDROP  the two clocks',
		`  born before its name: Users/${USER}/AppData/Roaming/${IMPLANT}/updater.exe 2025-11-04T10:12:00Z 2026-03-11T09:20:00.4172931Z`,
		'187 records'
	],
	ad_redirects: [
		'QUILLDROP  the redirect chain',
		`  2026-03-11T09:16:40Z https://${LURE_HOST}/inv/88412/download redirect: false`,
		`  2026-03-11T09:16:07Z https://${LURE_HOST}/inv/88412 redirect: true`,
		'  2026-03-11T09:16:06Z https://rtb.ads.test/r?ad=50513 redirect: true',
		'  2026-03-11T09:16:05Z https://clk.ads.test/c?ad=50513&q=MRD-88412 redirect: false',
		'  2026-03-11T09:15:31Z https://search.example/?q=invoice+MRD-88412 redirect: false'
	],
	ad_cookies: [
		'QUILLDROP  the cookie jar',
		'  corp.example ap_session visited: true',
		'  search.example prefs visited: true',
		'  tracker.test px_id visited: false',
		'  ads.test uid visited: true',
		'  ads.test seg visited: true',
		`  ${LURE_HOST} inv_sess visited: true`
	],
	run_keys: [
		'QUILLDROP  the run keys',
		'  Run written 2026-03-11T09:22:00Z',
		'    VendorAChat "C:\\Program Files\\Vendor A\\Chat\\chat.exe" --minimized odd: false',
		'    VendorBSync "C:\\Program Files (x86)\\Vendor B\\Sync\\fsync.exe" /background odd: false',
		`    VendorCNotes C:\\Users\\${USER}\\AppData\\Local\\Programs\\Vendor C Notes\\notes.exe odd: true`,
		`    ${IMPLANT} C:\\Users\\${USER}\\AppData\\Roaming\\${IMPLANT}\\updater.exe odd: true`,
		'  RunOnce written 2026-03-10T17:02:11Z',
		'    VendorDCleanup "C:\\Program Files\\Vendor D\\cleanup.exe" /once odd: false'
	]
};
