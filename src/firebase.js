import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider,
         signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc,
         addDoc, collection, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyDF6tSJ30khQWg81qf_ztL5G1YywwSm9Io",
  authDomain:        "reelkit-3f7a2.firebaseapp.com",
  projectId:         "reelkit-3f7a2",
  storageBucket:     "reelkit-3f7a2.firebasestorage.app",
  messagingSenderId: "720154242106",
  appId:             "1:720154242106:web:fa537e9012d278a7da5903"
};

const app = initializeApp(firebaseConfig);
export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const fbProvider     = new FacebookAuthProvider();

export const saveUser = async (uid, data) => {
  try { await setDoc(doc(db,"users",uid),{...data,updatedAt:serverTimestamp()},{merge:true}); }
  catch(e){ console.error(e); }
};

export const addHistory = async (uid, entry) => {
  try { await addDoc(collection(db,"users",uid,"history"),{...entry,createdAt:serverTimestamp()}); }
  catch(e){ console.error(e); }
};

export const signInGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
};

export const signInFacebook = async () => {
  const result = await signInWithPopup(auth, fbProvider);
  return result.user;
};

export const logOut = () => signOut(auth);