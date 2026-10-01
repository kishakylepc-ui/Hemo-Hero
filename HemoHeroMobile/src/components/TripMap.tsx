import {
  createElement,
  useCallback,
  useEffect,
  useRef,
} from 'react';

import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  WebView,
  type WebViewMessageEvent,
} from 'react-native-webview';

// ============================================================
// TRIP MAP
//
// OpenStreetMap map (Leaflet + the standard OSM tiles; free, no
// API key) showing the facility pin, the donor's live dot, and
// the road route between them. Runs in a WebView on phones and
// an iframe on the web build.
//
// OSM's tile servers block map requests that carry no Referer,
// so the phone WebView gets a base URL (see TILE_REFERER) and the
// tile layer always sends the page origin.
//
// The page is loaded once; new positions are sent to it, so the
// map doesn't reload or jump while the donor moves. It keeps
// both points in view until the user pans the map; changing
// recenterSignal snaps back to following.
// ============================================================

// Page origin for the WebView. Never loaded; it only gives tile
// requests a Referer identifying the app.
const TILE_REFERER =
  'https://hemohero.local/';

export type TripMapData = {
  destination: {
    latitude: number;
    longitude: number;
  } | null;

  donor: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  } | null;

  // [latitude, longitude] points.
  route: [number, number][] | null;

  // Driving view: zoomed in and centered on the donor, instead
  // of keeping both points in view.
  followDonor?: boolean;
};

