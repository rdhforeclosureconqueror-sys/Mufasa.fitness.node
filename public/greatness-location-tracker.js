"use strict";

export class BrowserLocationTracker {
  constructor(geolocation = navigator.geolocation) { this.geolocation = geolocation; this.watchId = null; }
  requestPermission() {
    if (!this.geolocation) return Promise.reject(new Error("Location is unavailable on this device."));
    return new Promise((resolve, reject) => this.geolocation.getCurrentPosition(resolve, (error) => reject(new Error(error.code === 1 ? "Location access was denied. GPS is required to record route and distance." : "We could not get a GPS signal.")), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }));
  }
  start(onSample, onError = () => {}) {
    if (this.watchId !== null) return;
    this.watchId = this.geolocation.watchPosition(({ coords, timestamp }) => onSample({ latitude: coords.latitude, longitude: coords.longitude, capturedAtMs: timestamp, accuracyMeters: coords.accuracy, altitudeMeters: coords.altitude, altitudeAccuracyMeters: coords.altitudeAccuracy, headingDegrees: coords.heading, reportedSpeedMetersPerSecond: coords.speed }), onError, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  }
  stop() { if (this.watchId !== null) this.geolocation.clearWatch(this.watchId); this.watchId = null; }
}

export const browserTrackingLimitations = "Tracking may pause if you close this page, suspend the browser, or your phone limits background activity.";
