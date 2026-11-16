import { useEffect, useRef } from "react";
import { LngLatBounds, Map as MLMap, NavigationControl, Popup, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import { useTheme } from "@hope/ui/lib/theme";
import { cn } from "@hope/ui/lib/utils";
import type { Level, MapData, ShelterRow } from "../api";
import { LEVEL_STYLE } from "./status";

// MapLibre parses tiles in an ES-module worker, served untouched at /maplibre/ (see vite.config.ts).
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

interface Props {
  data: MapData;
  shelters: ShelterRow[];
  zones: Map<number, Level>;
  onAreaClick?: (areaId: number) => void;
  showHouseholds?: boolean;
  className?: string;
}

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function areasGeoJSON(data: MapData, zones: Map<number, Level>): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: data.areas
      .filter((a) => a.level === "gram_panchayat")
      .map((a) => ({
        type: "Feature",
        id: a.id,
        geometry: a.geometry,
        properties: { id: a.id, name: a.name.en, households: a.households, color: zones.has(a.id) ? LEVEL_STYLE[zones.get(a.id)!].fill : "#7a7a7a", zoned: zones.has(a.id) ? 1 : 0 },
      })),
  };
}

function sheltersGeoJSON(shelters: ShelterRow[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: shelters.map((s) => {
      const used = (s.reserved + s.occupied) / s.capacity;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.lng, s.lat] },
        properties: {
          code: s.code,
          label: `${s.code}  ${s.reserved + s.occupied}/${s.capacity}`,
          color: s.status === "closed" || s.status === "unsafe" ? "#7a7a7a" : used >= 1 ? "#d63a2f" : used >= 0.75 ? "#e3a21a" : "#0f7a5a",
          radius: 6 + Math.sqrt(s.capacity) / 3,
        },
      };
    }),
  };
}

export function IncidentMap({ data, shelters, zones, onAreaClick, showHouseholds = true, className }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const ready = useRef(false);
  const pending = useRef<(() => void) | null>(null);
  const clickRef = useRef(onAreaClick);
  clickRef.current = onAreaClick;
  const { resolved } = useTheme();
  const themeRef = useRef(resolved);
  themeRef.current = resolved;

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    const block = data.areas.find((a) => a.level === "block");
    const m = new MLMap({
      container: container.current,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            maxzoom: 19,
            attribution: "© OpenStreetMap contributors",
          },
        },
        // If tiles can't load (offline demo), the plain background still shows the areas clearly.
        layers: [
          { id: "bg", type: "background", paint: { "background-color": "#eef1f1" } },
          { id: "osm", type: "raster", source: "osm", paint: { "raster-opacity": 0.85, "raster-saturation": -0.6 } },
        ],
      },
      center: [88.23, 21.72],
      zoom: 10.6,
      cooperativeGestures: false,
    });
    m.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.current = m;
    if (import.meta.env.DEV) (window as unknown as { __hopeMap?: MLMap }).__hopeMap = m;

    m.on("load", () => {
      m.addSource("areas", { type: "geojson", data: EMPTY });
      m.addSource("households", { type: "geojson", data: EMPTY });
      m.addSource("shelters", { type: "geojson", data: EMPTY });

      m.addLayer({ id: "areas-fill", type: "fill", source: "areas", paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": ["case", ["==", ["get", "zoned"], 1], ["case", ["boolean", ["feature-state", "hover"], false], 0.42, 0.3], ["case", ["boolean", ["feature-state", "hover"], false], 0.14, 0.06]],
      } });
      m.addLayer({ id: "areas-line", type: "line", source: "areas", paint: { "line-color": ["get", "color"], "line-width": 1.4, "line-opacity": 0.9 } });
      m.addLayer({ id: "households", type: "circle", source: "households", paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 1.2, 13, 3],
        "circle-color": ["case", ["==", ["get", "v"], 1], "#8a3ffc", "#3a3a3a"],
        "circle-opacity": 0.55,
      } });
      m.addLayer({ id: "shelters", type: "circle", source: "shelters", paint: {
        "circle-radius": ["get", "radius"],
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      } });

      if (block) {
        const bounds = new LngLatBounds();
        for (const poly of block.geometry.coordinates) for (const ring of poly) for (const c of ring) bounds.extend(c as [number, number]);
        m.fitBounds(bounds, { padding: 24, duration: 0 });
      }

      let hovered: number | null = null;
      m.on("mousemove", "areas-fill", (e: MapLayerMouseEvent) => {
        const id = e.features?.[0]?.id as number | undefined;
        if (hovered !== null) m.setFeatureState({ source: "areas", id: hovered }, { hover: false });
        if (id !== undefined) {
          hovered = id;
          m.setFeatureState({ source: "areas", id }, { hover: true });
        }
        m.getCanvas().style.cursor = clickRef.current ? "pointer" : "";
      });
      m.on("mouseleave", "areas-fill", () => {
        if (hovered !== null) m.setFeatureState({ source: "areas", id: hovered }, { hover: false });
        hovered = null;
        m.getCanvas().style.cursor = "";
      });
      m.on("click", "areas-fill", (e: MapLayerMouseEvent) => {
        const id = e.features?.[0]?.properties?.id as number | undefined;
        if (id !== undefined) clickRef.current?.(id);
      });

      const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 10 });
      m.on("mouseenter", "shelters", (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        popup.setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setText(String(f.properties?.label)).addTo(m);
      });
      m.on("mouseleave", "shelters", () => popup.remove());

      ready.current = true;
      applyTheme(m, themeRef.current);
      pending.current?.();
      pending.current = null;
    });

    const ro = new ResizeObserver(() => m.resize());
    ro.observe(container.current);
    return () => {
      ro.disconnect();
      ready.current = false;
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push data whenever it changes.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const push = () => {
      (m.getSource("areas") as GeoJSONSource | undefined)?.setData(areasGeoJSON(data, zones));
      (m.getSource("shelters") as GeoJSONSource | undefined)?.setData(sheltersGeoJSON(shelters));
      (m.getSource("households") as GeoJSONSource | undefined)?.setData(showHouseholds ? {
        type: "FeatureCollection",
        features: data.households.map(([lng, lat, v]) => ({ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: { v } })),
      } : EMPTY);
    };
    if (ready.current) push();
    else pending.current = push;
  }, [data, shelters, zones, showHouseholds]);

  // Dim tiles in dark mode.
  useEffect(() => {
    const m = map.current;
    if (m && ready.current) applyTheme(m, resolved);
  }, [resolved]);

  return <div ref={container} className={cn("h-full min-h-[320px] w-full overflow-hidden rounded-xl border", className)} />;
}

function applyTheme(m: MLMap, theme: "light" | "dark") {
  m.setPaintProperty("osm", "raster-brightness-max", theme === "dark" ? 0.6 : 1);
  m.setPaintProperty("bg", "background-color", theme === "dark" ? "#1d2121" : "#eef1f1");
}

export function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(["evacuate", "warning", "watch"] as const).map((l) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: LEVEL_STYLE[l].fill }} /> {LEVEL_STYLE[l].label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#0f7a5a]" /> Shelter with space</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#d63a2f]" /> Shelter full</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#8a3ffc]/60" /> Vulnerable household</span>
    </div>
  );
}
