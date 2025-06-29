export interface IAvailableHours {
    date: Date;
    startHour: string;
    price: number;
    courtName: string;
    courtSports: string;
    dayOfWeekAbb: string;
}

export interface IWhereToPlayCourtList {
    logoUrl: string;
    name: string;
    phone: string;
    address: string;
    sports: string;
    instagramUrl: string;
    availableHours: IAvailableHours[]
}

export interface IDetailsCourt extends IWhereToPlayCourtList {
    characteristics: string[];
    photoHighlightUrl: string;
}