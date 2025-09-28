export interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[];
  likes: number;
  authorId: string;
  authorName: string;
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
}

export interface PostFormData {
  title: string;
  content: string;
  tags: string[];
  likes: number;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegistrationFormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
}