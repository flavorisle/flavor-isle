// Exact-text matches keep admin changes live: anything new uses normal TTS.
const recordings = new Map([
  ["If you're paying by card, I can take your pickup or dine-in order. Tell me what you'd like; I'll check the menu and prices and read it back. Once you confirm, I'll text a secure payment link. Enter your card details on the link, not on this call; the crew starts cooking once you've paid. I can also answer menu, hours, and directions questions, check the wait, share our story, take a message for the crew, or connect you to someone at the counter. What do you need today?", 'https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/1ec50e343_smashie-young-male-1.mp3'],
  ["Heads up fam, we're slammed right now — expect up to an hour wait!", 'https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/53120ed71_smashie-young-male-2.mp3'],
  ["We're busy right now — expect about a 35 to 40 minute wait!", 'https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/e8b2e413a_smashie-young-male-3.mp3'],
  ["We're a little busy right now but we got you — about a 30 minute wait!", 'https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/420c1e911_smashie-young-male-4.mp3'],
  ["We're running smooth right now, no wait at all!", 'https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/269607739_smashie-young-male-5.mp3'],
]);
export function greetingAudio(text) {
  return recordings.get(text.trim());
}