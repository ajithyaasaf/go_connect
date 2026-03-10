import { MMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';

export const storage = new MMKV();
// export const storage = {
//     set: (key: string, value: string | boolean | number) => console.log('Mock Set', key, value),
//     getString: (key: string) => undefined,
//     getBoolean: (key: string) => false,
//     getNumber: (key: string) => 0,
//     delete: (key: string) => console.log('Mock Delete', key),
//     clearAll: () => console.log('Mock Clear'),
// };

export const loadString = (key: string) => storage.getString(key);
export const saveString = (key: string, value: string) => storage.set(key, value);

/**
 * Zustand middleware compatible storage adapter
 */
// Synchronous MMKV storage adapter
export const zustandStorage: StateStorage = {
    setItem: (name, value) => {
        return storage.set(name, value);
    },
    getItem: (name) => {
        const value = storage.getString(name);
        return value ?? null;
    },
    removeItem: (name) => {
        return storage.delete(name);
    },
};
