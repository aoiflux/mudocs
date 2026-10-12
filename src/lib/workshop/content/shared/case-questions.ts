/**
 * Shared by the introduction and the capstone. From examples/workshop/CASE_QUILLDROP.md
 * (the questions) and examples/workshop/README.md (the beat titles) at the pinned release.
 */
/** The QUILLDROP brief's five questions and the beats that answer them. */
export const CASE_QUESTIONS = {
	questions: [
		{
			id: 'q1',
			text: 'What have we got?',
			detail: 'And what is wrong with it.',
			beats: [1]
		},
		{
			id: 'q2',
			text: 'How did it start?',
			detail: 'The mail, the download, the thing that ran.',
			beats: [2, 3, 4]
		},
		{
			id: 'q3',
			text: 'What happened, when?',
			detail: 'The day in order.',
			beats: [5]
		},
		{
			id: 'q4',
			text: 'What is a lie?',
			detail: 'The timestamps that cannot all be true.',
			beats: [6, 7]
		},
		{
			id: 'q5',
			text: 'Can you prove any of it tomorrow?',
			detail: 'The handover.',
			beats: [8, 9, 10]
		}
	],
	beats: [
		{ n: 1, title: 'the scene' },
		{ n: 2, title: 'the lure' },
		{ n: 3, title: 'the download' },
		{ n: 4, title: 'the binary' },
		{ n: 5, title: 'the day' },
		{ n: 6, title: 'the contradictions' },
		{ n: 7, title: 'the inventory' },
		{ n: 8, title: 'the rules' },
		{ n: 9, title: 'the verdict' },
		{ n: 10, title: 'the seal' }
	]
};
