 import { useLocation } from "react-router-dom";
 import { useEffect, useState } from "react";
 import { hasVisitedRoute, markRouteVisited } from "@/lib/routePrefetch";
 
 /**
  * Returns true if animations should be instant (page visited before in session)
  */
 export function useInstantAnimation(): boolean {
   const { pathname } = useLocation();
   const [instant] = useState(() => hasVisitedRoute(pathname));
 
   useEffect(() => {
     // Mark as visited after first render
     markRouteVisited(pathname);
   }, [pathname]);
 
   return instant;
 }