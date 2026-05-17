import { ConnectivityState } from './types';

type Listener = (state: ConnectivityState) => void;

class ConnectivityService {
  private listeners: Set<Listener> = new Set();
  private currentState: ConnectivityState = {
    isConnected: true,
    isInternetReachable: true,
  };

  constructor() {
    // In a real implementation with NetInfo:
    // NetInfo.addEventListener(state => this.updateState(state));
  }

  public subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public updateState(state: Partial<ConnectivityState>) {
    this.currentState = { ...this.currentState, ...state };
    this.listeners.forEach((listener) => listener(this.currentState));
  }

  public get isConnected() {
    return this.currentState.isConnected;
  }

  public get state() {
    return this.currentState;
  }
}

export const connectivity = new ConnectivityService();
