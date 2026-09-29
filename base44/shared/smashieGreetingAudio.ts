// Exact-text matches keep admin changes live: anything new uses normal TTS.
const recordings = new Map([
  ["If you're paying by card, I can take your pickup or dine-in order. Tell me what you'd like; I'll check the menu and prices and read it back. Once you confirm, I'll text a secure payment link. Enter your card details on the link, not on this call; the crew starts cooking once you've paid. I can also answer menu, hours, and directions questions, check the wait, share our story, take a message for the crew, or connect you to someone at the counter. What do you need today?", 'https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/5f85ba0b0_smashie-greeting.mp3'],
  ["Heads up fam, we're slammed right now — expect up to an hour wait!", 'https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/405087720_smashie-greeting.mp3'],
  ["We're busy right now — expect about a 35 to 40 minute wait!", 'https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/6ab35a1f0_smashie-greeting.mp3'],
  ["We're a little busy right now but we got you — about a 30 minute wait!", 'https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/ebaa5250e_smashie-greeting.mp3'],
  ["We're running smooth right now, no wait at all!", 'https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/df1da2fc4_smashie-greeting.mp3'],
]);
export function greetingAudio(text) {
  return recordings.get(text.trim());
}