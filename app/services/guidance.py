import json
import logging
from typing import Dict, List, Optional
from openai import AsyncOpenAI

from app.config import settings
from app.schemas.alerts import HazardCategory, WarningAlert
from app.schemas.guidance import EmergencyGuidanceResponse, ExplainWarningRequest
from app.services.warning_sources import warning_aggregator

logger = logging.getLogger("safehaven.guidance")

# Authoritative emergency numbers by verified jurisdiction (never hallucinated)
VERIFIED_EMERGENCY_CONTACTS: Dict[str, List[str]] = {
    "global": ["International Emergency Standard (GSM): 112"],
    "europe": ["European Union Emergency: 112"],
    "united states": ["Emergency (Police/Fire/Medical): 911"],
    "canada": ["Emergency (Police/Fire/Medical): 911"],
    "india": ["Emergency Response Support System (ERSS): 112", "National Disaster Response Force (NDRF): 1078"],
    "united kingdom": ["Emergency Services: 999", "Non-emergency: 111"],
    "japan": ["Police: 110", "Fire / Ambulance: 119"],
    "australia": ["Emergency: 000"],
    "taiwan": ["Fire / Ambulance: 119", "Police: 110"],
}


class EmergencyGuidanceService:
    def __init__(self):
        self.openai_client = None
        if settings.is_llm_enabled:
            client_kwargs = {"api_key": settings.LLM_API_KEY}
            if settings.LLM_BASE_URL:
                client_kwargs["base_url"] = settings.LLM_BASE_URL
            self.openai_client = AsyncOpenAI(**client_kwargs)

    def get_jurisdiction_contacts(self, location_text: str) -> List[str]:
        loc_l = location_text.lower()
        for key, contacts in VERIFIED_EMERGENCY_CONTACTS.items():
            if key in loc_l:
                return contacts
        return VERIFIED_EMERGENCY_CONTACTS["global"]

    async def explain_and_translate(self, req: ExplainWarningRequest) -> EmergencyGuidanceResponse:
        """
        Grounded plain-language simplification and translation of official warning.
        """
        # Resolve warning content
        original_text = req.raw_warning_text or ""
        source_org = req.source_org or "Official Authority"
        source_url = None
        pub_at = None
        valid_until = None
        verification_status = "official"
        geographic_coverage = "Global"

        if req.alert_id:
            all_alerts, _ = await warning_aggregator.fetch_all_warnings()
            matched = next((a for a in all_alerts if a.id == req.alert_id), None)
            if matched:
                original_text = matched.original_text
                source_org = matched.source_org
                source_url = matched.original_url
                pub_at = matched.published_at.isoformat()
                valid_until = matched.valid_until.isoformat() if matched.valid_until else None
                verification_status = matched.verification_status.value
                geographic_coverage = matched.geographic_coverage

        if not original_text:
            original_text = "No warning text supplied."

        emergency_contacts = self.get_jurisdiction_contacts(geographic_coverage)

        # If LLM is available, use LLM for translation and grounded simplification
        if self.openai_client and original_text != "No warning text supplied.":
            try:
                system_prompt = (
                    "You are SafeHaven AI's multilingual emergency communications assistant.\n"
                    "RULES:\n"
                    "1. Translate and simplify official disaster warnings into clear, non-technical plain language.\n"
                    "2. Only provide actionable instructions grounded strictly in the official warning text.\n"
                    "3. DO NOT fabricate or hallucinate phone numbers, contacts, or safety claims.\n"
                    "4. Return JSON with 'simplified_explanation', 'translated_explanation', 'recommended_actions' (list of strings)."
                )

                user_prompt = (
                    f"Target Language: {req.target_language}\n"
                    f"Issuing Organization: {source_org}\n"
                    f"<official_warning_text>\n{original_text}\n</official_warning_text>\n\n"
                    "Provide the simplification and translation in JSON format: "
                    "{'simplified_explanation': '...', 'translated_explanation': '...', 'recommended_actions': ['...']}"
                )

                resp = await self.openai_client.chat.completions.create(
                    model=settings.LLM_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_tokens=800,
                )

                data = json.loads(resp.choices[0].message.content)
                return EmergencyGuidanceResponse(
                    alert_id=req.alert_id,
                    original_warning=original_text,
                    source_organization=source_org,
                    source_url=source_url,
                    published_at=pub_at,
                    validity_period=valid_until,
                    simplified_explanation=data.get("simplified_explanation", original_text),
                    target_language=req.target_language,
                    translated_explanation=data.get("translated_explanation", original_text),
                    recommended_actions=data.get("recommended_actions", ["Follow instructions from local authorities."]),
                    emergency_contacts=emergency_contacts,
                    verification_status=verification_status,
                    remaining_uncertainty="Conditions may evolve rapidly; verify real-time status with issuing agency.",
                )
            except Exception as e:
                logger.warning(f"LLM translation failed: {e}. Falling back to deterministic guidance.")

        # Deterministic fallback guidance
        actions = [
            "Monitor official broadcast channels and heed instructions from local emergency personnel.",
            "Avoid low-lying or exposed outdoor terrain until an authoritative all-clear is issued.",
            "Contact your lodging or local embassy for shelter advisories if travel routes are disrupted.",
        ]

        simplified = f"Official hazard advisory from {source_org}: {original_text[:250]}..."
        translated = (
            f"[{req.target_language.upper()} Translation unavailable offline] {simplified}"
            if req.target_language != "en"
            else simplified
        )

        return EmergencyGuidanceResponse(
            alert_id=req.alert_id,
            original_warning=original_text,
            source_organization=source_org,
            source_url=source_url,
            published_at=pub_at,
            validity_period=valid_until,
            simplified_explanation=simplified,
            target_language=req.target_language,
            translated_explanation=translated,
            recommended_actions=actions,
            emergency_contacts=emergency_contacts,
            verification_status=verification_status,
            remaining_uncertainty="Offline fallback guidance active. Always consult official emergency broadcasters.",
        )


guidance_service = EmergencyGuidanceService()
