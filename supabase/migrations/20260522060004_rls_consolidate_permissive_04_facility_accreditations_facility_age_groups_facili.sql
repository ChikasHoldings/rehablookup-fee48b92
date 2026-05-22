-- Batch 4/11 — consolidate multi-permissive RLS policies.
-- Tables: public.facility_accreditations, public.facility_age_groups, public.facility_claim_requests, public.facility_credential_documents, public.facility_insurance
--
-- Strategy: drop service_role-only policies (no-op; service_role
-- bypasses RLS). For the remaining active policies in each (table,
-- command) group, OR them into a single PERMISSIVE policy with the
-- broadest role binding from the group. PostgreSQL OR-combines
-- multiple permissive policies anyway, so this is behavior-preserving
-- but eliminates the per-row planner overhead of evaluating each.

-- public.facility_accreditations • DELETE (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can delete accreditations" ON public.facility_accreditations;
DROP POLICY IF EXISTS "Users can delete accreditations from their facilities" ON public.facility_accreditations;
CREATE POLICY "facility_accreditations_delete_consolidated"
  ON public.facility_accreditations
  AS PERMISSIVE FOR DELETE
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (user_owns_facility(facility_id, ( SELECT auth.uid() AS uid))));

-- public.facility_accreditations • SELECT (3 policies; 0 service_role-only dropped, 3 active)
DROP POLICY IF EXISTS "Admins can view all accreditations" ON public.facility_accreditations;
DROP POLICY IF EXISTS "Anyone can view verified accreditations of approved facilities" ON public.facility_accreditations;
DROP POLICY IF EXISTS "Users can view accreditations of their facilities" ON public.facility_accreditations;
CREATE POLICY "facility_accreditations_select_consolidated"
  ON public.facility_accreditations
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR (((verified = true) AND is_approved_facility(facility_id))) OR (user_owns_facility(facility_id, ( SELECT auth.uid() AS uid))));

-- public.facility_age_groups • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Anyone can view age groups of approved facilities" ON public.facility_age_groups;
DROP POLICY IF EXISTS "Users can view age groups of their facilities" ON public.facility_age_groups;
CREATE POLICY "facility_age_groups_select_consolidated"
  ON public.facility_age_groups
  AS PERMISSIVE FOR SELECT
  TO anon, authenticated
  USING ((is_approved_facility(facility_id)) OR (user_owns_facility(facility_id, ( SELECT auth.uid() AS uid))));

-- public.facility_claim_requests • UPDATE (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "facility_claim_requests_admin_update" ON public.facility_claim_requests;
DROP POLICY IF EXISTS "facility_claim_requests_claimant_withdraw" ON public.facility_claim_requests;
CREATE POLICY "facility_claim_requests_update_consolidated"
  ON public.facility_claim_requests
  AS PERMISSIVE FOR UPDATE
  USING ((is_admin(( SELECT auth.uid() AS uid))) OR (((( SELECT auth.uid() AS uid) = claimant_user_id) AND (status = ANY (ARRAY['pending'::text, 'under_review'::text])))))
  WITH CHECK ((is_admin(( SELECT auth.uid() AS uid))) OR (((( SELECT auth.uid() AS uid) = claimant_user_id) AND (status = 'withdrawn'::text))));

-- public.facility_credential_documents • DELETE (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can delete credential documents" ON public.facility_credential_documents;
DROP POLICY IF EXISTS "Users can delete credential documents from their facilities" ON public.facility_credential_documents;
CREATE POLICY "facility_credential_documents_delete_consolidated"
  ON public.facility_credential_documents
  AS PERMISSIVE FOR DELETE
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.user_id = ( SELECT auth.uid() AS uid))))));

-- public.facility_credential_documents • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Admins can view all credential documents" ON public.facility_credential_documents;
DROP POLICY IF EXISTS "Users can view credential documents of their facilities" ON public.facility_credential_documents;
CREATE POLICY "facility_credential_documents_select_consolidated"
  ON public.facility_credential_documents
  AS PERMISSIVE FOR SELECT
  USING ((has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)) OR ((facility_id IN ( SELECT facilities.id
   FROM facilities
  WHERE (facilities.user_id = ( SELECT auth.uid() AS uid))))));

-- public.facility_insurance • SELECT (2 policies; 0 service_role-only dropped, 2 active)
DROP POLICY IF EXISTS "Anyone can view insurance of approved facilities" ON public.facility_insurance;
DROP POLICY IF EXISTS "Users can view insurance of their facilities" ON public.facility_insurance;
CREATE POLICY "facility_insurance_select_consolidated"
  ON public.facility_insurance
  AS PERMISSIVE FOR SELECT
  TO anon, authenticated
  USING ((is_approved_facility(facility_id)) OR (user_owns_facility(facility_id, ( SELECT auth.uid() AS uid))));
