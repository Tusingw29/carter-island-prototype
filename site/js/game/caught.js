// "How you got caught": what set off the alarm, and how long after the "!" the grab came.
const CAUSES = {
  closeSight: (by) => `${by} saw you up close`,
  beam: (by) => `${by} saw you in his flashlight`,
  watchedHiding: (by) => `${by} watched you get into a hiding spot`,
  foundHiding: (by) => `${by} found you in a hiding spot he was searching`,
  wokeSleeper: () => 'the sleeping guard woke up with you still in the room',
  slam: (by) => `you threw ${by} to the floor`,
  letGo: (by) => `you let ${by} go`,
  brokeFree: (by) => `${by} broke free of your hold`,
  radioAhead: () => 'the guards were warned by radio that you were coming',
  shove: (by) => `you shoved ${by}`,
  body: (by) => `${by} found a knocked-out guard`,
  emptyBed: () => 'your bed was found empty at the bed check',
  sight: () => 'you were seen',
};

// What caused an alarm, in words. alarm is { kind, by }.
export function alarmCauseText(kind, by) {
  const who = by ? `the ${by}` : 'a guard';
  const text = (CAUSES[kind] ?? CAUSES.sight)(who);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// The line for the score screen, or null if the player was never grabbed.
export function caughtHowText(world) {
  const grab = world.lastGrab;
  if (!grab) return null;
  if (grab.sinceAlarm === null) return 'Grabbed.';
  return `Grabbed by the ${grab.by ?? 'guard'} ${grab.sinceAlarm.toFixed(1)} s after his "!". `
    + `${alarmCauseText(grab.alarmKind, grab.alarmBy)}.`;
}
