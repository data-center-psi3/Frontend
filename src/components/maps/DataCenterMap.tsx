import { displayValue } from "../../utils/data";
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapPoint } from "../../types/api";
export const validPoint = (p: MapPoint) =>
  p.latitude != null &&
  p.longitude != null &&
  Number.isFinite(p.latitude) &&
  Number.isFinite(p.longitude) &&
  Math.abs(p.latitude) <= 90 &&
  Math.abs(p.longitude) <= 180;
function FitPoints({
  points,
  overviewKey,
}: {
  points: MapPoint[];
  overviewKey: number;
}) {
  const map = useMap();
  // Selecting an installation can recreate the array without changing geography.
  // Only reset the overview when the actual coordinates/selection of points change.
  const geometry = JSON.stringify(
    points
      .map((p) => [p.id, p.latitude, p.longitude])
      .sort((a, b) => Number(a[0]) - Number(b[0])),
  );
  useEffect(() => {
    const coordinates: [number, number][] = JSON.parse(geometry).map(
      (p: [number, number, number]) => [p[1], p[2]],
    );
    function fitOverview() {
      if (coordinates.length)
        map.fitBounds(L.latLngBounds(coordinates), {
          padding: [55, 55],
          maxZoom: 9,
        });
      else map.setView([-14.2, -51.9], 4);
    }
    fitOverview();
    const observer = new ResizeObserver(() => {
      // Opening details can resize the canvas. Keep its geographic center and
      // zoom instead of fitting the entire dataset again.
      map.invalidateSize({ pan: true, animate: false });
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, geometry, overviewKey]);
  return null;
}
function Markers({
  points,
  selected,
  onSelect,
}: {
  points: MapPoint[];
  selected?: number;
  onSelect: (id: number) => void;
}) {
  const map = useMap();
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const [zoom, setZoom] = useState(map.getZoom());
  const clusters = useMemo(() => {
    const cells = new Map<string, MapPoint[]>();
    const size = 50 / Math.pow(2, zoom);
    points.forEach((p) => {
      const key = `${Math.floor(p.latitude! / size)},${Math.floor(p.longitude! / size)}`;
      cells.set(key, [...(cells.get(key) ?? []), p]);
    });
    return [...cells.values()];
  }, [points, zoom]);
  return (
    <>
      {clusters.map((cluster) => {
        const p = cluster[0];
        const lat =
          cluster.reduce((a, c) => a + c.latitude!, 0) / cluster.length;
        const lng =
          cluster.reduce((a, c) => a + c.longitude!, 0) / cluster.length;
        const isCluster = cluster.length > 1 && zoom < 16;
        const icon = L.divIcon({
          className: "custom-map-marker",
          html: isCluster
            ? `<div class="cluster-pin">${cluster.length}</div>`
            : `<div class="map-pin ${selected === p.id ? "selected" : ""}"><span></span></div>`,
          iconSize: [36, 48],
          iconAnchor: [18, 43],
        });
        return isCluster ? (
          <Marker
            key={`cluster-${p.id}`}
            position={[lat, lng]}
            icon={icon}
            eventHandlers={{
              click: () => {
                const currentZoom = map.getZoom();
                const nextZoom = Math.min(
                  16,
                  map.getMaxZoom(),
                  currentZoom + 3,
                );
                if (nextZoom > currentZoom) map.setView([lat, lng], nextZoom);
              },
            }}
          >
            <Tooltip>
              {cluster.length} instalações — clique para ampliar
            </Tooltip>
          </Marker>
        ) : (
          cluster.map((c) => (
            <Marker
              key={c.id}
              autoPanOnFocus={false}
              position={[c.latitude!, c.longitude!]}
              icon={
                cluster.length === 1
                  ? icon
                  : L.divIcon({
                      className: "custom-map-marker",
                      html: '<div class="map-pin"><span></span></div>',
                      iconSize: [36, 48],
                      iconAnchor: [18, 43],
                    })
              }
              eventHandlers={{
                click: () => {
                  onSelect(c.id);
                },
              }}
            >
              <Tooltip>
                {displayValue(c.nome)} · {displayValue(c.cidade)}/
                {displayValue(c.estado)}
              </Tooltip>
            </Marker>
          ))
        );
      })}
    </>
  );
}
export function DataCenterMap({
  points,
  selected,
  onSelect,
  compact = false,
  overviewKey = 0,
}: {
  points: MapPoint[];
  selected?: number;
  onSelect: (id: number) => void;
  compact?: boolean;
  overviewKey?: number;
}) {
  const valid = useMemo(() => points.filter(validPoint), [points]);
  const [tileError, setTileError] = useState(false);
  return (
    <div className={`map-canvas ${compact ? "map-compact" : ""}`}>
      <MapContainer
        center={[-14.2, -51.9]}
        zoom={4}
        minZoom={2}
        maxZoom={19}
        scrollWheelZoom={!compact}
        className="leaflet-map"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          eventHandlers={{ tileerror: () => setTileError(true) }}
        />
        <FitPoints points={valid} overviewKey={overviewKey} />
        <Markers points={valid} selected={selected} onSelect={onSelect} />
      </MapContainer>
      <div className="map-key">
        <i />
        {valid.length} instalações com coordenadas
      </div>
      {tileError && (
        <div className="map-tile-warning" role="status">
          O mapa-base está indisponível. As instalações continuam acessíveis na
          lista.
        </div>
      )}
      {!valid.length && (
        <div className="map-empty">
          Nenhuma instalação com coordenadas nos filtros selecionados.
        </div>
      )}
    </div>
  );
}
