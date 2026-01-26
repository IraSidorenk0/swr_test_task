
export interface PostBase {
  id: string;
  title: string;
  content: string;
  tags: string[];
  likes: number;
  authorId: string;
  authorName: string;
  likedBy?: string[];
}

export interface Post extends PostBase {
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SerializedPost extends PostBase {
  createdAt: string;
  updatedAt: string;
}

export interface PostFormData {
  id: string;
  title: string;
  content: string;
  tags: string[];
  likes: number;
  likedBy?: string[];
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface AppUserWithoutEmailVerified {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified?: boolean;  // Make it optional
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
  createdAt: Date | string;
  updatedAt: Date | string;
}