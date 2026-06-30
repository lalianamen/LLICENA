const SUPA_URL = "https://vewhmndummfhnbxnrqya.supabase.co";
const SUPA_KEY = "sb_publishable_Ljv0fNsQC0qHMzgWE42ccA_hHgGbVzy";
// Implicit flow: confirm-email and password-reset links carry the session token
// in the URL itself, so they work when the link is opened in a different browser
// than the one used to sign up — e.g. tapping the link from a phone's separate
// mail app (its in-app browser). PKCE would need that original browser's
// code_verifier and fails in this cross-context case.
const supa = supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { flowType: "implicit" } });
