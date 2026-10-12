/**
 * Choreography for the films. Each object lists its pose per shot: a CSS
 * transform, or a transform and an opacity. In a shot it has no pose for, it
 * fades out where it stands, pushed back into the scene.
 */
export type Pose = string | readonly [transform: string, opacity: number];
export type Poses = Readonly<Record<string, Pose>>;

const HIDDEN = 'opacity:0;transform:translate3d(0,0,-260px) scale(0.9)';

/** Inline style for an object in this shot. */
export function pose(poses: Poses, shot: string): string {
	const p = poses[shot];
	if (p === undefined) return HIDDEN;
	const [transform, opacity] = typeof p === 'string' ? [p, 1] : p;
	return `opacity:${opacity};transform:${transform}`;
}

/** True when the object is drawn in this shot; hidden objects take no pointer events. */
export const shown = (poses: Poses, shot: string) => poses[shot] !== undefined;

/** An ISO time as a reader scans it: date and minutes, or seconds when asked. */
export function clock(iso: string, seconds = false): string {
	const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2}(?:\.\d+)?)?/.exec(iso);
	if (!match) return iso;
	return `${match[1]} ${match[2]}${seconds && match[3] ? match[3] : ''}`;
}
