import asyncio
import logging
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.config import settings
from app.schemas.alerts import HazardCategory, HazardSeverity, VerificationStatus, WarningAlert
from app.schemas.common import Coordinates, SourceStatus
from app.services.cache import cache

logger = logging.getLogger("safehaven.warnings")


def parse_iso_or_utc(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None
    try:
        # Replace Z with +00:00
        clean_str = date_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        pass
    # Try common formats
    for fmt in ("%a, %d %b %Y %H:%M:%S %Z", "%a, %d %b %Y %H:%M:%S %z", "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.strptime(date_str, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            pass
    return None


class BaseWarningAdapter:
    name: str = "base"

    async def fetch_warnings(self) -> Tuple[List[WarningAlert], SourceStatus]:
        raise NotImplementedError


class GDACSAdapter(BaseWarningAdapter):
    """
    Adapter for Global Disaster Alert and Coordination System (GDACS - UN/EC).
    Provides real-time official alerts for floods, tropical cyclones, earthquakes, wildfires.
    """
    name: str = "GDACS (UN/EC Disaster Coordination)"

    def __init__(self, feed_url: Optional[str] = None):
        self.feed_url = feed_url or settings.GDACS_FEED_URL

    async def fetch_warnings(self) -> Tuple[List[WarningAlert], SourceStatus]:
        cached, age = cache.get("warnings", "gdacs")
        if cached is not None:
            return cached, SourceStatus(
                source_name=self.name,
                status="cached",
                latency_ms=0.0,
                records_count=len(cached),
                message=f"Cached {len(cached)} GDACS alerts (age: {int(age or 0)}s)",
                last_fetched_at=datetime.now(timezone.utc),
            )

        start = datetime.now(timezone.utc)
        alerts: List[WarningAlert] = []

        try:
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(self.feed_url)
                resp.raise_for_status()
                text = resp.text

            elapsed_ms = (datetime.now(timezone.utc) - start).total_seconds() * 1000

            # Parse XML
            root = ET.fromstring(text)
            namespaces = {
                "geo": "http://www.w3.org/2003/01/geo/wgs84_pos#",
                "gdacs": "http://www.gdacs.org",
            }

            channel = root.find("channel")
            if channel is not None:
                for item in channel.findall("item"):
                    try:
                        title = item.findtext("title", default="Unknown GDACS Alert").strip()
                        link = item.findtext("link", default="https://www.gdacs.org").strip()
                        desc = item.findtext("description", default="").strip()
                        pub_date_str = item.findtext("pubDate")
                        pub_dt = parse_iso_or_utc(pub_date_str) or datetime.now(timezone.utc)

                        lat_str = item.findtext("geo:lat", default=None, namespaces=namespaces)
                        lon_str = item.findtext("geo:long", default=None, namespaces=namespaces)
                        coords = None
                        if lat_str and lon_str:
                            coords = Coordinates(latitude=float(lat_str), longitude=float(lon_str))

                        # Determine hazard category
                        title_lower = title.lower() + " " + desc.lower()
                        cat = HazardCategory.OTHER
                        if "flood" in title_lower:
                            cat = HazardCategory.FLOOD
                        elif "cyclone" in title_lower or "storm" in title_lower or "hurricane" in title_lower:
                            cat = HazardCategory.SEVERE_WEATHER
                        elif "earthquake" in title_lower:
                            cat = HazardCategory.EARTHQUAKE
                        elif "wildfire" in title_lower or "fire" in title_lower:
                            cat = HazardCategory.WILDFIRE
                        elif "landslide" in title_lower:
                            cat = HazardCategory.LANDSLIDE

                        # Severity from GDACS alert level
                        alert_level = item.findtext("gdacs:alertlevel", default="Green", namespaces=namespaces).capitalize()
                        if alert_level == "Red":
                            sev = HazardSeverity.EXTREME
                        elif alert_level == "Orange":
                            sev = HazardSeverity.SEVERE
                        else:
                            sev = HazardSeverity.MODERATE

                        # Validity period
                        from_date = parse_iso_or_utc(item.findtext("gdacs:fromdate", default=None, namespaces=namespaces))
                        to_date = parse_iso_or_utc(item.findtext("gdacs:todate", default=None, namespaces=namespaces))
                        if not to_date and from_date:
                            to_date = from_date + timedelta(days=5)

                        country = item.findtext("gdacs:country", default="Global", namespaces=namespaces)

                        alert_obj = WarningAlert(
                            id=f"gdacs_{item.findtext('guid', default=title)}",
                            source_org="GDACS (United Nations & European Commission)",
                            original_url=link,
                            published_at=pub_dt,
                            valid_from=from_date or pub_dt,
                            valid_until=to_date,
                            hazard_category=cat,
                            severity=sev,
                            title=title,
                            original_text=desc or title,
                            language="en",
                            geographic_coverage=f"Country/Region: {country}",
                            coordinates=coords,
                            radius_km=50.0 if coords else None,
                            is_mandatory_override=(sev == HazardSeverity.EXTREME),
                            verification_status=VerificationStatus.OFFICIAL,
                            retrieved_at=datetime.now(timezone.utc),
                        )
                        alerts.append(alert_obj)
                    except Exception as parse_err:
                        logger.debug(f"Failed to parse GDACS item: {parse_err}")

            cache.set("warnings", "gdacs", alerts, settings.WARNINGS_CACHE_TTL_SECONDS)
            return alerts, SourceStatus(
                source_name=self.name,
                status="ok",
                latency_ms=round(elapsed_ms, 2),
                records_count=len(alerts),
                message=f"Retrieved {len(alerts)} official GDACS disaster alerts",
                last_fetched_at=datetime.now(timezone.utc),
            )
        except Exception as e:
            logger.warning(f"Failed to fetch GDACS feed: {e}")
            return [], SourceStatus(
                source_name=self.name,
                status="failed",
                records_count=0,
                message=str(e),
                last_fetched_at=datetime.now(timezone.utc),
            )


class USGSAdapter(BaseWarningAdapter):
    """
    Adapter for USGS Real-Time Earthquake GeoJSON API.
    """
    name: str = "USGS Earthquake Hazards"

    def __init__(self, feed_url: Optional[str] = None):
        self.feed_url = feed_url or settings.USGS_EARTHQUAKE_FEED_URL

    async def fetch_warnings(self) -> Tuple[List[WarningAlert], SourceStatus]:
        cached, age = cache.get("warnings", "usgs")
        if cached is not None:
            return cached, SourceStatus(
                source_name=self.name,
                status="cached",
                latency_ms=0.0,
                records_count=len(cached),
                message=f"Cached {len(cached)} USGS earthquake records",
                last_fetched_at=datetime.now(timezone.utc),
            )

        start = datetime.now(timezone.utc)
        alerts: List[WarningAlert] = []

        try:
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(self.feed_url)
                resp.raise_for_status()
                data = resp.json()

            elapsed_ms = (datetime.now(timezone.utc) - start).total_seconds() * 1000

            features = data.get("features", [])
            for feat in features:
                props = feat.get("properties", {})
                geom = feat.get("geometry", {})
                coords_list = geom.get("coordinates", [])

                mag = props.get("mag")
                if mag is None or mag < 4.0:  # Focus on notable seismic events affecting travel safety
                    continue

                lon = coords_list[0] if len(coords_list) > 0 else None
                lat = coords_list[1] if len(coords_list) > 1 else None
                coords = Coordinates(latitude=lat, longitude=lon) if lat and lon else None

                event_time_ms = props.get("time")
                pub_dt = (
                    datetime.fromtimestamp(event_time_ms / 1000.0, tz=timezone.utc)
                    if event_time_ms
                    else datetime.now(timezone.utc)
                )

                sev = (
                    HazardSeverity.EXTREME
                    if mag >= 6.5
                    else (HazardSeverity.SEVERE if mag >= 5.5 else HazardSeverity.MODERATE)
                )

                place = props.get("place", "Seismic location")
                title = f"M {mag:.1f} Earthquake — {place}"

                alert_obj = WarningAlert(
                    id=f"usgs_{feat.get('id', place)}",
                    source_org="USGS National Earthquake Information Center",
                    original_url=props.get("url"),
                    published_at=pub_dt,
                    valid_from=pub_dt,
                    valid_until=pub_dt + timedelta(days=2),  # Aftershocks & assessment period
                    hazard_category=HazardCategory.EARTHQUAKE,
                    severity=sev,
                    title=title,
                    original_text=f"Magnitude {mag} earthquake occurred at {place}. USGS status: {props.get('status')}.",
                    language="en",
                    geographic_coverage=f"Area: {place}",
                    coordinates=coords,
                    radius_km=30.0 if mag < 6.0 else 100.0,
                    is_mandatory_override=(mag >= 6.5),
                    verification_status=VerificationStatus.OFFICIAL,
                    retrieved_at=datetime.now(timezone.utc),
                )
                alerts.append(alert_obj)

            cache.set("warnings", "usgs", alerts, settings.WARNINGS_CACHE_TTL_SECONDS)
            return alerts, SourceStatus(
                source_name=self.name,
                status="ok",
                latency_ms=round(elapsed_ms, 2),
                records_count=len(alerts),
                message=f"Retrieved {len(alerts)} seismic hazard events (M>=4.0)",
                last_fetched_at=datetime.now(timezone.utc),
            )
        except Exception as e:
            logger.warning(f"Failed to fetch USGS feed: {e}")
            return [], SourceStatus(
                source_name=self.name,
                status="failed",
                records_count=0,
                message=str(e),
                last_fetched_at=datetime.now(timezone.utc),
            )


class ReliefWebAdapter(BaseWarningAdapter):
    """
    Adapter for ReliefWeb API (UN OCHA humanitarian reports & disaster situation updates).
    """
    name: str = "ReliefWeb (UN OCHA Humanitarian Incident Reports)"

    def __init__(self, api_url: Optional[str] = None):
        self.api_url = api_url or settings.RELIEFWEB_API_URL

    async def fetch_warnings(self) -> Tuple[List[WarningAlert], SourceStatus]:
        cached, age = cache.get("warnings", "reliefweb")
        if cached is not None:
            return cached, SourceStatus(
                source_name=self.name,
                status="cached",
                latency_ms=0.0,
                records_count=len(cached),
                message=f"Cached {len(cached)} ReliefWeb incident reports",
                last_fetched_at=datetime.now(timezone.utc),
            )

        start = datetime.now(timezone.utc)
        alerts: List[WarningAlert] = []

        params = {
            "appname": "SafeHavenAI-TravelTech",
            "limit": 15,
            "profile": "list",
            "preset": "latest",
        }

        try:
            async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(self.api_url, params=params)
                resp.raise_for_status()
                data = resp.json()

            elapsed_ms = (datetime.now(timezone.utc) - start).total_seconds() * 1000

            items = data.get("data", [])
            for item in items:
                fields = item.get("fields", {})
                title = fields.get("title", "")
                url = fields.get("url")
                date_str = fields.get("date", {}).get("created")
                pub_dt = parse_iso_or_utc(date_str) or datetime.now(timezone.utc)

                title_l = title.lower()
                cat = HazardCategory.OTHER
                if "flood" in title_l:
                    cat = HazardCategory.FLOOD
                elif "cyclone" in title_l or "storm" in title_l:
                    cat = HazardCategory.SEVERE_WEATHER
                elif "landslide" in title_l:
                    cat = HazardCategory.LANDSLIDE
                elif "wildfire" in title_l or "fire" in title_l:
                    cat = HazardCategory.WILDFIRE
                elif "earthquake" in title_l:
                    cat = HazardCategory.EARTHQUAKE

                # Country names
                countries = [c.get("name") for c in fields.get("country", []) if "name" in c]
                country_str = ", ".join(countries) if countries else "Global"

                alert_obj = WarningAlert(
                    id=f"reliefweb_{item.get('id')}",
                    source_org="ReliefWeb (UN OCHA)",
                    original_url=url,
                    published_at=pub_dt,
                    valid_from=pub_dt,
                    valid_until=pub_dt + timedelta(days=7),
                    hazard_category=cat,
                    severity=HazardSeverity.MODERATE,
                    title=title,
                    original_text=title,
                    language="en",
                    geographic_coverage=f"Affected Country/Region: {country_str}",
                    coordinates=None,  # Country level
                    verification_status=VerificationStatus.CREDIBLE_REPORTED,
                    retrieved_at=datetime.now(timezone.utc),
                )
                alerts.append(alert_obj)

            cache.set("warnings", "reliefweb", alerts, settings.WARNINGS_CACHE_TTL_SECONDS)
            return alerts, SourceStatus(
                source_name=self.name,
                status="ok",
                latency_ms=round(elapsed_ms, 2),
                records_count=len(alerts),
                message=f"Retrieved {len(alerts)} situation reports from UN OCHA ReliefWeb",
                last_fetched_at=datetime.now(timezone.utc),
            )
        except Exception as e:
            logger.warning(f"Failed to fetch ReliefWeb: {e}")
            return [], SourceStatus(
                source_name=self.name,
                status="failed",
                records_count=0,
                message=str(e),
                last_fetched_at=datetime.now(timezone.utc),
            )


class LocalAuthoritativeAdapter(BaseWarningAdapter):
    """
    Adapter for authoritative local notices, forest department closures,
    and official regional disaster management announcements.
    Can be dynamically extended or populated from verified bulletins.
    """
    name: str = "Local Disaster Management & Park Authorities"

    def __init__(self):
        self._curated_notices: List[WarningAlert] = []

    def register_notice(self, notice: WarningAlert) -> None:
        self._curated_notices.append(notice)

    async def fetch_warnings(self) -> Tuple[List[WarningAlert], SourceStatus]:
        return list(self._curated_notices), SourceStatus(
            source_name=self.name,
            status="ok",
            latency_ms=0.1,
            records_count=len(self._curated_notices),
            message=f"{len(self._curated_notices)} verified local notices active",
            last_fetched_at=datetime.now(timezone.utc),
        )


class WarningAggregatorService:
    def __init__(self):
        self.gdacs_adapter = GDACSAdapter()
        self.usgs_adapter = USGSAdapter()
        self.reliefweb_adapter = ReliefWebAdapter()
        self.local_adapter = LocalAuthoritativeAdapter()

    async def fetch_all_warnings(self) -> Tuple[List[WarningAlert], List[SourceStatus]]:
        """
        Runs all adapters concurrently, returns combined list of deduplicated alerts
        and source status breakdowns.
        """
        adapters = [
            self.gdacs_adapter,
            self.usgs_adapter,
            self.reliefweb_adapter,
            self.local_adapter,
        ]

        tasks = [adapter.fetch_warnings() for adapter in adapters]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_alerts: List[WarningAlert] = []
        source_statuses: List[SourceStatus] = []
        seen_ids = set()

        for idx, res in enumerate(results):
            adapter_name = adapters[idx].name
            if isinstance(res, Exception):
                source_statuses.append(
                    SourceStatus(
                        source_name=adapter_name,
                        status="failed",
                        message=str(res),
                        last_fetched_at=datetime.now(timezone.utc),
                    )
                )
            else:
                alerts, status = res
                source_statuses.append(status)
                for alert in alerts:
                    if alert.id not in seen_ids:
                        seen_ids.add(alert.id)
                        all_alerts.append(alert)

        return all_alerts, source_statuses


warning_aggregator = WarningAggregatorService()
