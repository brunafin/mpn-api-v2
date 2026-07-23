export interface IAvailableHours {
  date: Date;
  startHour: string;
  price: number;
  courtName: string;
  courtSports: { label: string; value: string }[];
  dayOfWeekAbb: string;
}

export interface IWhereToPlayCourtList {
  logoUrl: string;
  name: string;
  phone: string;
  city?: string;
  uf?: string;
  address: string;
  /** Slug público da arena (URL /encontre-onde-jogar/{slug}). */
  slug: string;
  instagramUrl: string;
  courts: {
    courtName: string;
    courtSports: { label: string; value: string }[];
    schedules: IAvailableHours[];
  }[];
}

export interface ICourt {
  courtName: string;
  courtSports: { label: string; value: string }[];
  schedules: IAvailableHours[];
}

export interface IDetailsCourt extends IWhereToPlayCourtList {
  characteristics: string[];
  photoHighlightUrl: string;
  /** Até 3 fotos do espaço (galeria pública). */
  photoUrls: string[];
}
