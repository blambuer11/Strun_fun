import { createContext, useContext, ReactNode } from "react";
import { transact } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { Transaction, PublicKey } from "@solana/web3.js";

interface SolanaMobileWalletContextType {
  connectWallet: () => Promise<string | null>;
  signTransaction: (transaction: Transaction) => Promise<Transaction | null>;
  signAndSendTransaction: (transaction: Transaction) => Promise<string | null>;
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
    if (!isCapacitor) {
      console.log("Not running in Capacitor, skipping mobile wallet connect");
      return null;
    }

    try {
      const result = await transact(async (wallet) => {
        const authorization = await wallet.authorize({
          cluster: "devnet",
          identity: {
            name: "Strun",
            uri: "https://strun.app",
            icon: "favicon.ico",
          },
        });

        return authorization.accounts[0].address;
      });

      console.log("Solana Mobile Wallet connected:", result);
      return result;
    } catch (error) {
      console.error("Failed to connect Solana mobile wallet:", error);
      return null;
    }
  };

  const signTransaction = async (transaction: Transaction): Promise<Transaction | null> => {
    if (!isCapacitor) {
      console.log("Not running in Capacitor, skipping mobile wallet sign");
      return null;
    }

    try {
      const result = await transact(async (wallet) => {
        const signedTransactions = await wallet.signTransactions({
          transactions: [transaction],
        });

        return signedTransactions[0];
      });

      return result;
    } catch (error) {
      console.error("Failed to sign transaction with mobile wallet:", error);
      return null;
    }
  };

  const signAndSendTransaction = async (transaction: Transaction): Promise<string | null> => {
    if (!isCapacitor) {
      console.log("Not running in Capacitor, skipping mobile wallet sign and send");
      return null;
    }

    try {
      const result = await transact(async (wallet) => {
        const signedTransactions = await wallet.signAndSendTransactions({
          transactions: [transaction],
        });

        return signedTransactions[0];
      });

      return result;
    } catch (error) {
      console.error("Failed to sign and send transaction with mobile wallet:", error);
      return null;
    }
  };

  const value: SolanaMobileWalletContextType = {
    connectWallet,
    signTransaction,
    signAndSendTransaction,
    isCapacitor,
  };

  return (
    <SolanaMobileWalletContext.Provider value={value}>
      {children}
    </SolanaMobileWalletContext.Provider>
  );
};
