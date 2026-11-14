import { propertyPlaceId, propertyCoordinates } from '../framework/environment.js';

export interface MapLinks {
  googleMapsUrl: string | undefined;
  wazeUrl: string | undefined;
}

// Key-free deep links into the two navigation apps. Google Maps takes the address plus an optional
// place id (the address stays required — it is the fallback when the id does not resolve), while
// Waze has no consumer place-id parameter and needs coordinates for an exact destination. A missing
// address leaves both links undefined so the card renders without dead buttons.
export const buildMapLinks = (address: string | undefined): MapLinks => {
  const destination = address?.trim();

  if (!destination) {
    return { googleMapsUrl: undefined, wazeUrl: undefined };
  }

  const encodedAddress = encodeURIComponent(destination);
  const placeId = propertyPlaceId ? `&destination_place_id=${encodeURIComponent(propertyPlaceId)}` : '';
  const coordinates = propertyCoordinates?.trim();

  return {
    googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}${placeId}&dir_action=navigate`,
    wazeUrl: coordinates
      ? `https://waze.com/ul?ll=${encodeURIComponent(coordinates)}&navigate=yes`
      : `https://waze.com/ul?q=${encodedAddress}&navigate=yes`,
  };
};
