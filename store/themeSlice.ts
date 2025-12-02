import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ColorScheme = 'light' | 'dark';

interface ThemeState {
  colorScheme: ColorScheme;
}

const initialState: ThemeState = {
  colorScheme: 'dark', // Default to dark
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setColorScheme: (state, action: PayloadAction<ColorScheme>) => {
      state.colorScheme = action.payload;
    },
    toggleTheme: (state) => {
      state.colorScheme = state.colorScheme === 'light' ? 'dark' : 'light';
    },
  },
});

export const { setColorScheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;

