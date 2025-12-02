import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PrayerReminder {
  id: string;
  prayer_name: string;
  time: string;
  enabled: boolean;
  ringtone_uri: string | null;
}

interface PrayerState {
  prayers: PrayerReminder[];
  loading: boolean;
  updating: string | null;
  globalRingtone: string | null;
}

const initialState: PrayerState = {
  prayers: [],
  loading: false,
  updating: null,
  globalRingtone: null,
};

const prayerSlice = createSlice({
  name: 'prayers',
  initialState,
  reducers: {
    setPrayers: (state, action: PayloadAction<PrayerReminder[]>) => {
      state.prayers = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setUpdating: (state, action: PayloadAction<string | null>) => {
      state.updating = action.payload;
    },
    setGlobalRingtone: (state, action: PayloadAction<string | null>) => {
      state.globalRingtone = action.payload;
    },
    updatePrayer: (state, action: PayloadAction<Partial<PrayerReminder> & { id: string }>) => {
      const index = state.prayers.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.prayers[index] = { ...state.prayers[index], ...action.payload };
      }
    },
    togglePrayerEnabled: (state, action: PayloadAction<string>) => {
      const index = state.prayers.findIndex((p) => p.id === action.payload);
      if (index !== -1) {
        state.prayers[index].enabled = !state.prayers[index].enabled;
      }
    },
  },
});

export const {
  setPrayers,
  setLoading,
  setUpdating,
  setGlobalRingtone,
  updatePrayer,
  togglePrayerEnabled,
} = prayerSlice.actions;
export default prayerSlice.reducer;

