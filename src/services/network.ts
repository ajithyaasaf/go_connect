import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { create } from 'zustand';

interface NetworkState {
    isConnected: boolean;
    isInternetReachable: boolean;
    type: string | null;
}

interface NetworkStore extends NetworkState {
    updateState: (state: NetInfoState) => void;
}

export const useNetworkStore = create<NetworkStore>((set) => ({
    isConnected: true,
    isInternetReachable: true,
    type: null,
    updateState: (state) =>
        set({
            isConnected: !!state.isConnected,
            isInternetReachable: !!state.isInternetReachable,
            type: state.type,
        }),
}));

export const NetworkMonitor = {
    initialize: () => {
        return NetInfo.addEventListener((state) => {
            useNetworkStore.getState().updateState(state);
        });
    },

    checkConnection: async (): Promise<boolean> => {
        const state = await NetInfo.fetch();
        return !!state.isConnected && !!state.isInternetReachable;
    }
};
