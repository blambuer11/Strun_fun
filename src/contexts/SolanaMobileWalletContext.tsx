import { createContext, useContext, ReactNode } from "react";

interface SolanaMobileWalletContextType {
  connectWallet: () => Promise<string | null>;
  isCapacitor: boolean;
}

const SolanaMobileWalletContext = createContext<SolanaMobileWalletContextType | undefined>(undefined);

export const useSolanaMobileWallet = () => {
  const context = useContext(SolanaMobileWalletContext);
  if (!context) {
    throw new Error("useSolanaMobileWallet must be used within SolanaMobileWalletProvider");
  }
  return context;
};

interface SolanaMobileWalletProviderProps {
  children: ReactNode;
}

export const SolanaMobileWalletProvider = ({ children }: SolanaMobileWalletProviderProps) => {
  // Check if running in Capacitor (mobile app)
  const isCapacitor = !!(window as any).Capacitor;

  const connectWallet = async (): Promise<string | null> => {
    // Mobile wallet integration will be added in future versions
    console.log("Mobile wallet not yet supported in Capacitor build");
    return null;
  };

  const value: SolanaMobileWalletContextType = {
    connectWallet,
    isCapacitor,
  };

  return (
    <SolanaMobileWalletContext.Provider value={value}>
      {children}
    </SolanaMobileWalletContext.Provider>
  );
};
