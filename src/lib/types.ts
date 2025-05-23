
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
}
