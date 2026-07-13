/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  signInWithPopup, 
  signOut, 
  signInAnonymously, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion 
} from 'firebase/firestore';
import { auth, db as fdb, googleProvider } from '../firebase';
import { ContractorNotification } from './notifications/contractorNotification';
import { ClientNotification } from './notifications/clientNotification';

export interface AuthSession {
  user: FirebaseUser;
  role: 'Contractor' | 'Client';
  projectId?: string;
}

/**
 * Service for Contractor operations
 */
export const ContractorAuth = {
  /**
   * Contractors authenticate only with Google Sign-In
   */
  async login(): Promise<FirebaseUser> {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Set up or fetch contractor user profile in Firestore
    const userRef = doc(fdb, 'contractorUsers', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create an initial shell profile for first-time login
      await setDoc(userRef, {
        ownerName: user.displayName || '',
        email: user.email || '',
        createdAt: new Date().toISOString(),
        role: 'Contractor'
      }, { merge: true });
    } else {
      // Ensure role is marked as Contractor
      await setDoc(userRef, { role: 'Contractor' }, { merge: true });
    }
    
    await ContractorNotification.progressReminder();
    return user;
  },

  /**
   * Login with email and password for native capacitor / mobile compatibility
   */
  async loginWithEmail(email: string, password: string): Promise<FirebaseUser> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Set up or fetch contractor user profile in Firestore
    const userRef = doc(fdb, 'contractorUsers', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        ownerName: user.displayName || email.split('@')[0],
        email: user.email || email,
        createdAt: new Date().toISOString(),
        role: 'Contractor'
      }, { merge: true });
    } else {
      await setDoc(userRef, { role: 'Contractor' }, { merge: true });
    }

    return user;
  },

  /**
   * Register with email and password for native capacitor / mobile compatibility
   */
  async registerWithEmail(email: string, password: string, name: string): Promise<FirebaseUser> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    await updateProfile(user, { displayName: name });

    const userRef = doc(fdb, 'contractorUsers', user.uid);
    await setDoc(userRef, {
      ownerName: name,
      email: email,
      createdAt: new Date().toISOString(),
      role: 'Contractor'
    }, { merge: true });

    return user;
  },

  /**
   * Send password reset email for Contractor
   */
  async sendPasswordReset(email: string): Promise<void> {
    console.log("sendPasswordResetEmail function is:", sendPasswordResetEmail, typeof sendPasswordResetEmail);
    if (typeof sendPasswordResetEmail !== 'function') {
      throw new Error(`The Firebase 'sendPasswordResetEmail' function is not loaded correctly. Type: ${typeof sendPasswordResetEmail}`);
    }
    await sendPasswordResetEmail(auth, email);
  },

  async logout(): Promise<void> {
    await signOut(auth);
  }
};

/**
 * Service for Client operations
 */
export const ClientAuth = {
  /**
   * Clients authenticate only using anonymous Firebase auth combined with client code lookup
   */
  async login(clientCode: string): Promise<{ user: FirebaseUser; projectId: string }> {
    const codeKey = clientCode.trim().toUpperCase();
    if (!codeKey) {
      throw new Error("Client access code is required.");
    }

    // 1. Perform anonymous Firebase sign-in FIRST if not already signed in to establish session
    let currentUser = auth.currentUser;
    if (!currentUser) {
      const result = await signInAnonymously(auth);
      currentUser = result.user;
    }

    if (!currentUser) {
      throw new Error("Failed to authenticate with secure database anonymously.");
    }

    // 2. Now that we are signed in, verify client code exists in firestore 'clientCodes' collection
    const lookupRef = doc(fdb, 'clientCodes', codeKey);
    const lookupSnap = await getDoc(lookupRef);

    if (!lookupSnap.exists()) {
      throw new Error(`Invalid client code: "${clientCode}". Please verify and try again.`);
    }

    const codeData = lookupSnap.data();
    const projectId = codeData.projectId;

    // 3. Associate redemption status with current user's UID (either initial redemption or re-claimed session)
    // To support multi-device access, browser refreshes, and cache clears, we update the redeemedBy to the current user's UID.
    try {
      await updateDoc(lookupRef, {
        redeemed: true,
        redeemedBy: currentUser.uid
      });
    } catch (err) {
      console.warn("Failed to update client code redemption info in database:", err);
      // If codeData is already marked redeemed, we can still proceed with membership registration
    }

    // 5. Securely register client as project member in Firestore
    await updateDoc(doc(fdb, 'projects', projectId), {
      memberUids: arrayUnion(currentUser.uid)
    }).catch(err => {
      console.warn("Client already registered or error updating project memberUids:", err);
    });

    await setDoc(doc(fdb, `projects/${projectId}/members`, currentUser.uid), {
      role: 'Client',
      uid: currentUser.uid,
      joinedAt: new Date().toISOString()
    }).catch(err => {
      console.warn("Error setting member document:", err);
    });

    // Also update clientUsers metadata collection for role lookup
    await setDoc(doc(fdb, 'clientUsers', currentUser.uid), {
      role: 'Client',
      clientCode: codeKey,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    await ClientNotification.progressUploaded();

    return { user: currentUser, projectId };
  },

  /**
   * Sync/Auto-login existing anonymous client based on saved local clientCode
   */
  async autoLoginSaved(savedCode: string, currentUser: FirebaseUser): Promise<string> {
    const codeKey = savedCode.trim().toUpperCase();
    const lookupRef = doc(fdb, 'clientCodes', codeKey);
    const lookupSnap = await getDoc(lookupRef);

    if (!lookupSnap.exists()) {
      throw new Error("Saved client code no longer exists in database.");
    }

    const codeData = lookupSnap.data();
    const projectId = codeData.projectId;

    // Ensure redemption is associated
    if (!codeData.redeemed) {
      await updateDoc(lookupRef, {
        redeemed: true,
        redeemedBy: currentUser.uid
      });
    }

    // Sync member status
    await updateDoc(doc(fdb, 'projects', projectId), {
      memberUids: arrayUnion(currentUser.uid)
    }).catch(() => {});

    await setDoc(doc(fdb, `projects/${projectId}/members`, currentUser.uid), {
      role: 'Client',
      uid: currentUser.uid
    }, { merge: true }).catch(() => {});

    await setDoc(doc(fdb, 'clientUsers', currentUser.uid), {
      role: 'Client',
      clientCode: codeKey
    }, { merge: true });

    return projectId;
  },

  async logout(): Promise<void> {
    await signOut(auth);
  }
};
