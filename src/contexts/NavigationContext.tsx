 import { createContext, useContext, useTransition, useCallback, ReactNode } from "react";
 import { useNavigate } from "react-router-dom";
 
 interface NavigationContextType {
   isPending: boolean;
   navigateWithTransition: (to: string) => void;
 }
 
 const NavigationContext = createContext<NavigationContextType | null>(null);
 
 export function NavigationProvider({ children }: { children: ReactNode }) {
   const [isPending, startTransition] = useTransition();
   const navigate = useNavigate();
 
   const navigateWithTransition = useCallback((to: string) => {
     startTransition(() => {
       navigate(to);
     });
   }, [navigate]);
 
   return (
     <NavigationContext.Provider value={{ isPending, navigateWithTransition }}>
       {children}
     </NavigationContext.Provider>
   );
 }
 
 export function useNavigation() {
   const context = useContext(NavigationContext);
   if (!context) {
     throw new Error("useNavigation must be used within NavigationProvider");
   }
   return context;
 }