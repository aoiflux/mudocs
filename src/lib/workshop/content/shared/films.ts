/**
 * The cinematic stage of each DFRWS topic module: timestomping, malware in
 * ads and registry persistence. Each film opens its module's first tier,
 * after the hook, and runs from the user's action down to the structure it
 * changes.
 *
 * Case values follow the QUILLDROP playbook and the simulated outputs in
 * quilldrop-sim.ts, so a film and the walkthroughs after it show the same
 * file, the same hosts and the same times. Structure every Windows machine
 * shares is drawn by the film and cited below. None of the three is checked
 * against its sources yet, so none publishes (V-B6).
 */
import type { WorkshopModuleSpec } from '../../schema';
import { CASE, SIMULATED } from './quilldrop-sim.ts';

type Stage = WorkshopModuleSpec['tiers'][number]['stages'][number];

const { USER, IMPLANT, LURE_FILE, LURE_HOST } = CASE;

export const TIMESTOMP_FILM: Stage = {
	kind: 'cinematic',
	id: 'film',
	title: 'From the desktop to the record',
	film: 'Timestomp',
	values: {
		path: ['Users', USER, 'AppData', 'Roaming', IMPLANT, 'updater.exe'],
		si: {
			created: '2026-03-11T09:20:00Z',
			modified: '2026-03-11T09:20:00Z',
			accessed: '2026-03-11T09:20:00Z',
			changed: '2026-03-11T09:20:00Z'
		},
		fn: {
			created: '2026-03-11T09:20:00.4172931Z',
			modified: '2026-03-11T09:20:00.4172931Z',
			accessed: '2026-03-11T09:20:00.4172931Z',
			changed: '2026-03-11T09:20:00.4172931Z'
		},
		stomped: {
			created: '2025-11-04T10:12:00Z',
			modified: '2025-11-04T10:12:00Z',
			accessed: '2025-11-04T10:12:00Z',
			changed: '2026-03-11T09:20:00Z'
		},
		neighbours: [
			{ time: '2026-03-11T09:17:00Z', what: `${LURE_FILE} downloaded` },
			{ time: '2026-03-11T09:20:00Z', what: '$SI entry changed' },
			{ time: '2026-03-11T09:22:00Z', what: 'persistence.reg written' }
		],
		verdict: SIMULATED['stomp_two_clocks'][1].trim()
	},
	intro:
		'Ten shots, from a file in Explorer down to the bytes that hold its times, then the rewrite, and how it is caught. Press Play, or step through.',
	shots: [
		{
			shot: 'system',
			title: 'The machine',
			text: 'A Windows machine and the folder the implant was installed in. Explorer shows the times updater.exe was given when it was written: 09:20 on 11 March 2026.'
		},
		{
			shot: 'volume',
			title: 'The disk underneath',
			text: 'Pull back to the disk. Windows lays it out as GPT partitions: a small EFI system partition, the reserved MSR, the Windows volume C: formatted NTFS, and a recovery partition. Pull C: apart and NTFS shows its layers.'
		},
		{
			shot: 'mft',
			title: 'The Master File Table',
			text: 'Every file and folder on C: has a record in $MFT, normally 1 KiB each. The first records are NTFS’s own files: record 0 is $MFT itself, record 5 is the root folder.'
		},
		{
			shot: 'path',
			title: 'From the folder to the record',
			text: 'Explorer’s path is a walk through records. Each folder’s $I30 index lists the names inside it and their record numbers, from the root down to updater.exe.'
		},
		{
			shot: 'attributes',
			title: 'Inside the record',
			text: 'A record is a list of attributes. $STANDARD_INFORMATION (type 0x10) holds the four times tools show. $FILE_NAME (0x30) holds the name, the parent folder and four times of its own. $DATA (0x80) holds the contents.'
		},
		{
			shot: 'reach',
			title: 'The tool reaches in',
			text: 'An anti-forensics tool opens the file and calls SetFileTime with older times. The call goes through the NTFS driver to $STANDARD_INFORMATION, and only there.'
		},
		{
			shot: 'rewrite',
			title: 'The clock is rewritten',
			text: 'Created, modified and accessed now say 4 November 2025. Entry changed still says 11 March: the rewrite is itself a change to the record. $FILE_NAME is untouched.'
		},
		{
			shot: 'split',
			title: 'What each view sees',
			text: 'Explorer reads $STANDARD_INFORMATION, so the file now looks months old. The record still holds $FILE_NAME, written when the name was made, on the morning of the case.'
		},
		{
			shot: 'sources',
			title: 'Against the timeline',
			text: 'Line the times up. The created time sits alone, months before anything else. Everything around the file happened within minutes on 11 March: the lure downloaded at 09:17, the name made at 09:20, persistence written at 09:22.'
		},
		{
			shot: 'catch',
			title: 'The test',
			text: 'stomp_two_clocks.mut asks every record one question: was it created before its name was made? No file can be, unless its $STANDARD_INFORMATION was rewritten.'
		}
	],
	sources: [
		{ kind: 'mutant-file', ref: 'examples/workshop/stomp_two_clocks.mut', note: 'The test, line 18.' },
		{ kind: 'mutant-file', ref: 'examples/workshop/CASE_QUILLDROP.md', note: 'The case: the implant, the lure, the morning.' },
		{ kind: 'builtin-metadata', ref: 'mft_parse', note: 'si_* and fn_* times per record.' },
		{
			kind: 'external-spec',
			ref: 'https://learn.microsoft.com/en-us/windows/win32/fileio/master-file-table',
			note: 'The MFT: one record per file.'
		},
		{
			kind: 'external-spec',
			ref: 'https://learn.microsoft.com/en-us/windows/win32/devnotes/attribute-record-header',
			note: 'Attribute type codes: 0x10, 0x30, 0x80.'
		},
		{
			kind: 'external-spec',
			ref: 'https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-setfiletime',
			note: 'SetFileTime sets creation, last access and last write times.'
		},
		{
			kind: 'external-spec',
			ref: 'https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/configure-uefigpt-based-hard-drive-partitions',
			note: 'The partitions Windows sets up on a GPT disk.'
		},
		{
			kind: 'external-spec',
			ref: 'Brian Carrier, File System Forensic Analysis (2005), chapters 11-13',
			note: 'NTFS system records 0-11 and $I30 directory indexes.'
		}
	]
};

