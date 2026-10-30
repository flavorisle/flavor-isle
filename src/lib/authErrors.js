// Login failures where no account exists for the email. Those get a
// "create a new account" hint instead of a plain credential error, so a
// first-time visitor isn't stuck retyping a password that never existed.
const NOT_FOUND = /not found|no account|doesn'?t exist|not registered|no user/i;

export function isAccountNotFoundError(err) {
  if (!err) return false;
  if (err.status === 404 || err.response?.status === 404) return true;
  const message = err.message || err.response?.data?.message || "";
  return NOT_FOUND.test(String(message));
}