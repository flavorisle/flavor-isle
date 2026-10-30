import { base44 } from "@/api/base44Client";

// Saves the phone + date of birth collected at sign-up onto the customer's
// profile, so Star Rewards (keyed by phone) and the birthday automation work
// without a separate profile setup step. Called after the account is verified
// and the token is set — the profile's rules require the signed-in owner.
// Existing profiles (often created by an earlier checkout) are updated rather
// than duplicated.
export async function saveSignupProfile({ email, phone, birthday }) {
  const trimmedPhone = (phone || "").trim();
  if (!email || !trimmedPhone) return;

  const existing = await base44.entities.CustomerProfile.filter({ email });
  if (existing?.length) {
    await base44.entities.CustomerProfile.update(existing[0].id, {
      phone: trimmedPhone,
      ...(birthday ? { birthday } : {}),
    });
  } else {
    await base44.entities.CustomerProfile.create({
      name: email.split("@")[0],
      email,
      phone: trimmedPhone,
      ...(birthday ? { birthday } : {}),
    });
  }
}