/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db as fdb } from '../firebase';
import { ContractorAuth, ClientAuth } from '../services/authService';

export interface UserProfile {
  companyName?: string;
  ownerName?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  role?: 'Contractor' | 'Client';
  [key: string]: any;
}

export interface PermissionGuard {
  isContractor: boolean;
  isClient: boolean;
  hasFullAccess: boolean; // Full CRUD for Contractors
  canModifyProjects: boolean;
  canModifyStages: boolean;
  canModifyExpenses: boolean;
  canModifyProgress: boolean;
  canModifyDocuments: boolean;
  canSendMessages: boolean; // Both can send messages
  canApproveVariations: boolean; // Client can approve, Contractor can create/modify
}

interface AuthContextType {
  user: FirebaseUser | null;
  userRole: 'Contractor' | 'Client' | null;
  userProfile: UserProfile | null;
  isDemoMode: boolean;
  authLoading: boolean;
  selectedProjId: string;
  setSelectedProjId: (id: string) => void;
  permissionGuard: PermissionGuard;
  
  // Auth Functions
  loginAsContractor: () => Promise<void>;
  loginAsTestContractor: () => Promise<void>;
  loginAsClient: (clientCode: string) => Promise<string>; // returns projectId
  logout: () => Promise<void>;
  
  // Demo Mode
  startDemoMode: () => void;
  exitDemoMode: () => void;
  
  // Profile Update
  updateUserProfile: (profile: UserProfile) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<'Contractor' | 'Client' | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [selectedProjId, setSelectedProjId] = useState<string>('');

  // 1. Setup Auth state changed listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (!firebaseUser) {
        setUser(null);
        setUserRole(null);
        setUserProfile(null);
        setAuthLoading(false);
      } else {
        setUser(firebaseUser);
        
        // Fetch User Profile and Role from Firestore users collection
        const userRef = doc(fdb, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        let role: 'Contractor' | 'Client' = firebaseUser.isAnonymous ? 'Client' : 'Contractor';
        let profileData: UserProfile = {};

        if (userSnap.exists()) {
          const data = userSnap.data() as UserProfile;
          profileData = data;
          if (data.role) {
            role = data.role;
          }
        } else {
          // Setup default shell if missing
          profileData = {
            ownerName: firebaseUser.displayName || '',
            email: firebaseUser.email || '',
            role: role
          };
          await setDoc(userRef, { ...profileData, createdAt: new Date().toISOString() }, { merge: true });
        }

        setUserRole(role);
        setUserProfile(profileData);
        
        // If client, we can retrieve their project selection if stored
        if (role === 'Client') {
          const savedCode = localStorage.getItem('metrobuild_client_code');
          if (savedCode) {
            try {
              const lookupSnap = await getDoc(doc(fdb, 'clientCodes', savedCode.trim().toUpperCase()));
              if (lookupSnap.exists()) {
                setSelectedProjId(lookupSnap.data().projectId);
              }
            } catch (err) {
              console.warn("Error getting active client project id:", err);
            }
          }
        }
        
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Auth Functions
  const loginAsContractor = async () => {
    setIsDemoMode(false);
    setAuthLoading(true);
    try {
      await ContractorAuth.login();
    } catch (err) {
      setAuthLoading(false);
      throw err;
    }
  };

  const loginAsTestContractor = async () => {
    setIsDemoMode(false);
    setAuthLoading(true);
    try {
      const result = await signInAnonymously(auth);
      const anonUser = result.user;
      
      const userRef = doc(fdb, 'users', anonUser.uid);
      const profile = {
        ownerName: 'Iframe Sandbox Contractor',
        companyName: 'Iframe Sandbox Builders',
        mobile: '+91 99999 88888',
        email: 'sandbox-contractor@lifehut.co',
        role: 'Contractor' as const,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(userRef, profile, { merge: true });
      
      setUser(anonUser);
      setUserRole('Contractor');
      setUserProfile(profile);
      setAuthLoading(false);
    } catch (err) {
      setAuthLoading(false);
      throw err;
    }
  };

  const loginAsClient = async (clientCode: string): Promise<string> => {
    setIsDemoMode(false);
    setAuthLoading(true);
    try {
      const { user: anonUser, projectId } = await ClientAuth.login(clientCode);
      setUser(anonUser);
      setUserRole('Client');
      setSelectedProjId(projectId);
      localStorage.setItem('metrobuild_client_code', clientCode.trim().toUpperCase());
      setAuthLoading(false);
      return projectId;
    } catch (err) {
      setAuthLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    localStorage.removeItem('metrobuild_client_code');
    setIsDemoMode(false);
    setUser(null);
    setUserRole(null);
    setUserProfile(null);
    setSelectedProjId('');
    await signOut(auth);
  };

  // 3. Demo Mode Functions
  const startDemoMode = () => {
    setIsDemoMode(true);
    setUser(null);
    setUserRole('Contractor'); // Act as contractor in local sandbox demo
    setUserProfile({
      companyName: 'Lifehut Demo Build',
      ownerName: 'Jane Doe (Demo)',
      mobile: '+91 98765 43210',
      email: 'demo@lifehut.co',
      gstNumber: '22AAAAA0000A1Z5',
      address: '102 Blue Heights, Cyber City',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081'
    });
    setSelectedProjId('proj_green_villa');
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
    setUser(null);
    setUserRole(null);
    setUserProfile(null);
    setSelectedProjId('');
  };

  // 4. Update Profile
  const updateUserProfile = async (profile: UserProfile) => {
    if (isDemoMode) {
      setUserProfile(prev => prev ? { ...prev, ...profile } : profile);
      return;
    }
    if (!user) throw new Error("Must be logged in to update profile.");
    
    const userRef = doc(fdb, 'users', user.uid);
    const updatedProfile = {
      ...profile,
      role: userRole || 'Contractor',
      updatedAt: new Date().toISOString()
    };
    
    await setDoc(userRef, updatedProfile, { merge: true });
    setUserProfile(updatedProfile);
  };

  // 5. Build Permission Guard
  const permissionGuard: PermissionGuard = {
    isContractor: isDemoMode || userRole === 'Contractor',
    isClient: !isDemoMode && userRole === 'Client',
    hasFullAccess: isDemoMode || userRole === 'Contractor',
    canModifyProjects: isDemoMode || userRole === 'Contractor',
    canModifyStages: isDemoMode || userRole === 'Contractor',
    canModifyExpenses: isDemoMode || userRole === 'Contractor',
    canModifyProgress: isDemoMode || userRole === 'Contractor',
    canModifyDocuments: isDemoMode || userRole === 'Contractor',
    canSendMessages: true, // Both can chat
    canApproveVariations: true // Clients can approve variations, contractors can create/manage them
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        userProfile,
        isDemoMode,
        authLoading,
        selectedProjId,
        setSelectedProjId,
        permissionGuard,
        loginAsContractor,
        loginAsTestContractor,
        loginAsClient,
        logout,
        startDemoMode,
        exitDemoMode,
        updateUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
