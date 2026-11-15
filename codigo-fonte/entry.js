import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, sendEmailVerification, reload, signInAnonymously,
  GoogleAuthProvider, signInWithPopup, signOut, deleteUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, orderBy, limit, getDocs,
  where, getCount, serverTimestamp, writeBatch } from 'firebase/firestore/lite';
window.FB = { initializeApp, getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, sendEmailVerification, reload, signInAnonymously,
  GoogleAuthProvider, signInWithPopup, signOut, deleteUser,
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, orderBy, limit, getDocs, where, getCount,
  serverTimestamp, writeBatch };
