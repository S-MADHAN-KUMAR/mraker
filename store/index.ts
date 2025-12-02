import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './themeSlice';
import prayerReducer from './prayerSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    prayers: prayerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


