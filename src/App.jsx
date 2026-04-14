import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import { campusLocations } from './data';

// --- ENHANCED INTERNAL CSS ---
const styleSheet = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');

  body, html, #root {
    margin: 0;
    padding: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    overflow: hidden;
  }

  .sidebar {
    width: 300px;
    height: 100%;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 5000; /* Extremely high to stay above map */
    background: white;
    display: flex;
    flex-direction: column;
    box-shadow: 2px 0 10px rgba(0,0,0,0.1);
  }

  @media (max-width: 768px) {
    .sidebar {
      position: absolute;
      left: 0;
      top: 0;
      transform: translateX(-100%);
      width: 80%;
    }
    .sidebar.open {
      transform: translateX(0);
    }
  }

  .leaflet-tooltip.custom-tooltip {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    text-shadow: 1px 1px 2px white;
    pointer-events: none !important;
  }

  /* Custom Scrollbar for a cleaner look */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
`;

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => { 
    if (lat && lng) {
      map.flyTo([lat, lng], 18, { animate: true, duration: 1.5 }); 
    }
  }, [lat, lng, map]);
  return null;
}

// Only clears building selection, leaves UI untouched
function MapClickHandler({ setSelectedLocation }) {
  useMapEvents({
    click: () => { setSelectedLocation(null); },
  });
  return null;
}

function RoutingMachine({ userPos, destination }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !userPos || !destination) return;
    const routingControl = L.Routing.control({
      waypoints: [L.latLng(userPos[0], userPos[1]), L.latLng(destination.lat, destination.lng)],
      lineOptions: { styles: [{ color: '#007bff', weight: 6, opacity: 0.8 }] },
      addWaypoints: false, draggableWaypoints: false, show: false, createMarker: () => null 
    }).addTo(map);
    return () => map.removeControl(routingControl);
  }, [map, userPos, destination]);
  return null;
}

function App() {
  const [locations] = useState(campusLocations);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const campusBounds = [[30.3950, 78.0700], [30.4050, 78.0850]];

  const findMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation([pos.coords.latitude, pos.coords.longitude]); },
      () => { alert("Please enable GPS permissions."); }
    );
  };

  const filteredLocations = locations.filter(loc => 
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
    (filterType === "All" || loc.type === filterType)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <style>{styleSheet}</style>
      
      {/* 1. HEADER - Fixed at top, outside map container to prevent clipping */}
      <header style={{ 
        background: '#007bff', color: 'white', padding: '12px 20px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        zIndex: 6000, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer', display: 'flex' }}
          >
            ☰
          </button>
          <h1 style={{ margin: 0, fontSize: '20px', letterSpacing: '-0.5px' }}>DIT Smart Nav</h1>
        </div>
        
        {/* Fixed clipping by ensuring minimum width and flex-shrink: 0 */}
        <button 
          onClick={findMyLocation} 
          style={{ 
            padding: '8px 16px', background: '#28a745', color: 'white', 
            border: 'none', borderRadius: '6px', fontSize: '13px', 
            fontWeight: '600', cursor: 'pointer', flexShrink: 0,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          📍 LOCATE ME
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        
        {/* 2. SIDEBAR */}
        <nav className={`sidebar ${menuOpen ? 'open' : ''}`} style={{ padding: '20px' }}>
          <input 
            type="text" placeholder="Search buildings..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              padding: '12px', marginBottom: '15px', borderRadius: '8px', 
              border: '1px solid #ddd', fontSize: '14px', outline: 'none'
            }}
          />
          <div style={{ marginBottom: '20px', display: 'flex', gap: '8px' }}>
            {["All", "Lab", "Amenity"].map(t => (
              <button 
                key={t} 
                onClick={() => setFilterType(t)} 
                style={{ 
                  flex: 1, padding: '8px', fontSize: '12px', borderRadius: '20px',
                  background: filterType === t ? '#007bff' : '#f0f0f0', 
                  color: filterType === t ? 'white' : '#555', 
                  border: 'none', cursor: 'pointer', fontWeight: '500'
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredLocations.map(loc => (
              <div 
                key={loc.id} 
                onClick={() => { setSelectedLocation(loc); setIsNavigating(false); setMenuOpen(false); }} 
                style={{ 
                  padding: '14px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', 
                  borderRadius: '8px', transition: '0.2s',
                  background: selectedLocation?.id === loc.id ? '#e7f3ff' : 'transparent' 
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#333' }}>{loc.name}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>{loc.type}</div>
              </div>
            ))}
          </div>
        </nav>

        {/* 3. MAP AREA */}
        <main style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          <MapContainer 
            center={[30.3977, 78.0747]} 
            zoom={17} 
            maxZoom={20}
            maxBounds={campusBounds}
            style={{ height: '100%', width: '100%' }}
            tap={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapClickHandler setSelectedLocation={setSelectedLocation} />
            
            {locations.map(loc => (
              <CircleMarker 
                key={loc.id} 
                center={[loc.lat, loc.lng]} 
                radius={14} 
                pathOptions={{ 
                  fillColor: selectedLocation?.id === loc.id ? '#ff4d4d' : '#007bff', 
                  color: 'white', weight: 3, fillOpacity: 0.9 
                }}
                eventHandlers={{ 
                  click: (e) => { 
                    L.DomEvent.stopPropagation(e); 
                    setSelectedLocation(loc); 
                    setIsNavigating(false);
                  }
                }}
              >
                <Tooltip permanent direction="top" offset={[0, -12]} className="custom-tooltip">
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#1a1a1a' }}>{loc.name}</span>
                </Tooltip>
              </CircleMarker>
            ))}

            {userLocation && (
              <CircleMarker center={userLocation} radius={10} pathOptions={{ fillColor: '#28a745', color: 'white', weight: 3 }}>
                <Tooltip direction="bottom" offset={[0, 10]}>You are here</Tooltip>
              </CircleMarker>
            )}

            {isNavigating && userLocation && selectedLocation && <RoutingMachine userPos={userLocation} destination={selectedLocation} />}
            {selectedLocation && <RecenterMap lat={selectedLocation.lat} lng={selectedLocation.lng} />}
          </MapContainer>

          {/* 4. FLOATING INFO CARD */}
          {selectedLocation && (
            <div style={{ 
              position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', 
              zIndex: 4000, background: 'white', padding: '24px', borderRadius: '20px', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)', width: '85%', maxWidth: '350px',
              border: '1px solid #e0e0e0'
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#007bff', fontSize: '20px' }}>{selectedLocation.name}</h3>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px', lineHeight: '1.5' }}>{selectedLocation.info}</p>
              <button 
                onClick={() => { if(!userLocation) return alert("Please click 'LOCATE ME' first!"); setIsNavigating(true); }} 
                style={{ 
                  width: '100%', padding: '14px', background: isNavigating ? '#28a745' : '#007bff', 
                  color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', 
                  cursor: 'pointer', fontSize: '14px', transition: '0.3s'
                }}
              >
                {isNavigating ? "ROUTE ACTIVE" : "START NAVIGATION"}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;