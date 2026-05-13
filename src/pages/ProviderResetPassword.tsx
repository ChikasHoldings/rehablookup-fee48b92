import { Navigate } from "react-router-dom";

// Magic-link recovery is gone. The full password-reset flow (email entry,
// 6-digit code, new password) now lives inline at /provider/forgot-password.
export default function ProviderResetPassword() {
  return <Navigate to="/provider/forgot-password" replace />;
}