const hop = (time: string, url: string, redirect: boolean) => ({ time: `2026-03-11T${time}Z`, url, redirect });

export const MALVERTISING_FILM: Stage = {
	kind: 'cinematic',
	id: 'film',
	title: 'From one click to the browser’s records',
	film: 'Malvertising',
	values: {
		page: { url: 'https://search.example/?q=invoice+MRD-88412', query: 'invoice MRD-88412' },
		hops: [
			hop('09:15:31', 'https://search.example/?q=invoice+MRD-88412', false),
			hop('09:16:05', 'https://clk.ads.test/c?ad=50513&q=MRD-88412', false),
			hop('09:16:06', 'https://rtb.ads.test/r?ad=50513', true),
			hop('09:16:07', `https://${LURE_HOST}/inv/88412`, true),
			hop('09:16:40', `https://${LURE_HOST}/inv/88412/download`, false)
		],
		cookies: [
			{ site: 'corp.example', name: 'ap_session', visited: true },
			{ site: 'search.example', name: 'prefs', visited: true },
			{ site: 'tracker.test', name: 'px_id', visited: false },
			{ site: 'ads.test', name: 'uid', visited: true },
			{ site: 'ads.test', name: 'seg', visited: true },
			{ site: LURE_HOST, name: 'inv_sess', visited: true }
		],
		profile: `Users/${USER}/AppData/Local/Google/Chrome`,
		download: LURE_FILE
	},
	intro:
		'Ten shots, from an ad on a search page, through the servers that passed the browser along, to the rows Chrome wrote about it. Press Play, or step through.',
	shots: [
		{
			shot: 'browse',
			title: 'A search',
			text: 'The user searches for the invoice number from an email. The results page belongs to an ordinary search site.'
		},
		{
			shot: 'ad',
			title: 'The ad',
			text: 'Above the results sits a sponsored slot. The ad network decides what fills it; this ad names the invoice and shows a billing host.'
		},
		{
			shot: 'click',
			title: 'The click',
			text: 'One click. The browser sends a request, not to the billing host, but to the ad network’s click tracker, clk.ads.test.'
		},
		{
			shot: 'chain',
			title: 'The servers answer',
			text: 'The tracker answers with a redirect to rtb.ads.test. That server answers with another, to the landing page. The browser follows each one by itself.'
		},
		{
			shot: 'hops',
			title: 'Every hop is a visit',
			text: 'Chrome records each page load as a visit, linked to the visit that led to it. Hops a server sent carry the SERVER_REDIRECT bit. Both redirects took two seconds.'
		},
		{
			shot: 'cookies',
			title: 'Cookies along the way',
			text: 'Sites set cookies as the browser passes. The jar ends up holding identifiers from the ad network, and one from tracker.test, a site the history never visited.'
		},
		{
			shot: 'profile',
			title: 'Into the profile',
			text: 'Both records live in the user’s Chrome profile on disk, as SQLite databases: History and Cookies. This is the path the case evidence holds them at.'
		},
		{
			shot: 'vault',
			title: 'The databases',
			text: 'History keeps a visits table: when, which URL, from which visit, and how (the transition). Cookies keeps a cookies table: host, name, an encrypted value, and times in microseconds since 1601.'
		},
		{
			shot: 'ids',
			title: 'The rows',
			text: 'The chain is now rows. Each visit points back to the one before it, and the redirect bit marks the hops nobody clicked. The identifiers sit beside them in the cookie jar.'
		},
		{
			shot: 'map',
			title: 'The whole picture',
			text: 'Search page, ad network, landing page, download. The file in Downloads carries a Zone.Identifier stream naming the URL it came from; the chain explains how the browser got there.'
		}
	],
	sources: [
		{ kind: 'mutant-file', ref: 'examples/workshop/ad_redirects.mut', note: 'The walk back from the download.' },
		{ kind: 'mutant-file', ref: 'examples/workshop/ad_cookies.mut', note: 'Cookies against visited sites.' },
		{ kind: 'mutant-file', ref: 'examples/workshop/03_download.mut', note: 'The Zone.Identifier HostUrl.' },
		{ kind: 'mutant-file', ref: 'examples/workshop/CASE_QUILLDROP.md', note: 'The case: the lure and the hops.' },
		{ kind: 'builtin-metadata', ref: 'sqlite_query', note: 'Reads the visits table.' },
		{ kind: 'builtin-metadata', ref: 'browser_cookies', note: 'Cookie host and name.' },
		{
			kind: 'external-spec',
			ref: 'https://source.chromium.org/chromium/chromium/src/+/main:ui/base/page_transition_types.h',
			note: 'PAGE_TRANSITION_SERVER_REDIRECT is 0x80000000.'
		},
		{
			kind: 'external-spec',
			ref: 'https://source.chromium.org/chromium/chromium/src/+/main:components/history/core/browser/visit_database.cc',
			note: 'The visits table.'
		},
		{
			kind: 'external-spec',
			ref: 'https://source.chromium.org/chromium/chromium/src/+/main:net/extras/sqlite/sqlite_persistent_cookie_store.cc',
			note: 'The cookies table.'
		},
		{
			kind: 'external-spec',
			ref: 'https://chromium.googlesource.com/chromium/src/+/HEAD/docs/user_data_dir.md',
			note: 'Where a Chrome profile lives.'
		},
		{
			kind: 'external-spec',
			ref: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.4',
			note: '3xx redirection and the Location header.'
		}
	]
};

