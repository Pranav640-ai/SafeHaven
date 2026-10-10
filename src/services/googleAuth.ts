import { Capacitor, registerPlugin } from '@capacitor/core';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const native = registerPlugin<{signIn():Promise<{idToken:string}>;clearSession():Promise<void>}>('MeridianAuth');
export async function signInWithGoogle() {
  if (Capacitor.getPlatform() === 'android') {
    const {idToken} = await native.signIn();
    return signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
  }
  return signInWithPopup(auth, googleProvider);
}
export async function signOutGoogle() {
  await signOut(auth);
  if (Capacitor.getPlatform() === 'android') await native.clearSession().catch(()=>{});
}
