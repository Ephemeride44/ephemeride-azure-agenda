export interface Theme {
  id: string;
  name: string;
  image_url: string | null;
  image_url_light: string | null;
}

export interface Event {
  id: string;
  datetime: string;
  endTime?: string; // Optional end time (if event has duration)
  name: string;
  location: {
    place: string;
    city: string;
    department: string;
  };
  price: string;
  audience: string;
  emoji?: string; // For optional emoji indicators like 📖
  url?: string; // URL for external links to event websites
  cover_url?: string | null; // URL de l'affiche (image de couverture)
  theme_id?: string | null;
  theme?: Theme | null;
  date?: string | null; // Nouvelle date réelle (YYYY-MM-DD), non obligatoire
  updated_at?: string | null; // Date de dernière mise à jour
  status?: string; // Statut de l'événement : pending, accepted, rejected
  createdby?: { name: string; email: string };
}
