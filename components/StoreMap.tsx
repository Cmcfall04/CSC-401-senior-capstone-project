"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

export interface StoreForMap {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

const DEFAULT_CENTER: LatLng = { lat: 40.7488, lng: -73.9857 };
const DEFAULT_ZOOM = 12;

export interface StoreMapProps {
  /** Where the map is centered (e.g. user location or search result) */
  center: LatLng;
  /** If set, show "You are here" marker at this position */
  userLocation: LatLng | null;
  /** Nearby stores to show as markers */
  stores?: StoreForMap[];
  className?: string;
}

export default function StoreMap({ center, userLocation, stores = [], className = "" }: StoreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{
    map: import("leaflet").Map;
    userMarker: import("leaflet").Marker | null;
    storeMarkers: import("leaflet").Marker[];
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const L = require("leaflet");

    const userIcon = L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const storeIcon = L.divIcon({
      className: "store-marker",
      html: '<span class="store-marker-dot"></span>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const view = center ?? DEFAULT_CENTER;
    const map = L.map(containerRef.current).setView([view.lat, view.lng], DEFAULT_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    let userMarker: L.Marker | null = null;
    if (userLocation) {
      userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup("You are here");
    }

    const storeMarkers: L.Marker[] = [];
    stores.forEach((s) => {
      const m = L.marker([s.lat, s.lng], { icon: storeIcon })
        .addTo(map)
        .bindPopup(`<strong>${escapeHtml(s.name)}</strong>`);
      storeMarkers.push(m);
    });

    mapRef.current = { map, userMarker, storeMarkers };

    return () => {
      storeMarkers.forEach((m) => map.removeLayer(m));
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ref = mapRef.current;
    if (!ref?.map) return;

    const L = require("leaflet");
    const view = center ?? DEFAULT_CENTER;
    ref.map.setView([view.lat, view.lng], view === DEFAULT_CENTER ? DEFAULT_ZOOM : 14);

    if (userLocation) {
      const userIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      if (ref.userMarker) ref.userMarker.setLatLng([userLocation.lat, userLocation.lng]);
      else {
        ref.userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(ref.map)
          .bindPopup("You are here");
      }
    } else {
      if (ref.userMarker) {
        ref.map.removeLayer(ref.userMarker);
        ref.userMarker = null;
      }
    }
  }, [center, userLocation]);

  useEffect(() => {
    const ref = mapRef.current;
    if (!ref?.map) return;

    const L = require("leaflet");
    ref.storeMarkers.forEach((m) => ref.map.removeLayer(m));
    ref.storeMarkers.length = 0;

    const storeIcon = L.divIcon({
      className: "store-marker",
      html: '<span class="store-marker-dot"></span>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    stores.forEach((s) => {
      const m = L.marker([s.lat, s.lng], { icon: storeIcon })
        .addTo(ref.map)
        .bindPopup(`<strong>${escapeHtml(s.name)}</strong>`);
      ref.storeMarkers.push(m);
    });
  }, [stores]);

  return (
    <div ref={containerRef} className={className} style={{ minHeight: 384 }} />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
