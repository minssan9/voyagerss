import {
    Auth,
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    User,
    onAuthStateChanged
  } from 'firebase/auth';
  import { app } from '@/firebase/config';
  
  export class GoogleAuthAPI {
    private auth: Auth;
    private provider: GoogleAuthProvider;
    constructor() {
      this.auth = getAuth(app);
      this.provider = new GoogleAuthProvider();
      // Add scopes if needed
      this.provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      this.provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    }
  
    // Get current user
    get currentUser(): User | null {
      return this.auth.currentUser;
    }
  
    // Sign in with Google
    async signIn(): Promise<User> {
      try {
        const result = await signInWithPopup(this.auth, this.provider);
        return result.user;
      } catch (error) {
        console.error('Google sign in error:', error);
        throw error;
      }
    }
  
    // Sign out
    async signOut(): Promise<void> {
      try {
        await signOut(this.auth);
      } catch (error) {
        console.error('Sign out error:', error);
        throw error;
      }
    }
  
    // Listen to auth state changes
    onAuthStateChange(callback: (user: User | null) => void): () => void {
      return onAuthStateChanged(this.auth, callback);
    }
  
    // Get ID token
    async getIdToken(): Promise<string | null> {
      try {
        const user = this.currentUser;
        if (!user) return null;
        return await user.getIdToken();
      } catch (error) {
        console.error('Get ID token error:', error);
        return null;
      }
    }
  }