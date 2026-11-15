import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signOut, deleteUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, query, orderBy, limit, getDocs,
  where, getCount, serverTimestamp } from 'firebase/firestore/lite';
window.FB = { initializeApp, getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signOut, deleteUser,
  getFirestore, doc, getDoc, setDoc, deleteDoc, collection, query, orderBy, limit, getDocs, where, getCount, serverTimestamp };
