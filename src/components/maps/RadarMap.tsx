import { useEffect, useMemo, useState } from "react";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection, Feature, Geometry } from "geojson";
import type {
  RadarPoint,
  RadarState,
  RadarMetric,
  RadarView,
} from "../../types/radar";
import {
  heatWeight,
  radarBucket,
  radarPalette,
  radarValue,
  validRadarPoint,
  ufCodes,
} from "../../utils/radar";
import { stateName } from "../../utils/geography";
import { displayValue, number } from "../../utils/data";
import "leaflet/dist/leaflet.css";

export function useRadarGeometry() {
  return useQuery({
    queryKey: ["radar", "ibge-geometry"],
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `${import.meta.env.BASE_URL}geo/br-states.geojson`,
        { signal },
      );
      if (!response.ok)
        throw new Error(
          "Não foi possível carregar os limites estaduais do IBGE.",
        );
      const collection = (await response.json()) as FeatureCollection;
      if (
        collection.type !== "FeatureCollection" ||
        !Array.isArray(collection.features) ||
        collection.features.length !== 27
      )
        throw new Error("Malha estadual inválida.");
      collection.features.forEach((feature) => {
        const uf = ufCodes[String(feature.properties?.codarea)];
        if (!uf) throw new Error("UF não identificada na malha.");
        feature.properties = { ...feature.properties, uf };
      });
      return collection;
    },
  });
}
function Viewport({
  geometry,
  uf,
  resetKey,
}: {
  geometry?: FeatureCollection;
  uf: string;
  resetKey: number;
}) {
  const map = useMap();
  useEffect(() => {
    const fit = () => {
      const feature = geometry?.features.find(
        (item) => item.properties?.uf === uf,
      );
      if (feature)
        map.fitBounds(L.geoJSON(feature).getBounds(), {
          padding: [28, 28],
          maxZoom: 8,
          animate: false,
        });
      else
        map.fitBounds(
          [
            [-34, -74],
            [6, -34],
          ],
          { padding: [20, 20], animate: false },
        );
    };
    fit();
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: true, animate: false });
      fit();
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, geometry, uf, resetKey]);
  return null;
}
function HeatLayer({
  points,
  metric,
}: {
  points: RadarPoint[];
  metric: RadarMetric;
}) {
  const map = useMap();
  useEffect(() => {
    const canvas = L.DomUtil.create("canvas", "radar-heat-layer");
    canvas.style.pointerEvents = "none";
    map.getPanes().overlayPane.appendChild(canvas);
    const offscreen = document.createElement("canvas");
    let frame = 0;
    const draw = () => {
      frame = 0;
      const size = map.getSize();
      canvas.width = offscreen.width = Math.max(1, Math.round(size.x));
      canvas.height = offscreen.height = Math.max(1, Math.round(size.y));
      L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
      const context = canvas.getContext("2d"),
        alpha = offscreen.getContext("2d", { willReadFrequently: true });
      if (!context || !alpha) return;
      const cells = new Map<string, { x: number; y: number; weight: number }>();
      points.forEach((point) => {
        const weight = heatWeight(point, metric);
        if (weight === null || weight <= 0 || !validRadarPoint(point)) return;
        const pixel = map.latLngToContainerPoint([
          point.latitude!,
          point.longitude!,
        ]);
        if (
          pixel.x < -40 ||
          pixel.y < -40 ||
          pixel.x > size.x + 40 ||
          pixel.y > size.y + 40
        )
          return;
        const key = `${Math.floor(pixel.x / 14)}:${Math.floor(pixel.y / 14)}`;
        const cell = cells.get(key);
        if (cell) {
          const total = cell.weight + weight;
          cell.x = (cell.x * cell.weight + pixel.x * weight) / total;
          cell.y = (cell.y * cell.weight + pixel.y * weight) / total;
          cell.weight = total;
        } else cells.set(key, { x: pixel.x, y: pixel.y, weight });
      });
      const max = Math.max(
        1,
        ...[...cells.values()].map((cell) => cell.weight),
      );
      cells.forEach((cell) => {
        const gradient = alpha.createRadialGradient(
          cell.x,
          cell.y,
          0,
          cell.x,
          cell.y,
          38,
        );
        gradient.addColorStop(
          0,
          `rgba(0,0,0,${Math.max(0.12, (cell.weight / max) * 0.85)})`,
        );
        gradient.addColorStop(
          0.4,
          `rgba(0,0,0,${Math.max(0.08, (cell.weight / max) * 0.5)})`,
        );
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        alpha.fillStyle = gradient;
        alpha.fillRect(cell.x - 38, cell.y - 38, 76, 76);
      });
      const pixels = alpha.getImageData(0, 0, canvas.width, canvas.height);
      const stops = [
        [37, 99, 235],
        [6, 182, 212],
        [52, 211, 153],
        [250, 204, 21],
        [239, 68, 68],
      ];
      for (let i = 0; i < pixels.data.length; i += 4) {
        const opacity = pixels.data[i + 3];
        if (!opacity) continue;
        const level = Math.min(3.999, (opacity / 255) * 4);
        const index = Math.floor(level),
          fraction = level - index;
        for (let c = 0; c < 3; c++)
          pixels.data[i + c] = Math.round(
            stops[index][c] * (1 - fraction) + stops[index + 1][c] * fraction,
          );
        pixels.data[i + 3] = Math.min(210, opacity * 1.6);
      }
      context.putImageData(pixels, 0, 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    map.on("moveend zoomend resize", schedule);
    schedule();
    return () => {
      map.off("moveend zoomend resize", schedule);
      cancelAnimationFrame(frame);
      canvas.remove();
    };
  }, [map, points, metric]);
  return null;
}
function RadarMarkers({
  points,
  onOpen,
}: {
  points: RadarPoint[];
  onOpen: (id: number) => void;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const groups = useMemo(() => {
    const cells = new Map<string, RadarPoint[]>();
    const size = 50 / 2 ** zoom;
    points.filter(validRadarPoint).forEach((point) => {
      const key = `${Math.floor(point.latitude! / size)}:${Math.floor(point.longitude! / size)}`;
      cells.set(key, [...(cells.get(key) ?? []), point]);
    });
    return [...cells.values()];
  }, [points, zoom]);
  return (
    <>
      {groups.map((group) => {
        if (group.length > 1 && zoom < 16) {
          const latitude =
              group.reduce((sum, p) => sum + p.latitude!, 0) / group.length,
            longitude =
              group.reduce((sum, p) => sum + p.longitude!, 0) / group.length;
          return (
            <Marker
              key={`cluster-${group[0].id}`}
              position={[latitude, longitude]}
              icon={L.divIcon({
                className: "custom-map-marker",
                html: `<div class="cluster-pin">${group.length}</div>`,
                iconSize: [36, 36],
              })}
              eventHandlers={{
                click: () =>
                  map.setView([latitude, longitude], Math.min(16, zoom + 3)),
              }}
            />
          );
        }
        return group.map((point) => (
          <Marker
            key={point.id}
            autoPanOnFocus={false}
            position={[point.latitude!, point.longitude!]}
            icon={L.divIcon({
              className: "custom-map-marker",
              html: '<div class="map-pin"><span></span></div>',
              iconSize: [36, 48],
              iconAnchor: [18, 43],
            })}
          >
            <Popup autoPan={false}>
              <div className="radar-marker-popup">
                <strong>{displayValue(point.unidade)}</strong>
                <p>{displayValue(point.operador)}</p>
                <p>
                  {displayValue(point.municipio)} / {point.uf}
                </p>
                <p>{displayValue(point.tipoInstalacao)}</p>
                <dl>
                  <dt>Redes registradas</dt>
                  <dd>{number(point.redesConectadas)}</dd>
                  <dt>IX registrados</dt>
                  <dd>{number(point.ixConectados)}</dd>
                  <dt>Carriers registrados</dt>
                  <dd>{number(point.carriers)}</dd>
                  <dt>Precisão geográfica</dt>
                  <dd>{displayValue(point.precisaoGeo)}</dd>
                </dl>
                <button onClick={() => onOpen(point.id)}>
                  Ver detalhes da instalação
                </button>
              </div>
            </Popup>
          </Marker>
        ));
      })}
    </>
  );
}
export function RadarMap({
  states,
  points,
  metric,
  view,
  uf,
  resetKey,
  onState,
  onOpen,
  statesAvailable,
}: {
  states: RadarState[];
  points: RadarPoint[];
  metric: RadarMetric;
  view: RadarView;
  uf: string;
  resetKey: number;
  onState: (uf: string) => void;
  onOpen: (id: number) => void;
  statesAvailable: boolean;
}) {
  const geometry = useRadarGeometry();
  const [tileError, setTileError] = useState(false);
  const values = states
    .map((row) => radarValue(row, metric))
    .filter((value): value is number => value !== null);
  const max = Math.max(0, ...values);
  const byUf = new Map(states.map((row) => [row.uf, row]));
  function style(feature?: Feature<Geometry>) {
    const code = String(feature?.properties?.uf);
    const row = byUf.get(code);
    const value = row ? radarValue(row, metric) : null;
    return {
      fillColor:
        view === "states" && value !== null
          ? radarPalette[radarBucket(value, max)]
          : "#94a3b8",
      fillOpacity: view === "states" ? (value === null ? 0.1 : 0.7) : 0.015,
      color: code === uf ? "#047857" : "#64748b",
      weight: code === uf ? 3 : 1,
      opacity: 0.8,
    };
  }
  return (
    <div className="radar-map-canvas">
      <MapContainer
        className="leaflet-map"
        center={[-14, -52]}
        zoom={4}
        minZoom={2}
        maxZoom={19}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Limites: <a href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3">IBGE</a>'
          eventHandlers={{ tileerror: () => setTileError(true) }}
        />
        <Viewport geometry={geometry.data} uf={uf} resetKey={resetKey} />
        {geometry.data && (
          <GeoJSON
            key={`${metric}:${view}:${uf}:${JSON.stringify(states)}`}
            data={geometry.data}
            style={style}
            onEachFeature={(feature, layer) => {
              const code = String(feature.properties?.uf),
                row = byUf.get(code),
                value = row ? radarValue(row, metric) : null;
              // Use text nodes: backend labels never become executable tooltip HTML.
              const text = document.createElement("span");
              text.textContent = `${stateName(code)} · ${!statesAvailable ? "Dados indisponíveis" : !row ? "Sem registros neste recorte" : value === null ? "Não informado" : number(value)}${row && metric === "installations" ? ` instalações · ${number(row.participacaoNacional)}% da base nacional` : ""}`;
              layer.bindTooltip(text);
              layer.on({
                click: () => onState(code),
                mouseover: () => {
                  if (layer instanceof L.Path) layer.setStyle({ weight: 3 });
                },
                mouseout: () => {
                  if (layer instanceof L.Path) layer.setStyle(style(feature));
                },
              });
            }}
          />
        )}
        {view === "heat" && <HeatLayer points={points} metric={metric} />}
        {view === "markers" && <RadarMarkers points={points} onOpen={onOpen} />}
      </MapContainer>
      {geometry.isPending && (
        <div className="radar-map-message" role="status">
          Carregando limites estaduais…
        </div>
      )}
      {geometry.isError && (
        <div className="radar-map-message" role="alert">
          {geometry.error.message}
          <button onClick={() => geometry.refetch()}>Tentar novamente</button>
        </div>
      )}
      {tileError && (
        <p className="radar-tile-note">
          Mapa-base indisponível. Limites e análises continuam acessíveis.
        </p>
      )}
    </div>
  );
}
