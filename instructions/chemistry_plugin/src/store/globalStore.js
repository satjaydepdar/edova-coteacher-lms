import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useGlobalStore = create(
  persist(
    (set) => ({
      // Kept for persistence compatibility if needed later, but empty
    }),
    {
      name: 'edova-user-storage',
    }
  )
);

export default useGlobalStore;
