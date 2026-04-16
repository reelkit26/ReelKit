import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD_Bz6Rdr4XKCo1oBM3EtP7ltBAmPlHBEI",
  authDomain: "reelkit-af273.firebaseapp.com",
  projectId: "reelkit-af273",
  storageBucket: "reelkit-af273.firebasestorage.app",
  messagingSenderId: "38145499119",
  appId: "1:38145499119:web:11af60c265adbd3261a01a",
  measurementId: "G-Q55CBBF4XK"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const setupRecaptcha = (elementId) => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => { window.recaptchaVerifier = null; }
    });
  }
  return window.recaptchaVerifier;
};

export const sendOTP = async (phoneNumber) => {
  const verifier = setupRecaptcha('recaptcha-container');
  const confirmation = await signInWithPhoneNumber(auth, '+91' + phoneNumber, verifier);
  window.confirmationResult = confirmation;
  return confirmation;
};

export const verifyOTP = async (otp) => {
  if (!window.confirmationResult) throw new Error('No OTP sent');
  const result = await window.confirmationResult.confirm(otp);
  return result.user;
};