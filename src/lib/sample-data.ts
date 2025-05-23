
import { Event } from './types';
import { v4 as uuidv4 } from 'uuid';

export const sampleEvents: Event[] = [
  {
    id: uuidv4(),
    datetime: "lundi 19 mai 2025 à 18h30",
    name: "Atelier couture zéro déchet",
    location: {
      place: "La Filature",
      city: "GORGES",
      department: "44"
    },
    price: "Gratuit",
    audience: "Pour les adultes",
  },
  {
    id: uuidv4(),
    datetime: "mardi 20 mai 2025 à 20h00",
    name: "Projection-débat « Goliath »",
    location: {
      place: "Cinéma le Connétable",
      city: "CLISSON",
      department: "44"
    },
    price: "5€",
    audience: "Public adulte et adolescent",
  },
  {
    id: uuidv4(),
    datetime: "vendredi 23 mai 2025 à 18h30",
    name: "Portes ouvertes des Jardins de Mèbre",
    location: {
      place: "Les Jardins de Mèbre",
      city: "MONNIÈRES",
      department: "44"
    },
    price: "Entrée libre",
    audience: "Tout public",
  },
  {
    id: uuidv4(),
    datetime: "vendredi 23 mai 2025 à 19h30",
    name: "Lectures partagées autour de la nature et des jardins",
    location: {
      place: "Médiathèque Geneviève Couteau",
      city: "CLISSON",
      department: "44"
    },
    price: "Gratuit",
    audience: "À partir de 7 ans",
  },
  {
    id: uuidv4(),
    datetime: "samedi 24 mai 2025 à 09h30",
    name: "Chantier participatif",
    location: {
      place: "Les Jardins du Cœur",
      city: "CHÂTEAU-THÉBAUD",
      department: "44"
    },
    price: "Gratuit",
    audience: "Réservé aux adultes",
  },
  {
    id: uuidv4(),
    datetime: "samedi 24 mai 2025 à 14h00",
    name: "Atelier bombes à graines",
    location: {
      place: "Place du Minage",
      city: "CLISSON",
      department: "44"
    },
    price: "Gratuit",
    audience: "Familial - à partir de 5 ans",
  },
  {
    id: uuidv4(),
    datetime: "samedi 31 mai 2025 à 10h00",
    name: "Exposition « Alternatives au nucléaire »",
    location: {
      place: "Espace Sèvre",
      city: "GÉTIGNÉ",
      department: "44"
    },
    price: "Entrée libre",
    audience: "Public adulte",
  },
  {
    id: uuidv4(),
    datetime: "samedi 7 juin 2025 à 10h00",
    endTime: "16h00",
    name: "FESTIVAL DE LA TRANSITION",
    location: {
      place: "Parc Henri IV",
      city: "CLISSON",
      department: "44"
    },
    price: "Entrée libre et gratuite",
    audience: "Tout public",
    emoji: "🌱"
  },
  {
    id: uuidv4(),
    datetime: "jeudi 22 mai 2025 à 20h00",
    name: "Club Ciné : « Grease »",
    location: {
      place: "Cinéma Le connétable (salle 1)",
      city: "CLISSON",
      department: "44"
    },
    price: "6€",
    audience: "Tout public",
  }
];
