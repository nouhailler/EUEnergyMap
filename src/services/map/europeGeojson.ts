import europeJson from '../../data/europe.json';

/**
 * GeoJSON officiel des pays européens (51 entités dont les 27 pays de l'Union européenne).
 * Directement intégré pour garantir une disponibilité instantanée, sans dépendance réseau,
 * sans erreur 404 ni réponse HTML inattendue.
 */
export const EUROPE_GEOJSON: any = europeJson;

export default EUROPE_GEOJSON;
