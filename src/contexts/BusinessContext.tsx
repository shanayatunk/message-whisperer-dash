import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface BusinessContextType {
  businessId: string;
  setBusinessId: (id: string) => void;
}

const BusinessContext = createContext<BusinessContextType | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [businessId, setBusinessId] = useState(user?.tenant_id || "feelori");

  // Sync with auth context when user's tenant changes
  useEffect(() => {
    if (user?.tenant_id) {
      setBusinessId(user.tenant_id);
    }
  }, [user?.tenant_id]);

  return (
    <BusinessContext.Provider value={{ businessId, setBusinessId }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error("useBusiness must be used within BusinessProvider");
  }
  return context;
}
