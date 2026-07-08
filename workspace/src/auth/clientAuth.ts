import {
  signInAnonymously,
  signOut,
} from "firebase/auth";

import { auth } from "../firebase";

export async function clientLogin() {
  // Reuse existing anonymous session if available
  if (auth.currentUser?.isAnonymous) {
    return auth.currentUser;
  }

  const result = await signInAnonymously(auth);
  return result.user;
}

export async function clientLogout() {
  if (auth.currentUser?.isAnonymous) {
    await signOut(auth);
  }
}

export function getClientUser() {
  return auth.currentUser?.isAnonymous ? auth.currentUser : null;
}