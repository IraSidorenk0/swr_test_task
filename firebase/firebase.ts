import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCYWOCECo-jpjhoxatvOKs1-aTKdUQtqKk",
  authDomain: "my-project-1516289182804.firebaseapp.com",
  databaseURL: "https://my-project-1516289182804-default-rtdb.firebaseio.com",
  projectId: "my-project-1516289182804",
  storageBucket: "my-project-1516289182804.firebasestorage.app",
  messagingSenderId: "325565181502",
  appId: "1:325565181502:web:57de84000c8ebbd5276b6f",
  measurementId: "G-H0644Q6XYW"
};

const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);