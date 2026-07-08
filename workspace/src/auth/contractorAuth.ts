import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { auth } from "../firebase";

const provider = new GoogleAuthProvider();

provider.setCustomParameters({
  prompt: "select_account",
});

export async function contractorLogin() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function contractorLogout() {
  await signOut(auth);
}

export function getContractorUser() {
  return auth.currentUser;
}