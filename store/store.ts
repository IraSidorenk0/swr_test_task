'use client';
import { configureStore } from '@reduxjs/toolkit';
import { postsReducer } from './slices/postsSlice';
import { commentsReducer } from './slices/commentsSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      posts: postsReducer,
      comments: commentsReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });
};

export const store = makeStore();

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;