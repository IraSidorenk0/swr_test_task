import { configureStore } from '@reduxjs/toolkit';
import postsReducer from './slices/postsSlice';
import commentsReducer from './slices/commentsSlice';

export const store = configureStore({
  reducer: {
    posts: postsReducer,
    comments: commentsReducer,
  },
});

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];