const MAP_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #EFEAE6; }
  .leaflet-control-attribution { font-size: 9px; }
  .offline { height: 100%; display: flex; align-items: center; justify-content: center;
    font: 500 13px -apple-system, Roboto, sans-serif; color: #666; text-align: center; padding: 24px; }
  .dest { width: 34px; height: 34px; border-radius: 17px 17px 17px 3px; transform: rotate(-45deg);
    background: #B42323; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3);
    display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
  .dest span { transform: rotate(45deg); color: #fff; font: 700 18px/1 sans-serif; }
  .donor { position: relative; width: 22px; height: 22px; }
  .donor .dot { position: absolute; left: 2px; top: 2px; width: 18px; height: 18px; box-sizing: border-box;
    border-radius: 50%; background: #2F6FDB; border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.35); }
  .donor .pulse { position: absolute; left: -9px; top: -9px; width: 40px; height: 40px; border-radius: 50%;
    background: rgba(47,111,219,.28); animation: pulse 1.8s ease-out infinite; }
  @keyframes pulse { 0% { transform: scale(.4); opacity: .9; } 100% { transform: scale(1.3); opacity: 0; } }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script>
(function () {
  function ready() {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage('ready');
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage('hemo-trip-map-ready', '*');
    }
  }

  if (!window.L) {
    document.body.innerHTML = '<div class="offline">Map unavailable. Check your internet connection.</div>';
    window.__update = function () {};
    ready();
    return;
  }

  var map = L.map('map', { zoomControl: false }).setView([14.5995, 120.9842], 13);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    referrerPolicy: 'strict-origin-when-cross-origin',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  var destMarker = null, donorMarker = null, accuracyCircle = null;
  var routeCasing = null, routeLine = null;
  var follow = true, fitted = false, navMode = false;

  // Stop following once the user moves the map themselves.
  map.on('dragstart', function () { follow = false; });
  map.getContainer().addEventListener('touchstart', function (e) {
    if (e.touches && e.touches.length > 1) { follow = false; }
  }, { passive: true });

  function divIcon(html, size, anchor) {
    return L.divIcon({ className: '', html: html, iconSize: size, iconAnchor: anchor });
  }

  // Glide the donor dot to its new position.
  function glide(marker, to) {
    var from = marker.getLatLng(), start = null, duration = 900;
    function step(time) {
      if (start === null) { start = time; }
      var t = Math.min(1, (time - start) / duration);
      marker.setLatLng([from.lat + (to[0] - from.lat) * t, from.lng + (to[1] - from.lng) * t]);
      if (t < 1) { requestAnimationFrame(step); }
    }
    requestAnimationFrame(step);
  }

  function fit(animate) {
    if (navMode && donorTarget) {
      map.setView(donorTarget, fitted ? map.getZoom() : 17, { animate: animate });
      return;
    }
    var points = [];
    if (destMarker) { points.push(destMarker.getLatLng()); }
    if (donorTarget) { points.push(L.latLng(donorTarget[0], donorTarget[1])); }
    if (!points.length) { return; }
    if (points.length === 1) { map.setView(points[0], 16, { animate: animate }); return; }
    map.fitBounds(L.latLngBounds(points), { padding: [56, 56], maxZoom: 17, animate: animate });
  }

  var donorTarget = null;

  window.__update = function (data) {
    if (!data) { return; }

    // Switching between driving view and overview starts fresh.
    if (!!data.followDonor !== navMode) {
      navMode = !!data.followDonor;
      follow = true;
      fitted = false;
    }

    if (data.destination) {
      var dest = [data.destination.latitude, data.destination.longitude];
      if (!destMarker) {
        destMarker = L.marker(dest, {
          icon: divIcon('<div class="dest"><span>+</span></div>', [34, 34], [17, 34]),
          zIndexOffset: 500
        }).addTo(map);
      } else {
        destMarker.setLatLng(dest);
      }
    }

    if (data.route && data.route.length > 1) {
      if (!routeLine) {
        routeCasing = L.polyline(data.route, { color: '#FFFFFF', weight: 9, opacity: 0.95 }).addTo(map);
        routeLine = L.polyline(data.route, { color: '#B42323', weight: 5, opacity: 0.9 }).addTo(map);
      } else {
        routeCasing.setLatLngs(data.route);
        routeLine.setLatLngs(data.route);
      }
    } else if (routeLine) {
      map.removeLayer(routeLine);
      map.removeLayer(routeCasing);
      routeLine = null;
      routeCasing = null;
    }

    if (data.donor) {
      donorTarget = [data.donor.latitude, data.donor.longitude];
      if (!donorMarker) {
        donorMarker = L.marker(donorTarget, {
          icon: divIcon('<div class="donor"><div class="pulse"></div><div class="dot"></div></div>', [22, 22], [11, 11]),
          zIndexOffset: 1000
        }).addTo(map);
      } else {
        glide(donorMarker, donorTarget);
      }

      var accuracy = Number(data.donor.accuracy) || 0;
      if (accuracy > 30 && accuracy < 1500) {
        if (!accuracyCircle) {
          accuracyCircle = L.circle(donorTarget, {
            radius: accuracy, color: '#2F6FDB', weight: 1, opacity: 0.3, fillOpacity: 0.08
          }).addTo(map);
        } else {
          accuracyCircle.setLatLng(donorTarget);
          accuracyCircle.setRadius(accuracy);
        }
      } else if (accuracyCircle) {
        map.removeLayer(accuracyCircle);
        accuracyCircle = null;
      }
    } else {
      donorTarget = null;
      if (donorMarker) { map.removeLayer(donorMarker); donorMarker = null; }
      if (accuracyCircle) { map.removeLayer(accuracyCircle); accuracyCircle = null; }
    }

    if (data.recenter) {
      follow = true;
      if (navMode) { fitted = false; }
    }
    if (follow || !fitted) { fit(fitted); fitted = true; }
  };

  function onMessage(event) {
    try { window.__update(JSON.parse(event.data)); } catch (error) {}
  }

  window.addEventListener('message', onMessage);
  document.addEventListener('message', onMessage);

  ready();
})();
</script>
</body>
</html>`;

export default function TripMap({
  data,
  recenterSignal = 0,
  style,
}: {
  data: TripMapData;
  // Change it to snap the map back to following the donor.
  recenterSignal?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const webViewRef =
    useRef<WebView>(null);

  const iframeRef =
    useRef<any>(null);

  const loaded =
    useRef(false);

  const lastRecenter =
    useRef(recenterSignal);

  const latest =
    useRef(data);

  latest.current = data;

  const send = useCallback(
    (recenter = false) => {
      if (!loaded.current) {
        return;
      }

      const payload =
        JSON.stringify({
          ...latest.current,
          recenter,
        });

      if (Platform.OS === 'web') {
        iframeRef.current
          ?.contentWindow
          ?.postMessage(payload, '*');

        return;
      }

      webViewRef.current?.injectJavaScript(
        `window.__update && window.__update(${payload}); true;`
      );
    },
    []
  );

  // New positions / route.
  useEffect(() => {
    send();
  }, [data, send]);

  // Recenter button.
  useEffect(() => {
    if (
      recenterSignal ===
      lastRecenter.current
    ) {
      return;
    }

    lastRecenter.current =
      recenterSignal;

    send(true);
  }, [recenterSignal, send]);

  // Web: the iframe says when Leaflet is ready.
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }

    function onWindowMessage(
      event: MessageEvent
    ) {
      if (
        event.data ===
          'hemo-trip-map-ready' &&
        event.source ===
          iframeRef.current
            ?.contentWindow
      ) {
        loaded.current = true;

        send();
      }
    }

    window.addEventListener(
      'message',
      onWindowMessage
    );

    return () =>
      window.removeEventListener(
        'message',
        onWindowMessage
      );
  }, [send]);

  function onNativeMessage(
    event: WebViewMessageEvent
  ) {
    if (
      event.nativeEvent.data ===
      'ready'
    ) {
      loaded.current = true;

      send();
    }
  }

  return (
    <View
      style={[
        styles.container,
        style,
      ]}
    >
      {Platform.OS === 'web' ? (
        createElement('iframe', {
          ref: iframeRef,
          srcDoc: MAP_HTML,
          title: 'Trip map',
          style: {
            width: '100%',
            height: '100%',
            border: 0,
            display: 'block',
          },
        })
      ) : (
        <WebView
          ref={webViewRef}
          source={{
            html: MAP_HTML,
            baseUrl:
              TILE_REFERER,
          }}
          originWhitelist={['*']}
          onMessage={
            onNativeMessage
          }
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setSupportMultipleWindows={
            false
          }
          style={
            styles.webView
          }
        />
      )}
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      overflow: 'hidden',
      backgroundColor: '#EFEAE6',
    },

    webView: {
      flex: 1,
      backgroundColor: '#EFEAE6',
    },
  });
