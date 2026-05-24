import { forwardRef, useCallback, useTransition } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface TransitionNavLinkProps {
  to: string;
  end?: boolean;
  children: React.ReactNode;
  className?: string | ((props: { isActive: boolean }) => string);
  onMouseEnter?: () => void;
  onClick?: () => void;
}

/**
 * NavLink replacement that uses useTransition for zero-flash navigation.
 * Keeps the old page visible while the new route's component loads.
 */
export const TransitionNavLink = forwardRef<HTMLAnchorElement, TransitionNavLinkProps>(
  ({ to, end, children, className, onMouseEnter, onClick, ...props }, ref) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [, startTransition] = useTransition();

    const isActive = end
      ? location.pathname === to
      : location.pathname.startsWith(to);

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onClick?.();
        
        startTransition(() => {
          navigate(to);
        });
      },
      [to, navigate, onClick, startTransition]
    );

    const resolvedClassName = typeof className === "function"
      ? className({ isActive })
      : className;

    return (
      <a
        ref={ref}
        href={to}
        onClick={handleClick}
        onMouseEnter={onMouseEnter}
        className={resolvedClassName}
        {...props}
      >
        {children}
      </a>
    );
  }
);

TransitionNavLink.displayName = "TransitionNavLink";
