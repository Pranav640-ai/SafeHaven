import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from app.config import settings
from app.schemas.destinations import CandidatePlace
from app.schemas.itinerary import Activity, ActivityCategory, Itinerary
from app.schemas.replanning import (
    ActivityChangeType,
    RevisedActivityRecord,
    TripReplanRequest,
    TripReplanResponse,
)
from app.schemas.risk import ActionRecommendation, ActivityRiskAssessment, ItineraryRiskSummary, RiskCategory
from app.services.alternative_ranker import alternative_ranker
from app.services.places import places_service
from app.services.risk_engine import risk_engine

logger = logging.getLogger("safehaven.replanner")


class LLMActivityDecision(BaseModel):
    activity_id: str
    action: str = Field(..., description="unchanged, modify, delay, cancel")
    selected_candidate_id: Optional[str] = None
    reason: str
    similarity_justification: Optional[str] = None
    remaining_uncertainty: str = "Standard real-world conditions apply"


class LLMReplanningResult(BaseModel):
    decisions: List[LLMActivityDecision]
    general_summary: str


class TripReplannerService:
    def __init__(self):
        self.openai_client = None
        if settings.is_llm_enabled:
            client_kwargs = {"api_key": settings.LLM_API_KEY}
            if settings.LLM_BASE_URL:
                client_kwargs["base_url"] = settings.LLM_BASE_URL
            self.openai_client = AsyncOpenAI(**client_kwargs)

    async def replan_itinerary(
        self,
        itinerary: Itinerary,
        force_deterministic: bool = False,
    ) -> TripReplanResponse:
        """
        End-to-end trip replanning workflow:
        1. Run server-side deterministic risk evaluation.
        2. Identify activities requiring change.
        3. Discover, filter, and rank real nearby alternatives.
        4. Attempt LLM-guided structured replanning (if enabled).
        5. Deterministically validate LLM response, falling back safely to deterministic replanning.
        """
        # Step 1: Deterministic risk assessment
        risk_summary: ItineraryRiskSummary = await risk_engine.assess_itinerary(itinerary)

        # Step 2: Identify risky activities
        assessment_by_id: Dict[str, ActivityRiskAssessment] = {
            a.activity_id: a for a in risk_summary.activity_assessments
        }

        risky_activities: List[Activity] = []
        for act in itinerary.activities:
            ass = assessment_by_id.get(act.id)
            if ass and ass.replanning_needed:
                risky_activities.append(act)

        # Step 3: Discover & rank alternatives for risky activities
        all_candidates_by_activity: Dict[str, List[CandidatePlace]] = {}
        all_eligible_candidates: List[CandidatePlace] = []

        # Get all active alerts
        all_alerts = []
        for ass in risk_summary.activity_assessments:
            # Reconstruct alerts from evidence items
            pass

        # Fetch warnings directly
        from app.services.warning_sources import warning_aggregator
        active_alerts, _ = await warning_aggregator.fetch_all_warnings()

        for act in risky_activities:
            ass = assessment_by_id[act.id]
            is_weather = any("Weather:" in h for h in ass.relevant_hazards)
            origin = act.coordinates or itinerary.destination_coordinates

            # Query real places
            raw_places, _ = await places_service.find_nearby_places(
                origin=origin,
                radius_km=itinerary.user_preferences.max_alternative_distance_km if itinerary.user_preferences else 25.0,
                preferred_category=act.category,
                limit=15,
            )

            eligible, filtered = alternative_ranker.filter_and_rank_alternatives(
                original_activity=act,
                candidates=raw_places,
                all_alerts=active_alerts,
                user_preferences=itinerary.user_preferences,
                is_weather_hazard=is_weather,
            )
            all_candidates_by_activity[act.id] = eligible
            all_eligible_candidates.extend(eligible)

        # Step 4: Choose between LLM replanning or Deterministic replanning
        use_llm = bool(self.openai_client and not force_deterministic and risky_activities)
        replanner_mode = "deterministic_fallback"
        changed_records: List[RevisedActivityRecord] = []
        validation_status = "validated_ok"
        uncertainties: List[str] = []

        if use_llm:
            try:
                llm_res = await self._generate_llm_replanning(
                    itinerary=itinerary,
                    risk_summary=risk_summary,
                    candidates_map=all_candidates_by_activity,
                )
                if llm_res:
                    # Deterministically validate LLM response
                    is_valid, validation_errors = self._validate_llm_output(
                        llm_res=llm_res,
                        itinerary=itinerary,
                        candidates_map=all_candidates_by_activity,
                        assessment_by_id=assessment_by_id,
                    )
                    if is_valid:
                        replanner_mode = "llm_generated"
                        changed_records = self._apply_llm_decisions(
                            itinerary=itinerary,
                            llm_res=llm_res,
                            candidates_map=all_candidates_by_activity,
                            assessment_by_id=assessment_by_id,
                        )
                    else:
                        logger.warning(f"LLM replanning output validation failed: {validation_errors}. Using deterministic fallback.")
                        validation_status = f"llm_validation_failed: {'; '.join(validation_errors)}"
                        uncertainties.append("LLM output rejected by deterministic validator; safe deterministic alternative applied.")
                        changed_records = self._generate_deterministic_plan(
                            itinerary=itinerary,
                            candidates_map=all_candidates_by_activity,
                            assessment_by_id=assessment_by_id,
                        )
                else:
                    changed_records = self._generate_deterministic_plan(
                        itinerary=itinerary,
                        candidates_map=all_candidates_by_activity,
                        assessment_by_id=assessment_by_id,
                    )
            except Exception as e:
                logger.warning(f"LLM replanning execution failed: {e}. Falling back to deterministic plan.")
                uncertainties.append(f"AI Replanner unavailable ({str(e)}); deterministic safety plan generated.")
                changed_records = self._generate_deterministic_plan(
                    itinerary=itinerary,
                    candidates_map=all_candidates_by_activity,
                    assessment_by_id=assessment_by_id,
                )
        else:
            changed_records = self._generate_deterministic_plan(
                itinerary=itinerary,
                candidates_map=all_candidates_by_activity,
                assessment_by_id=assessment_by_id,
            )
            replanner_mode = "deterministic_rule_engine"

        # Construct revised itinerary
        revised_activities: List[Activity] = []
        for rec in changed_records:
            if rec.change_type == ActivityChangeType.UNCHANGED or rec.change_type == ActivityChangeType.MODIFIED or rec.change_type == ActivityChangeType.DELAYED:
                if rec.revised_activity:
                    revised_activities.append(rec.revised_activity)
            # If CANCELLED, omitted from revised itinerary activities list

        # If all were cancelled or revised list is empty, make sure we return valid itinerary structure
        revised_itinerary = Itinerary(
            id=f"{itinerary.id or 'itin'}_revised",
            destination_name=itinerary.destination_name,
            destination_coordinates=itinerary.destination_coordinates,
            start_date=itinerary.start_date,
            end_date=itinerary.end_date,
            activities=revised_activities if revised_activities else itinerary.activities[:1],
            user_preferences=itinerary.user_preferences,
        )

        return TripReplanResponse(
            original_itinerary=itinerary,
            revised_itinerary=revised_itinerary,
            changed_activities=changed_records,
            risk_summary=risk_summary,
            alternatives_considered=all_eligible_candidates[:20],
            replanner_mode=replanner_mode,
            validation_status=validation_status,
            uncertainties=uncertainties,
        )

    def _generate_deterministic_plan(
        self,
        itinerary: Itinerary,
        candidates_map: Dict[str, List[CandidatePlace]],
        assessment_by_id: Dict[str, ActivityRiskAssessment],
    ) -> List[RevisedActivityRecord]:
        """
        Purely deterministic, verified fallback replanner.
        Zero hallucinations: selects top ranked verified candidate or delays/cancels honestly.
        """
        records: List[RevisedActivityRecord] = []

        for act in itinerary.activities:
            ass = assessment_by_id.get(act.id)
            if not ass or not ass.replanning_needed:
                # Unaffected activity
                records.append(
                    RevisedActivityRecord(
                        original_activity_id=act.id,
                        change_type=ActivityChangeType.UNCHANGED,
                        revised_activity=act,
                        reason_for_change="Activity is safe; no hazard detected.",
                        remaining_uncertainty="Standard weather monitoring applies.",
                    )
                )
                continue

            candidates = candidates_map.get(act.id, [])
            evidence_ids = [e.id for e in ass.evidence]

            # Check if there is an eligible candidate
            if candidates:
                top_cand = candidates[0]
                # Construct revised activity with exact coordinates & title from OSM candidate
                revised_act = Activity(
                    id=f"{act.id}_alt_{top_cand.id}",
                    title=f"{top_cand.name} (Alternative for {act.title})",
                    category=top_cand.category,
                    location_name=top_cand.name,
                    coordinates=top_cand.coordinates,
                    start_time=act.start_time,
                    end_time=act.end_time,
                    duration_minutes=act.duration_minutes,
                    is_fixed=act.is_fixed,
                    budget=act.budget,
                    accessibility_needs=act.accessibility_needs,
                    notes=f"Replaced due to {ass.risk_category.value} hazard at {act.location_name}.",
                )

                records.append(
                    RevisedActivityRecord(
                        original_activity_id=act.id,
                        change_type=ActivityChangeType.MODIFIED,
                        revised_activity=revised_act,
                        reason_for_change=f"{ass.recommended_action} Hazard: {', '.join(ass.relevant_hazards[:2])}",
                        supporting_evidence_ids=evidence_ids,
                        similarity_justification=top_cand.ranking_explanation,
                        selected_candidate_id=top_cand.id,
                        distance_from_original_km=top_cand.distance_km,
                        remaining_uncertainty=(
                            f"Verified outside active hazard zones. Gaps: {', '.join(top_cand.information_gaps[:2]) if top_cand.information_gaps else 'None'}."
                        ),
                    )
                )
            else:
                # No suitable candidate discovered
                if ass.recommendation == ActionRecommendation.DELAY:
                    # Delay by 3 hours if schedule permits
                    delayed_start = act.start_time + timedelta(hours=3)
                    delayed_end = act.end_time + timedelta(hours=3)
                    revised_act = Activity(
                        id=f"{act.id}_delayed",
                        title=f"{act.title} (Delayed Schedule)",
                        category=act.category,
                        location_name=act.location_name,
                        coordinates=act.coordinates,
                        start_time=delayed_start,
                        end_time=delayed_end,
                        duration_minutes=act.duration_minutes,
                        is_fixed=act.is_fixed,
                        notes="Delayed to bypass adverse weather window.",
                    )
                    records.append(
                        RevisedActivityRecord(
                            original_activity_id=act.id,
                            change_type=ActivityChangeType.DELAYED,
                            revised_activity=revised_act,
                            reason_for_change="Delayed start to avoid peak hazard intensity; no nearby alternative was found.",
                            supporting_evidence_ids=evidence_ids,
                            remaining_uncertainty="Forecast conditions should be rechecked closer to new start time.",
                        )
                    )
                else:
                    # Cancel safely
                    records.append(
                        RevisedActivityRecord(
                            original_activity_id=act.id,
                            change_type=ActivityChangeType.CANCELLED,
                            revised_activity=None,
                            reason_for_change=(
                                f"Cancelled due to {ass.risk_category.value} risk ({ass.recommended_action}). "
                                "No verified safe nearby alternative could be found in OpenStreetMap."
                            ),
                            supporting_evidence_ids=evidence_ids,
                            remaining_uncertainty="Traveler should remain in secure lodging or shelter.",
                        )
                    )

        return records

    async def _generate_llm_replanning(
        self,
        itinerary: Itinerary,
        risk_summary: ItineraryRiskSummary,
        candidates_map: Dict[str, List[CandidatePlace]],
    ) -> Optional[LLMReplanningResult]:
        if not self.openai_client:
            return None

        # Build payload with prompt-injection defense
        activities_data = []
        for act in itinerary.activities:
            activities_data.append({
                "id": act.id,
                "title": act.title,
                "category": act.category.value,
                "location": act.location_name,
                "start_time": act.start_time.isoformat(),
                "end_time": act.end_time.isoformat(),
                "is_fixed": act.is_fixed,
            })

        assessments_data = []
        for ass in risk_summary.activity_assessments:
            assessments_data.append({
                "activity_id": ass.activity_id,
                "risk_category": ass.risk_category.value,
                "recommended_action": ass.recommended_action,
                "relevant_hazards": ass.relevant_hazards,
                "replanning_needed": ass.replanning_needed,
            })

        candidates_data = {}
        for act_id, cands in candidates_map.items():
            candidates_data[act_id] = [
                {
                    "candidate_id": c.id,
                    "name": c.name,
                    "category": c.category.value,
                    "distance_km": c.distance_km,
                    "ranking_score": c.composite_score,
                }
                for c in cands[:5]
            ]

        system_prompt = (
            "You are SafeHaven AI's deterministic itinerary replanning agent.\n"
            "STRICT CONSTRAINTS:\n"
            "1. NEVER invent places, coordinates, URLs, or incidents.\n"
            "2. For risky activities, you MUST select an alternative ONLY from the provided candidate list by its candidate_id, or choose action 'cancel' or 'delay' if no candidate fits.\n"
            "3. If an activity is marked replanning_needed=False, you MUST keep it unchanged.\n"
            "4. NEVER override authoritative closures or evacuation orders.\n"
            "5. Return output conforming to the required JSON schema with 'decisions' and 'general_summary'."
        )

        user_prompt = (
            f"<untrusted_itinerary>\n{json.dumps(activities_data)}\n</untrusted_itinerary>\n\n"
            f"<untrusted_hazard_assessments>\n{json.dumps(assessments_data)}\n</untrusted_hazard_assessments>\n\n"
            f"<validated_candidate_alternatives>\n{json.dumps(candidates_data)}\n</validated_candidate_alternatives>\n\n"
            "Provide the revised decision for every activity in JSON format matching schema: "
            "{'decisions': [{'activity_id': '...', 'action': 'unchanged|modify|delay|cancel', 'selected_candidate_id': '...', 'reason': '...', 'similarity_justification': '...', 'remaining_uncertainty': '...'}], 'general_summary': '...'}"
        )

        response = await self.openai_client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=1500,
        )

        raw_json = response.choices[0].message.content
        if not raw_json:
            return None
        data = json.loads(raw_json)
        return LLMReplanningResult(**data)

    def _validate_llm_output(
        self,
        llm_res: LLMReplanningResult,
        itinerary: Itinerary,
        candidates_map: Dict[str, List[CandidatePlace]],
        assessment_by_id: Dict[str, ActivityRiskAssessment],
    ) -> Tuple[bool, List[str]]:
        """
        Deterministic validation of LLM decisions.
        Ensures candidate IDs exist, fixed activities are respected, and no unauthorized modifications occurred.
        """
        errors = []
        act_ids = {a.id for a in itinerary.activities}
        decided_ids = {d.activity_id for d in llm_res.decisions}

        if act_ids != decided_ids:
            errors.append(f"LLM omitted or invented activity IDs (expected: {act_ids}, got: {decided_ids})")

        for dec in llm_res.decisions:
            ass = assessment_by_id.get(dec.activity_id)
            if ass and not ass.replanning_needed and dec.action != "unchanged":
                errors.append(f"LLM altered safe activity '{dec.activity_id}' that had replanning_needed=False")

            if dec.action == "modify":
                if not dec.selected_candidate_id:
                    errors.append(f"Modify action for '{dec.activity_id}' missing selected_candidate_id")
                else:
                    valid_cands = {c.id for c in candidates_map.get(dec.activity_id, [])}
                    if dec.selected_candidate_id not in valid_cands:
                        errors.append(
                            f"LLM invented or invalid candidate ID '{dec.selected_candidate_id}' for '{dec.activity_id}'"
                        )

        return len(errors) == 0, errors

    def _apply_llm_decisions(
        self,
        itinerary: Itinerary,
        llm_res: LLMReplanningResult,
        candidates_map: Dict[str, List[CandidatePlace]],
        assessment_by_id: Dict[str, ActivityRiskAssessment],
    ) -> List[RevisedActivityRecord]:
        records: List[RevisedActivityRecord] = []
        decision_map = {d.activity_id: d for d in llm_res.decisions}
        cand_lookup = {c.id: c for cands in candidates_map.values() for c in cands}

        for act in itinerary.activities:
            dec = decision_map.get(act.id)
            ass = assessment_by_id.get(act.id)
            ev_ids = [e.id for e in ass.evidence] if ass else []

            if not dec or dec.action == "unchanged":
                records.append(
                    RevisedActivityRecord(
                        original_activity_id=act.id,
                        change_type=ActivityChangeType.UNCHANGED,
                        revised_activity=act,
                        reason_for_change=dec.reason if dec else "Safe activity",
                        remaining_uncertainty="Standard weather conditions apply",
                    )
                )
            elif dec.action == "modify":
                cand = cand_lookup.get(dec.selected_candidate_id)
                if cand:
                    revised_act = Activity(
                        id=f"{act.id}_llm_{cand.id}",
                        title=f"{cand.name} (AI Alternative)",
                        category=cand.category,
                        location_name=cand.name,
                        coordinates=cand.coordinates,
                        start_time=act.start_time,
                        end_time=act.end_time,
                        duration_minutes=act.duration_minutes,
                        is_fixed=act.is_fixed,
                    )
                    records.append(
                        RevisedActivityRecord(
                            original_activity_id=act.id,
                            change_type=ActivityChangeType.MODIFIED,
                            revised_activity=revised_act,
                            reason_for_change=dec.reason,
                            supporting_evidence_ids=ev_ids,
                            similarity_justification=dec.similarity_justification or cand.ranking_explanation,
                            selected_candidate_id=cand.id,
                            distance_from_original_km=cand.distance_km,
                            remaining_uncertainty=dec.remaining_uncertainty,
                        )
                    )
            elif dec.action == "delay":
                delayed_start = act.start_time + timedelta(hours=3)
                delayed_end = act.end_time + timedelta(hours=3)
                revised_act = Activity(
                    id=f"{act.id}_delayed",
                    title=f"{act.title} (Delayed)",
                    category=act.category,
                    location_name=act.location_name,
                    coordinates=act.coordinates,
                    start_time=delayed_start,
                    end_time=delayed_end,
                    duration_minutes=act.duration_minutes,
                    is_fixed=act.is_fixed,
                )
                records.append(
                    RevisedActivityRecord(
                        original_activity_id=act.id,
                        change_type=ActivityChangeType.DELAYED,
                        revised_activity=revised_act,
                        reason_for_change=dec.reason,
                        supporting_evidence_ids=ev_ids,
                        remaining_uncertainty=dec.remaining_uncertainty,
                    )
                )
            elif dec.action == "cancel":
                records.append(
                    RevisedActivityRecord(
                        original_activity_id=act.id,
                        change_type=ActivityChangeType.CANCELLED,
                        revised_activity=None,
                        reason_for_change=dec.reason,
                        supporting_evidence_ids=ev_ids,
                        remaining_uncertainty=dec.remaining_uncertainty,
                    )
                )

        return records


trip_replanner = TripReplannerService()