export const REGISTRY_FILM: Stage = {
	kind: 'cinematic',
	id: 'film',
	title: 'From power-on to the planted process',
	film: 'RegistryPersistence',
	values: {
		user: USER,
		hive: `C:\\Users\\${USER}\\NTUSER.DAT`,
		key: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
		written: '2026-03-11T09:22:00Z',
		values: [
			{ name: 'VendorAChat', data: '"C:\\Program Files\\Vendor A\\Chat\\chat.exe" --minimized', odd: false },
			{ name: 'VendorBSync', data: '"C:\\Program Files (x86)\\Vendor B\\Sync\\fsync.exe" /background', odd: false },
			{
				name: 'VendorCNotes',
				data: `C:\\Users\\${USER}\\AppData\\Local\\Programs\\Vendor C Notes\\notes.exe`,
				odd: true
			},
			{ name: IMPLANT, data: `C:\\Users\\${USER}\\AppData\\Roaming\\${IMPLANT}\\updater.exe`, odd: true }
		],
		planted: IMPLANT,
		runOnce: {
			written: '2026-03-10T17:02:11Z',
			name: 'VendorDCleanup',
			data: '"C:\\Program Files\\Vendor D\\cleanup.exe" /once'
		}
	},
	intro:
		'Ten shots, from power-on through the registry to the value the implant planted, a restart, and the process it buys. Press Play, or step through.',
	shots: [
		{
			shot: 'boot',
			title: 'Power on',
			text: 'Firmware starts the Boot Manager, which starts winload.exe, which loads the kernel. The session manager starts winlogon; at logon, userinit starts the user’s shell, explorer.exe.'
		},
		{
			shot: 'city',
			title: 'The registry on disk',
			text: 'The registry is not one file. Each hive is a file: SYSTEM, SOFTWARE, SAM and SECURITY in System32\\config for the machine, NTUSER.DAT and UsrClass.dat in each user’s profile.'
		},
		{
			shot: 'navigate',
			title: 'Down to Run',
			text: 'HKEY_CURRENT_USER is the logged-on user’s NTUSER.DAT. Under Software\\Microsoft\\Windows\\CurrentVersion sit two keys Windows reads at logon: Run and RunOnce.'
		},
		{
			shot: 'locations',
			title: 'Where persistence hides',
			text: 'The same pair exists under HKEY_LOCAL_MACHINE, in the SOFTWARE hive, for every user. Run starts its programs at every logon; RunOnce starts them once. Writing to HKCU needs no administrator rights.'
		},
		{
			shot: 'execute',
			title: 'The implant writes itself in',
			text: 'updater.exe, already running, adds one value to the user’s Run key: its own name and its own path. One API call.'
		},
		{
			shot: 'write',
			title: 'Into the hive',
			text: 'The value lands in the key, and the key’s last-write time moves to 09:22. The change reaches NTUSER.DAT on disk; the case timeline shows the hive modified in the same minute.'
		},
		{
			shot: 'reboot',
			title: 'Restart',
			text: 'The machine restarts. Nothing has to keep running for the persistence to survive: it is data in a file.'
		},
		{
			shot: 'read',
			title: 'Logon reads Run',
			text: 'At logon the shell reads Run and starts each value’s command line in turn. A RunOnce value is deleted before its command runs.'
		},
		{
			shot: 'spawn',
			title: 'The implant is back',
			text: 'Each value becomes a process under explorer.exe. updater.exe starts with the rest, at every logon, from a folder under AppData.'
		},
		{
			shot: 'artifacts',
			title: 'What remains',
			text: 'An investigator reads the hive offline: the value and its path, the key’s last-write time, the file itself. A path under AppData is a lead, not a verdict: another vendor’s notes app matches too.'
		}
	],
	sources: [
		{ kind: 'mutant-file', ref: 'examples/workshop/run_keys.mut', note: 'Run and RunOnce, odd paths flagged, line 7.' },
		{ kind: 'mutant-file', ref: 'examples/workshop/CASE_QUILLDROP.md', note: 'The case: the implant and its Run value.' },
		{ kind: 'builtin-metadata', ref: 'hive_key_info', note: 'A key’s last-write time.' },
		{
			kind: 'external-spec',
			ref: 'https://learn.microsoft.com/en-us/windows/win32/setupapi/run-and-runonce-registry-keys',
			note: 'Run and RunOnce: when they run, and RunOnce deleted first.'
		},
		{
			kind: 'external-spec',
			ref: 'https://learn.microsoft.com/en-us/windows/win32/sysinfo/registry-hives',
			note: 'Hive files and where they live.'
		},
		{
			kind: 'external-spec',
			ref: 'https://learn.microsoft.com/en-us/windows/win32/api/winreg/nf-winreg-regsetvalueexw',
			note: 'RegSetValueExW.'
		},
		{
			kind: 'external-spec',
			ref: 'https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/windows-boot-issues-troubleshooting',
			note: 'Boot phases: Boot Manager, OS loader, kernel.'
		}
	]
};
